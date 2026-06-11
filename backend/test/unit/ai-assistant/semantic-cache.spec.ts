/**
 * UNIT — Caché semántico de respuestas (reduce llamadas a Gemini/OpenRouter).
 *
 *   • semanticCanonical: consultas equivalentes → misma clave canónica.
 *   • Hit semántico: una 2ª consulta equivalente NO vuelve a llamar a la IA.
 *   • Búsqueda con proveedores: se cachea CON tarjetas; el hit las reconstruye.
 *   • Backward-compat: valores legacy (texto plano) se leen como { reply }.
 *   • Consultas distintas → claves distintas (sin falsos positivos).
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
import { semanticCanonical } from '../../../src/ai-assistant/ai-assistant.helpers.js';
import type {
  AiCaller,
  AiHistoryTurn,
} from '../../../src/ai-assistant/ai-assistant.types.js';

const CLIENT: AiCaller = { userId: 5, role: 'USUARIO', providerType: null };

function makeService() {
  // Caché REAL en memoria (Map) para que set/get persistan entre llamadas.
  const store = new Map<string, unknown>();
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
  const data = {
    searchProvidersSafe: jest.fn(async () => [
      {
        id: 1,
        slug: 'electricista-pro',
        businessName: 'Electricista Pro',
        type: 'OFICIO',
        averageRating: 4.7,
        totalReviews: 9,
        isVerified: true,
        availability: 'DISPONIBLE',
        phone: '',
        whatsapp: null,
        distanceKm: null,
        images: [],
        providerCategories: [],
        locality: null,
        subscription: { plan: 'GRATIS' },
      },
    ]),
  };
  const conversations = {
    getOrCreate: jest.fn(async () => 1),
    recoverHistory: jest.fn(async () => [] as AiHistoryTurn[]),
    saveMessage: jest.fn(async () => {}),
  };
  const cache = {
    get: jest.fn(async (k: string) => (store.has(k) ? store.get(k) : undefined)),
    set: jest.fn(async (k: string, v: unknown) => {
      store.set(k, v);
    }),
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
  return { service, data, store };
}

describe('AiAssistantService — caché semántico', () => {
  beforeEach(() => mockGenerateContent.mockReset());

  it('semanticCanonical: variantes equivalentes → misma clave', () => {
    // semanticCanonical se extrajo a ai-assistant.helpers.ts (refactor de
    // mantenibilidad); misma lógica, nueva ubicación.
    const canon = (s: string): string => semanticCanonical(s);

    const expected = 'electricista huancayo';
    expect(canon('electricista en Huancayo')).toBe(expected);
    expect(canon('electricistas en Huancayo')).toBe(expected);
    expect(canon('busco un electricista en Huancayo')).toBe(expected);
    expect(canon('  ¿Electricistas  EN huancayo?  ')).toBe(expected);

    // Consultas distintas → canónicas distintas.
    expect(canon('gasfitero en Lima')).not.toBe(expected);
  });

  it('hit semántico: 2ª consulta equivalente NO llama a la IA', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Te recomiendo 3 electricistas en Huancayo.',
      functionCalls: [],
      usageMetadata: { totalTokenCount: 10 },
    });
    const { service } = makeService();

    const r1 = await service.chat(CLIENT, 'electricista en Huancayo');
    const r2 = await service.chat(CLIENT, 'busco un electricista en Huancayo');

    // La IA se llamó SOLO en la primera; la segunda salió de caché.
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(r1.meta.cached).toBe(false);
    expect(r2.meta.cached).toBe(true);
    expect(r2.reply).toBe(r1.reply);
  });

  it('búsqueda con proveedores: se cachea CON tarjetas y el hit las reconstruye', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [{ name: 'search_providers', args: { category: 'electricista' } }],
        usageMetadata: { totalTokenCount: 5 },
      })
      .mockResolvedValueOnce({
        text: 'Encontré a Electricista Pro.',
        functionCalls: [],
        usageMetadata: { totalTokenCount: 4 },
      });
    const { service, data } = makeService();

    const r1 = await service.chat(CLIENT, 'electricista en Huancayo');
    const r2 = await service.chat(CLIENT, 'electricistas en Huancayo');

    // 2 llamadas de la 1ª consulta (tool + texto); 0 de la 2ª.
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(data.searchProvidersSafe).toHaveBeenCalledTimes(1);

    expect(r1.type).toBe('PROVIDER_RESULTS');
    expect(r2.meta.cached).toBe(true);
    expect(r2.type).toBe('PROVIDER_RESULTS');
    expect(r2.providers?.[0].id).toBe(1);
  });

  it('cacheGet: backward-compat con valores legacy (texto plano) y JSON', async () => {
    const { service } = makeService();
    const cacheGet = (k: string): Promise<unknown> =>
      (service as any).cacheGet(k);
    const cacheSet = (k: string, p: unknown): Promise<void> =>
      (service as any).cacheSet(k, p, 1000);

    // Legacy: el store tiene texto plano.
    (service as any).cache.set('legacy', 'respuesta vieja');
    expect(await cacheGet('legacy')).toEqual({ reply: 'respuesta vieja' });

    // Nuevo: payload JSON round-trip.
    await cacheSet('nuevo', {
      reply: 'hola',
      type: 'PROVIDER_RESULTS',
      providers: [{ id: 9 }],
    });
    const got = (await cacheGet('nuevo')) as any;
    expect(got.reply).toBe('hola');
    expect(got.providers[0].id).toBe(9);
  });
});
