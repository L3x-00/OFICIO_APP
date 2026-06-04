/**
 * UNIT — AiAssistantService: payload enriquecido PROVIDER_RESULTS.
 *
 *   • search_providers corrió → la respuesta lleva { type:'PROVIDER_RESULTS',
 *     providers } para que el cliente renderice tarjetas navegables.
 *   • El CLIENTE recibe el contacto (phone/whatsapp) de los planes de pago,
 *     pero el MODELO recibe la copia SIN contacto (barrera de privacidad).
 *   • Sin search_providers → respuesta normal, sin type/providers (backcompat).
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

const SAMPLE_PROVIDER = {
  id: 1,
  slug: 'gasfitero-pro',
  businessName: 'Gasfitero Pro',
  type: 'OFICIO',
  averageRating: 4.8,
  totalReviews: 12,
  isVerified: true,
  availability: 'DISPONIBLE',
  phone: '999888777',
  whatsapp: '999888777',
  distanceKm: null,
  images: [{ url: 'https://img/cover.jpg', isCover: true }],
  providerCategories: [{ category: { name: 'Gasfitería', slug: 'gasfiteria' } }],
  locality: { department: 'Junín', province: 'Huancayo', district: 'El Tambo' },
  subscription: { plan: 'PREMIUM' },
};

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
  const data = {
    searchProvidersSafe: jest.fn(async () => [SAMPLE_PROVIDER]),
  };
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
  );
  return { service, data, cache };
}

describe('AiAssistantService — payload PROVIDER_RESULTS', () => {
  beforeEach(() => mockGenerateContent.mockReset());

  it('search_providers → cliente recibe type+providers; modelo recibe copia SIN contacto', async () => {
    // Ronda 1: Gemini pide la tool. Ronda 2: cierra con texto.
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [{ name: 'search_providers', args: { category: 'gasfitero' } }],
        usageMetadata: { totalTokenCount: 5 },
      })
      .mockResolvedValueOnce({
        text: 'Te recomiendo a Gasfitero Pro.',
        functionCalls: [],
        usageMetadata: { totalTokenCount: 3 },
      });

    const { service, data } = makeService();
    const r = await service.chat(CALLER, 'busca un gasfitero');

    expect(data.searchProvidersSafe).toHaveBeenCalledTimes(1);

    // CLIENTE: payload enriquecido con contacto intacto.
    expect(r.type).toBe('PROVIDER_RESULTS');
    expect(r.providers).toHaveLength(1);
    expect(r.providers?.[0].id).toBe(1);
    expect(r.providers?.[0].phone).toBe('999888777');
    expect(r.reply).toBe('Te recomiendo a Gasfitero Pro.');

    // MODELO: el functionResponse de la ronda 1 (visto en el 2º request)
    // NO debe contener phone/whatsapp.
    const secondContents = mockGenerateContent.mock.calls[1][0].contents as any[];
    const frPart = secondContents
      .flatMap((c) => c.parts ?? [])
      .find((p: any) => p.functionResponse);
    expect(frPart).toBeTruthy();
    const modelProvider = frPart.functionResponse.response.providers[0];
    expect(modelProvider.id).toBe(1);
    expect(modelProvider.businessName).toBe('Gasfitero Pro');
    expect(modelProvider.phone).toBeUndefined();
    expect(modelProvider.whatsapp).toBeUndefined();
  });

  it('sin search_providers → respuesta normal, sin type ni providers', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Servi es un marketplace de servicios locales.',
      functionCalls: [],
      usageMetadata: { totalTokenCount: 4 },
    });

    const { service } = makeService();
    const r = await service.chat(CALLER, 'qué es Servi');

    expect(r.type).toBeUndefined();
    expect(r.providers).toBeUndefined();
    expect(r.meta.blocked).toBe(false);
  });
});
