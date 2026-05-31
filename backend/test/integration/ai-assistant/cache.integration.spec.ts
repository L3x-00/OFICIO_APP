/**
 * INTEGRATION — Caché inteligente de respuestas (Fase 4).
 *
 * La lógica de caché vive en AiAssistantService: decide cacheabilidad por
 * intención (faq/search cachean, financial hace BYPASS) y solo para la 1ª
 * pregunta de una conversación. La clave es por ROL (no por usuario), así
 * que dos usuarios distintos del mismo rol comparten caché.
 *
 * Gemini mockeado (ESM). Conversación/persistencia REAL (Postgres). El
 * boundary de Redis se modela con un cache-manager en memoria controlable
 * (get/set/del + interruptor "down"). NO se valida texto de Gemini.
 *
 *   1. FAQ cache       (2ª idéntica → hit, Gemini NO se llama).
 *   2. TTL FAQ         (expira → vuelve a llamar a Gemini).
 *   3. Search cache    (hit en repetición, TTL de búsqueda).
 *   4. Datos dinámicos (financial → NUNCA cachea, siempre fresco).
 *   5. Redis caído     (todo el flujo sobrevive, Gemini directo, sin throw).
 */
import {
  getTestPrisma,
  disconnectTestPrisma,
  truncateAll,
} from '../../utils/db.util';
import { createTestUser } from '../../utils/factories';
import {
  RESP_CACHE_PREFIX,
  CACHE_TTL_FAQ_MS,
  CACHE_TTL_SEARCH_MS,
} from '../../../src/ai-assistant/ai-assistant.constants.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';

const mockGenerateContent = jest.fn();

(jest as any).unstable_mockModule('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
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
(jest as any).unstable_mockModule('@sentry/nestjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
let AiAssistantService: any;
let AiConversationService: any;
let AiSanitizerService: any;
let AiGuardrailsService: any;

const USUARIO = (id: number) =>
  ({ userId: id, role: 'USUARIO', providerType: null }) as const;

/** cache-manager en memoria controlable (modela el boundary de Redis). */
function makeCacheHarness() {
  const store = new Map<string, unknown>();
  const sets: { key: string; ttl?: number }[] = [];
  const state = { down: false };
  const cache = {
    get: jest.fn(async (k: string) => {
      if (state.down) throw new Error('Redis down');
      return store.get(k);
    }),
    set: jest.fn(async (k: string, v: unknown, ttl?: number) => {
      if (state.down) throw new Error('Redis down');
      store.set(k, v);
      sets.push({ key: k, ttl });
    }),
    del: jest.fn(async (k: string) => {
      store.delete(k);
    }),
  };
  return {
    cache,
    state,
    /** Sets de respuesta (clave RESP_CACHE_PREFIX), excluye contadores de cuota. */
    respSets: () => sets.filter((s) => s.key.startsWith(RESP_CACHE_PREFIX)),
    /** Simula expiración del TTL: borra solo las entradas de respuesta. */
    expireResp: () => {
      for (const k of [...store.keys()]) {
        if (k.startsWith(RESP_CACHE_PREFIX)) store.delete(k);
      }
    },
  };
}

describe('AI response cache (integration, BD real)', () => {
  let prisma: PrismaService;
  let conversations: any;
  let sanitizer: any;
  let guardrails: any;
  let seq = 0;

  beforeAll(async () => {
    ({ AiAssistantService } = await import(
      '../../../src/ai-assistant/ai-assistant.service.js'
    ));
    ({ AiConversationService } = await import(
      '../../../src/ai-assistant/ai-conversation.service.js'
    ));
    ({ AiSanitizerService } = await import(
      '../../../src/ai-assistant/ai-sanitizer.service.js'
    ));
    ({ AiGuardrailsService } = await import(
      '../../../src/ai-assistant/ai-guardrails.service.js'
    ));

    prisma = await getTestPrisma();
    conversations = new AiConversationService(prisma);
    sanitizer = new AiSanitizerService();
    guardrails = new AiGuardrailsService();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "ai_messages", "ai_conversations" RESTART IDENTITY CASCADE;',
    );
    mockGenerateContent.mockReset();
    mockGenerateContent.mockResolvedValue({
      text: 'respuesta de prueba',
      functionCalls: undefined,
      usageMetadata: { totalTokenCount: 5 },
    });
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  /** Service con persistencia REAL + caché controlable + Gemini mock. */
  function build() {
    const h = makeCacheHarness();
    const config = {
      get: (k: string) => (k === 'GEMINI_API_KEY' ? 'test-key' : undefined),
    };
    const flags = {
      promptVersion: () => 'v1',
      isToolEnabled: () => false, // sin tools: respuesta de texto directa
      isEnabledForRole: () => true,
    };
    const breaker = {
      canRequest: async () => ({ allowed: true, state: 'CLOSED' }),
      recordSuccess: async () => {},
      recordFailure: async () => {},
    };
    const knowledge = { getKnowledgeContext: async () => '' };
    const service = new AiAssistantService(
      config as any,
      flags as any,
      breaker as any,
      sanitizer,
      guardrails,
      knowledge as any,
      {} as any, // data — sin tools
      conversations,
      h.cache as any,
    );
    return { service, cache: h };
  }

  /** Usuario USUARIO con email único (conversación siempre fresca). */
  const freshUser = () =>
    createTestUser(prisma, {
      role: 'USUARIO',
      email: `cache_${Date.now()}_${seq++}@test.com`,
      coins: 50,
    });

  it('Case 1: FAQ → 1ª consulta llama a Gemini; 2ª idéntica sale de caché (Gemini NO se llama)', async () => {
    const { service, cache } = build();
    const msg = '¿qué es Servi?'; // intent faq

    const a = await freshUser();
    const r1 = await service.chat(USUARIO(a.id), msg);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(r1.meta.cached).toBe(false);
    // Se guardó con TTL de FAQ.
    const set = cache.respSets()[0];
    expect(set).toBeDefined();
    expect(set.ttl).toBe(CACHE_TTL_FAQ_MS);

    const b = await freshUser();
    const r2 = await service.chat(USUARIO(b.id), msg);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1); // SIN nueva llamada
    expect(r2.meta.cached).toBe(true);
    expect(r2.reply).toBe(r1.reply); // misma respuesta cacheada
  });

  it('Case 2: TTL FAQ → al expirar la caché, la consulta vuelve a llamar a Gemini', async () => {
    const { service, cache } = build();
    const msg = '¿cómo funciona Servi?'; // intent faq

    const a = await freshUser();
    await service.chat(USUARIO(a.id), msg);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    cache.expireResp(); // simula expiración del TTL

    const b = await freshUser();
    const r2 = await service.chat(USUARIO(b.id), msg);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2); // nueva llamada
    expect(r2.meta.cached).toBe(false);
  });

  it('Case 3: search → 2ª búsqueda idéntica sale de caché (TTL de búsqueda)', async () => {
    const { service, cache } = build();
    const msg = 'necesito un electricista'; // intent search

    const a = await freshUser();
    const r1 = await service.chat(USUARIO(a.id), msg);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(r1.meta.cached).toBe(false);
    const set = cache.respSets()[0];
    expect(set).toBeDefined();
    expect(set.ttl).toBe(CACHE_TTL_SEARCH_MS); // TTL corto de búsqueda

    const b = await freshUser();
    const r2 = await service.chat(USUARIO(b.id), msg);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1); // hit de caché
    expect(r2.meta.cached).toBe(true);
  });

  it('Case 4: datos dinámicos (monedas/suscripción → financial) → NUNCA cachea, siempre fresco', async () => {
    const { service, cache } = build();
    const msg = '¿cuántas monedas tengo y cuándo vence mi plan de suscripción?'; // financial

    const a = await freshUser();
    const r1 = await service.chat(USUARIO(a.id), msg);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(r1.meta.cached).toBe(false);
    expect(cache.respSets()).toHaveLength(0); // BYPASS: nada escrito en caché

    const b = await freshUser();
    const r2 = await service.chat(USUARIO(b.id), msg);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2); // se vuelve a consultar
    expect(r2.meta.cached).toBe(false);
    expect(cache.respSets()).toHaveLength(0); // sigue sin cachear
  });

  it('Case 5: Redis caído → el sistema sigue, consulta a Gemini directo, sin excepción', async () => {
    const { service, cache } = build();
    cache.state.down = true; // toda operación de caché lanza

    const a = await freshUser();
    // Si lanzara, el test fallaría aquí (no hay try/catch).
    const r = await service.chat(USUARIO(a.id), '¿qué es Servi?');

    expect(r.meta.blocked).toBe(false);
    expect(typeof r.reply).toBe('string');
    expect(r.reply.length).toBeGreaterThan(0);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1); // fue directo a Gemini
  });
});
