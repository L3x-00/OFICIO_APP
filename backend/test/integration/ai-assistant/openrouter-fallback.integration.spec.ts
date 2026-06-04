/**
 * INTEGRATION — Fallback Gemini → OpenRouter de extremo a extremo.
 *
 * Integra piezas REALES (sin DB ni red real):
 *   • AiAssistantService (orquestador)
 *   • OpenRouterProvider REAL (conversión Gemini→OpenAI + loop de tools)
 *   • tool-registry REAL (buildActiveTools por persona CLIENT)
 *   • executeTool REAL (delegando en un AiDataAccessService mock)
 *
 * El cliente de Gemini se INYECTA como doble (sin mockear el módulo
 * `@google/genai`, poco fiable bajo ESM nativo): basta con setear el campo
 * privado `client`, que `getClient()` devuelve tal cual. Gemini falla por
 * quota → OpenRouter toma el control, pide `search_providers`, el orquestador
 * la ejecuta y el modelo cierra con texto.
 */
import { AiAssistantService } from '../../../src/ai-assistant/ai-assistant.service.js';
import { OpenRouterProvider } from '../../../src/ai-assistant/providers/openrouter.provider.js';
import type {
  AiCaller,
  AiHistoryTurn,
} from '../../../src/ai-assistant/ai-assistant.types.js';

const CALLER: AiCaller = { userId: 7, role: 'USUARIO', providerType: null };

function makeRes(
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {},
): any {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

function makeService(geminiGenerate: jest.Mock) {
  const config = {
    get: (k: string) =>
      (({
        GEMINI_API_KEY: 'test-key',
        OPENROUTER_API_KEY: 'sk-or-test',
        OPENROUTER_MODEL: 'deepseek/deepseek-chat-v3',
        OPENROUTER_FALLBACK_MODEL: 'qwen/qwen3-32b',
      }) as Record<string, string>)[k],
  };
  const flags = {
    promptVersion: () => 'v1',
    isToolEnabled: () => true,
    isEnabledForRole: () => true,
  };
  const breaker = {
    canRequest: async () => ({ allowed: true, state: 'CLOSED' }),
    recordSuccess: async () => {},
    recordFailure: async () => {},
  };
  const sanitizer = {
    sanitize: (m: string) => ({
      cleaned: m,
      riskScore: 0,
      flagged: false,
      reasons: [],
    }),
  };
  const guardrails = {
    apply: (t: string) => ({ safe: t, redacted: false, toxic: false }),
  };
  const knowledge = { getKnowledgeContext: async () => '' };
  // executeTool REAL llama searchProvidersSafe igual que en producción.
  const data = {
    searchProvidersSafe: jest.fn(async () => [
      { id: 1, businessName: 'Gasfitero Pro', categoryName: 'Gasfitería' },
    ]),
  };
  const conversations = {
    getOrCreate: async () => 1,
    recoverHistory: async () => [] as AiHistoryTurn[],
    saveMessage: async () => {},
  };
  const cache = { get: async () => undefined, set: async () => {} };

  const openrouter = new OpenRouterProvider(config as any);

  const service = new AiAssistantService(
    config as any,
    flags as any,
    breaker as any,
    sanitizer as any,
    guardrails as any,
    knowledge as any,
    data as any,
    conversations as any,
    cache as any,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    openrouter,
  );

  // Doble de Gemini: getClient() devuelve este client sin tocar el SDK real.
  (service as any).client = { models: { generateContent: geminiGenerate } };
  (service as any).clientInitTried = true;

  return { service, data };
}

describe('Fallback Gemini → OpenRouter (integration, sin DB)', () => {
  const realFetch = (global as any).fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });
  afterAll(() => {
    (global as any).fetch = realFetch;
  });

  it('Gemini quota → OpenRouter ejecuta search_providers y responde', async () => {
    const gemini = jest.fn().mockRejectedValue({
      status: 429,
      message: 'RESOURCE_EXHAUSTED: quota exceeded',
    });

    // OpenRouter: 1ª ronda pide la tool, 2ª ronda cierra con texto.
    fetchMock
      .mockResolvedValueOnce(
        makeRes({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: 'call_1',
                    type: 'function',
                    function: {
                      name: 'search_providers',
                      arguments: '{"category":"gasfitero","department":"Junín"}',
                    },
                  },
                ],
              },
            },
          ],
          usage: { total_tokens: 20 },
        }),
      )
      .mockResolvedValueOnce(
        makeRes({
          choices: [{ message: { content: 'Te recomiendo a Gasfitero Pro.' } }],
          usage: { total_tokens: 7 },
        }),
      );

    const { service, data } = makeService(gemini);

    const r = await service.chat(CALLER, 'busca un gasfitero en Huancayo');

    // El fallback ejecutó la MISMA tool real del orquestador.
    expect(data.searchProvidersSafe).toHaveBeenCalledTimes(1);
    expect(data.searchProvidersSafe).toHaveBeenCalledWith(
      'gasfitero',
      'Junín',
      undefined,
      undefined,
    );
    expect(r.reply).toBe('Te recomiendo a Gasfitero Pro.');
    expect(r.meta.blocked).toBe(false);

    // Conversión real de tools (CLIENT incluye search_providers) en el 1er POST.
    const body1 = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body1.model).toBe('deepseek/deepseek-chat-v3');
    expect(
      body1.tools.some(
        (t: any) =>
          t.function?.name === 'search_providers' &&
          t.function?.parameters?.type === 'object',
      ),
    ).toBe(true);
    // El 2º POST reenvía el resultado de la tool (proveedores) como role:'tool'.
    const body2 = JSON.parse(fetchMock.mock.calls[1][1].body);
    const toolMsg = body2.messages.find((m: any) => m.role === 'tool');
    expect(toolMsg).toBeTruthy();
    expect(JSON.parse(toolMsg.content).providers[0].businessName).toBe(
      'Gasfitero Pro',
    );
  });

  it('Gemini quota + OpenRouter (ambos modelos) caídos → error normal', async () => {
    const gemini = jest.fn().mockRejectedValue({
      status: 429,
      message: 'quota exceeded',
    });
    // DeepSeek y Qwen devuelven 500 → fallback agota la cadena de modelos.
    fetchMock.mockResolvedValue(makeRes('down', { ok: false, status: 500 }));

    const { service } = makeService(gemini);
    const r = await service.chat(CALLER, 'hola');

    expect(r.meta.blocked).toBe(true);
    expect(r.meta.reason).toBe('circuit');
    expect(fetchMock).toHaveBeenCalledTimes(2); // deepseek + qwen
  });
});
