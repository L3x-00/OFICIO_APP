/**
 * UNIT — AiAssistantService (orquestación).
 *
 * Mockeamos Gemini SDK (@google/genai), Redis (CACHE_MANAGER) y todos los
 * servicios inyectados. Cero asserts sobre texto de Gemini: validamos
 * orquestación (anti-loop), control de costos y truncado de historial.
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
import {
  FORCED_REPHRASE_MESSAGE,
  MAX_TOOL_ROUNDS,
  HISTORY_MAX_MESSAGES,
  HISTORY_MAX_CHARS,
  GLOBAL_DAILY_KEY,
} from '../../../src/ai-assistant/ai-assistant.constants.js';
import type {
  AiCaller,
  AiHistoryTurn,
} from '../../../src/ai-assistant/ai-assistant.types.js';

const CALLER: AiCaller = { userId: 7, role: 'USUARIO', providerType: null };

/** Construye el service con mocks por defecto (felices). */
function makeService() {
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
  // Por defecto: cache vacía → contadores 0, sin hit de respuesta.
  const cache = {
    get: jest.fn(async (_key: string): Promise<number | undefined> => undefined),
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
  );
  return { service, mocks: { config, flags, breaker, sanitizer, guardrails, knowledge, data, conversations, cache } };
}

describe('AiAssistantService (unit, orquestación)', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it('Anti-loop: Gemini pide tools en cada ronda → corta a la 4ª y devuelve FORCED_REPHRASE_MESSAGE', async () => {
    const { service } = makeService();
    // Gemini SIEMPRE devuelve una function call → nunca da texto final.
    mockGenerateContent.mockResolvedValue({
      functionCalls: [{ name: 'search_providers', args: {} }],
      usageMetadata: { totalTokenCount: 5 },
    });

    const result = await service.chat(CALLER, 'busca proveedores cerca');

    expect(result.reply).toBe(FORCED_REPHRASE_MESSAGE);
    expect(result.meta.blocked).toBe(false);
    // Se llamó MAX_TOOL_ROUNDS + 1 veces (la última dispara el corte).
    expect(mockGenerateContent).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS + 1);
  });

  it('Cost Control: cuota diaria del usuario excedida → bloquea (reason "quota"), NO llama a Gemini', async () => {
    const { service, mocks } = makeService();
    // Global OK, pero el contador diario del usuario supera el límite.
    mocks.cache.get.mockImplementation(async (key: string) => {
      if (key === GLOBAL_DAILY_KEY) return 0;
      if (key.startsWith('ai:daily:')) return 999; // user daily >> 20 (USUARIO)
      return undefined;
    });

    const result = await service.chat(CALLER, 'Hola');

    expect(result.meta.blocked).toBe(true);
    expect(result.meta.reason).toBe('quota');
    expect(mockGenerateContent).not.toHaveBeenCalled(); // cortó antes de Gemini
  });

  describe('buildContents (truncado de historial, regla 6)', () => {
    it('trunca a HISTORY_MAX_MESSAGES (10) mensajes + el actual', () => {
      const { service } = makeService();
      const history: AiHistoryTurn[] = Array.from({ length: 15 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'model',
        text: `m${i}`,
      }));
      const contents = (service as any).buildContents(history, 'mensaje actual');
      // 10 de historial + 1 actual.
      expect(contents).toHaveLength(HISTORY_MAX_MESSAGES + 1);
      expect(contents[contents.length - 1].parts[0].text).toBe('mensaje actual');
    });

    it('trunca por HISTORY_MAX_CHARS (6000) acumulados', () => {
      const { service } = makeService();
      // 5 turnos de 2000 chars = 10000 → solo entran ~3 (6000) + el actual.
      const history: AiHistoryTurn[] = Array.from({ length: 5 }, () => ({
        role: 'user' as const,
        text: 'x'.repeat(2000),
      }));
      const contents = (service as any).buildContents(history, 'actual');
      const historyContents = contents.slice(0, -1); // excluye el actual
      const totalChars = historyContents.reduce(
        (acc: number, c: any) => acc + c.parts[0].text.length,
        0,
      );
      expect(totalChars).toBeLessThanOrEqual(HISTORY_MAX_CHARS);
      expect(historyContents.length).toBeLessThan(5); // no entraron los 5
    });
  });
});
