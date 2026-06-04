/**
 * UNIT — OpenRouterProvider (proveedor de fallback IA).
 *
 * Mockea `fetch` global y valida:
 *   • Respuesta directa (sin tools).
 *   • Function calling completo: tool_calls → runTool → 2ª ronda, con la
 *     conversión de tools Gemini→OpenAI (type OBJECT→object).
 *   • Doble modelo: DeepSeek falla → Qwen responde.
 *   • Ambos modelos fallan → relanza error.
 *   • Anti-loop (MAX_TOOL_ROUNDS) → FORCED_REPHRASE_MESSAGE.
 */
import { OpenRouterProvider } from '../../../src/ai-assistant/providers/openrouter.provider.js';
import { FORCED_REPHRASE_MESSAGE } from '../../../src/ai-assistant/ai-assistant.constants.js';

function makeConfig(over: Record<string, string | undefined> = {}) {
  const map: Record<string, string | undefined> = {
    OPENROUTER_API_KEY: 'sk-or-test',
    OPENROUTER_MODEL: 'deepseek/deepseek-chat-v3',
    OPENROUTER_FALLBACK_MODEL: 'qwen/qwen3-32b',
    ...over,
  };
  return { get: (k: string) => map[k] } as any;
}

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

// Tools en formato GEMINI (como las emite buildActiveTools).
const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_providers',
        description: 'Busca proveedores',
        parameters: {
          type: 'OBJECT',
          properties: { category: { type: 'STRING', description: 'rubro' } },
          required: ['category'],
        },
      },
    ],
  },
] as any;

describe('OpenRouterProvider (unit)', () => {
  const realFetch = (global as any).fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });
  afterAll(() => {
    (global as any).fetch = realFetch;
  });

  it('isConfigured: false sin API key', () => {
    const p = new OpenRouterProvider(
      makeConfig({ OPENROUTER_API_KEY: undefined }),
    );
    expect(p.isConfigured()).toBe(false);
  });

  it('isConfigured: true con key + modelo', () => {
    expect(new OpenRouterProvider(makeConfig()).isConfigured()).toBe(true);
  });

  it('respuesta directa (sin tools) → reply + tokens + modelo', async () => {
    fetchMock.mockResolvedValueOnce(
      makeRes({
        choices: [{ message: { content: 'Hola, soy Ofi' } }],
        usage: { total_tokens: 12 },
      }),
    );
    const p = new OpenRouterProvider(makeConfig());
    const out = await p.generate({
      systemInstruction: 'sys',
      history: [],
      userMessage: 'hola',
      tools: undefined,
      runTool: jest.fn(),
    });
    expect(out.reply).toBe('Hola, soy Ofi');
    expect(out.tokensUsed).toBe(12);
    expect(out.model).toBe('deepseek/deepseek-chat-v3');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('function calling: ejecuta tool y hace 2ª ronda (tools OBJECT→object)', async () => {
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
                      arguments: '{"category":"gasfitero"}',
                    },
                  },
                ],
              },
            },
          ],
          usage: { total_tokens: 10 },
        }),
      )
      .mockResolvedValueOnce(
        makeRes({
          choices: [{ message: { content: 'Encontré 2 gasfiteros' } }],
          usage: { total_tokens: 5 },
        }),
      );
    const runTool = jest.fn(async () => ({ providers: [{ id: 1 }] }));
    const p = new OpenRouterProvider(makeConfig());

    const out = await p.generate({
      systemInstruction: 'sys',
      history: [{ role: 'user', text: 'hist' }],
      userMessage: 'busca gasfitero',
      tools: GEMINI_TOOLS,
      runTool,
    });

    expect(out.reply).toBe('Encontré 2 gasfiteros');
    expect(out.tokensUsed).toBe(15);
    expect(runTool).toHaveBeenCalledWith({
      name: 'search_providers',
      args: { category: 'gasfitero' },
    });

    // Conversión de tools en el 1er request.
    const body1 = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body1.model).toBe('deepseek/deepseek-chat-v3');
    expect(body1.tool_choice).toBe('auto');
    expect(body1.tools[0].type).toBe('function');
    expect(body1.tools[0].function.name).toBe('search_providers');
    expect(body1.tools[0].function.parameters.type).toBe('object');
    expect(body1.tools[0].function.parameters.properties.category.type).toBe(
      'string',
    );
    // El 2º request reenvía el resultado de la tool como role:'tool'.
    const body2 = JSON.parse(fetchMock.mock.calls[1][1].body);
    const toolMsg = body2.messages.find((m: any) => m.role === 'tool');
    expect(toolMsg).toBeTruthy();
    expect(JSON.parse(toolMsg.content)).toEqual({ providers: [{ id: 1 }] });
  });

  it('doble modelo: DeepSeek falla (HTTP 500) → Qwen responde', async () => {
    fetchMock
      .mockResolvedValueOnce(makeRes('upstream error', { ok: false, status: 500 }))
      .mockResolvedValueOnce(
        makeRes({
          choices: [{ message: { content: 'Respondió Qwen' } }],
          usage: { total_tokens: 8 },
        }),
      );
    const p = new OpenRouterProvider(makeConfig());

    const out = await p.generate({
      systemInstruction: 'sys',
      history: [],
      userMessage: 'hola',
      tools: undefined,
      runTool: jest.fn(),
    });

    expect(out.reply).toBe('Respondió Qwen');
    expect(out.model).toBe('qwen/qwen3-32b');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe(
      'qwen/qwen3-32b',
    );
  });

  it('ambos modelos fallan → relanza el último error', async () => {
    fetchMock.mockResolvedValue(makeRes('boom', { ok: false, status: 500 }));
    const p = new OpenRouterProvider(makeConfig());
    await expect(
      p.generate({
        systemInstruction: 'sys',
        history: [],
        userMessage: 'hola',
        tools: undefined,
        runTool: jest.fn(),
      }),
    ).rejects.toThrow(/HTTP 500/);
    expect(fetchMock).toHaveBeenCalledTimes(2); // deepseek + qwen
  });

  it('anti-loop: tool_calls infinitos → FORCED_REPHRASE_MESSAGE', async () => {
    fetchMock.mockResolvedValue(
      makeRes({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'c',
                  type: 'function',
                  function: { name: 'search_providers', arguments: '{}' },
                },
              ],
            },
          },
        ],
        usage: { total_tokens: 1 },
      }),
    );
    const p = new OpenRouterProvider(makeConfig());
    const out = await p.generate({
      systemInstruction: 'sys',
      history: [],
      userMessage: 'x',
      tools: GEMINI_TOOLS,
      runTool: jest.fn(async () => ({})),
    });
    expect(out.reply).toBe(FORCED_REPHRASE_MESSAGE);
  });

  it('sin API key → generate lanza', async () => {
    const p = new OpenRouterProvider(
      makeConfig({ OPENROUTER_API_KEY: undefined }),
    );
    await expect(
      p.generate({
        systemInstruction: 'sys',
        history: [],
        userMessage: 'x',
        tools: undefined,
        runTool: jest.fn(),
      }),
    ).rejects.toThrow(/no configurado/);
  });
});
