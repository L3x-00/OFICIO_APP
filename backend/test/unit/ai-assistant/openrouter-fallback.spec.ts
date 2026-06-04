/**
 * UNIT — AiAssistantService: orquestación del FALLBACK Gemini → OpenRouter.
 *
 *   • Gemini OK                       → OpenRouter NO se ejecuta.
 *   • Gemini quota (429/EXHAUSTED)    → OpenRouter responde.
 *   • Gemini timeout (>15s)           → OpenRouter responde.
 *   • Gemini + OpenRouter fallan      → error normal (blocked 'circuit').
 *   • Gemini error NO transitorio     → OpenRouter NO se ejecuta.
 *   • OpenRouter no configurado       → no se intenta.
 */
jest.mock('@sentry/nestjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  FunctionCallingConfigMode: { AUTO: 'AUTO' },
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
  },
}));

import { AiAssistantService } from '../../../src/ai-assistant/ai-assistant.service.js';
import type {
  AiCaller,
  AiHistoryTurn,
} from '../../../src/ai-assistant/ai-assistant.types.js';

const CALLER: AiCaller = { userId: 7, role: 'USUARIO', providerType: null };

function makeOpenRouter(over: Record<string, unknown> = {}) {
  return {
    isConfigured: jest.fn(() => true),
    generate: jest.fn(async () => ({
      reply: 'Respuesta de OpenRouter',
      tokensUsed: 9,
      model: 'deepseek/deepseek-chat-v3',
    })),
    ...over,
  };
}

function makeService(openrouter?: any) {
  const config = {
    get: jest.fn((k: string) => (k === 'GEMINI_API_KEY' ? 'test-key' : undefined)),
  };
  const flags = {
    promptVersion: () => 'v1',
    isToolEnabled: jest.fn(() => true),
    isEnabledForRole: () => true,
  };
  const breaker = {
    canRequest: jest.fn(async () => ({ allowed: true, state: 'CLOSED' })),
    recordSuccess: jest.fn(async () => {}),
    recordFailure: jest.fn(async () => {}),
  };
  const sanitizer = {
    sanitize: jest.fn((m: string) => ({
      cleaned: m,
      riskScore: 0,
      flagged: false,
      reasons: [],
    })),
  };
  const guardrails = {
    apply: jest.fn((t: string) => ({ safe: t, redacted: false, toxic: false })),
  };
  const knowledge = { getKnowledgeContext: jest.fn(async () => '') };
  const data = { searchProvidersSafe: jest.fn(async () => []) };
  const conversations = {
    getOrCreate: jest.fn(async () => 1),
    recoverHistory: jest.fn(async () => [] as AiHistoryTurn[]),
    saveMessage: jest.fn(async () => {}),
  };
  const cache = {
    get: jest.fn(async () => undefined),
    set: jest.fn(async () => {}),
  };

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
    undefined, // quota
    undefined, // guestStrategy
    undefined, // clientStrategy
    undefined, // providerStrategy
    undefined, // adminStrategy
    openrouter as any,
  );
  return { service, openrouter };
}

describe('AiAssistantService — fallback Gemini → OpenRouter', () => {
  beforeEach(() => mockGenerateContent.mockReset());

  it('Gemini OK → OpenRouter NO se ejecuta', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Hola desde Gemini',
      functionCalls: [],
      usageMetadata: { totalTokenCount: 3 },
    });
    const or = makeOpenRouter();
    const { service } = makeService(or);

    const r = await service.chat(CALLER, 'cuéntame de Servi');

    expect(r.reply).toBe('Hola desde Gemini');
    expect(r.meta.blocked).toBe(false);
    expect(or.generate).not.toHaveBeenCalled();
  });

  it('Gemini quota exceeded (429/RESOURCE_EXHAUSTED) → OpenRouter responde', async () => {
    mockGenerateContent.mockRejectedValue({
      status: 429,
      message: 'RESOURCE_EXHAUSTED: quota exceeded',
    });
    const or = makeOpenRouter();
    const { service } = makeService(or);

    const r = await service.chat(CALLER, 'busca gasfitero');

    expect(or.generate).toHaveBeenCalledTimes(1);
    expect(r.reply).toBe('Respuesta de OpenRouter');
    expect(r.meta.blocked).toBe(false);
  });

  it('Gemini timeout (>15s) → OpenRouter responde', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini timeout'));
    const or = makeOpenRouter();
    const { service } = makeService(or);

    const r = await service.chat(CALLER, 'hola');

    expect(or.generate).toHaveBeenCalledTimes(1);
    expect(r.reply).toBe('Respuesta de OpenRouter');
  });

  it('Gemini + OpenRouter fallan → error normal (blocked circuit)', async () => {
    mockGenerateContent.mockRejectedValue({ status: 503, message: 'overloaded' });
    const or = makeOpenRouter({
      generate: jest.fn(async () => {
        throw new Error('OpenRouter down');
      }),
    });
    const { service } = makeService(or);

    const r = await service.chat(CALLER, 'hola');

    expect(or.generate).toHaveBeenCalledTimes(1);
    expect(r.meta.blocked).toBe(true);
    expect(r.meta.reason).toBe('circuit');
  });

  it('Gemini error NO transitorio (HTTP 400) → OpenRouter NO se ejecuta', async () => {
    mockGenerateContent.mockRejectedValue({
      status: 400,
      message: 'invalid argument',
    });
    const or = makeOpenRouter();
    const { service } = makeService(or);

    const r = await service.chat(CALLER, 'hola');

    expect(or.generate).not.toHaveBeenCalled();
    expect(r.meta.blocked).toBe(true);
    expect(r.meta.reason).toBe('circuit');
  });

  it('OpenRouter no configurado → no se intenta el fallback', async () => {
    mockGenerateContent.mockRejectedValue({ status: 429, message: 'quota' });
    const or = makeOpenRouter({
      isConfigured: jest.fn(() => false),
      generate: jest.fn(),
    });
    const { service } = makeService(or);

    const r = await service.chat(CALLER, 'hola');

    expect(or.generate).not.toHaveBeenCalled();
    expect(r.meta.blocked).toBe(true);
  });
});
