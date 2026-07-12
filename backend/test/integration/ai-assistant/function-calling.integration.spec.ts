/**
 * INTEGRATION — Ciclo de Function Calling (EL test clave).
 *
 * Gemini (@google/genai) mockeado con `jest.unstable_mockModule` (ESM:
 * NO sirve `jest.mock`) → import dinámico del service DESPUÉS del mock.
 * Todo lo demás es REAL: data-access, conversación, sanitizer y guardrails
 * contra Postgres real.
 *
 * Verifica el ciclo completo:
 *   1ª llamada Gemini → functionCall get_user_coins
 *   → el service ejecuta AiDataAccess (consulta coins reales en BD)
 *   → reinyecta el functionResponse en la 2ª llamada a Gemini
 *   → Gemini devuelve texto → pasa por Guardrails (enmascara DNI).
 */
import {
  getTestPrisma,
  disconnectTestPrisma,
  truncateAll,
  ensureSeedCatalogs,
} from '../../utils/db.util';
import { createTestUser } from '../../utils/factories';
import type { PrismaService } from '../../../prisma/prisma.service.js';

// ── Mock del SDK de Gemini (antes de importar el service) ──────────
const mockGenerateContent = jest.fn();
const referralsEnabled = process.env.FEATURE_REFERIDOS === 'true';

// `unstable_mockModule` existe en runtime (@jest/globals, modo ESM) pero
// los @types/jest de este repo no lo declaran → cast a any.
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

// Clases cargadas dinámicamente DESPUÉS de registrar el mock.
/* eslint-disable @typescript-eslint/no-explicit-any */
let AiAssistantService: any;
let AiDataAccessService: any;
let AiConversationService: any;
let AiSanitizerService: any;
let AiGuardrailsService: any;

describe('Function calling (integration, Gemini mockeado + BD real)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ AiAssistantService } = await import(
      '../../../src/ai-assistant/ai-assistant.service.js'
    ));
    ({ AiDataAccessService } = await import(
      '../../../src/ai-assistant/ai-data-access.service.js'
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
  });

  beforeEach(async () => {
    await truncateAll(prisma);
    await ensureSeedCatalogs(prisma);
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "ai_messages", "ai_conversations" RESTART IDENTITY CASCADE;',
    );
    mockGenerateContent.mockReset();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  /** Arma el service con servicios reales (BD) + mocks de infra. */
  function buildService() {
    const mem = new Map<string, unknown>();
    const cache = {
      get: async (k: string) => mem.get(k),
      set: async (k: string, v: unknown) => {
        mem.set(k, v);
      },
    };
    const config = {
      get: (k: string) => (k === 'GEMINI_API_KEY' ? 'test-key' : undefined),
    };
    const flags = {
      promptVersion: () => 'v1',
      isToolEnabled: () => true, // kill-switches OFF → todas activas
      isEnabledForRole: () => true,
    };
    const breaker = {
      canRequest: async () => ({ allowed: true, state: 'CLOSED' }),
      recordSuccess: async () => {},
      recordFailure: async () => {},
    };
    const knowledge = { getKnowledgeContext: async () => '' };

    const data = new AiDataAccessService(prisma);
    const conversations = new AiConversationService(prisma);
    const sanitizer = new AiSanitizerService();
    const guardrails = new AiGuardrailsService();

    const service = new AiAssistantService(
      config as any,
      flags as any,
      breaker as any,
      sanitizer,
      guardrails,
      knowledge as any,
      data,
      conversations,
      cache as any,
    );
    return service;
  }

  it('intercepta functionCall(get_user_coins) y reinyecta la respuesta según el flag → Guardrails', async () => {
    const user = await createTestUser(prisma, { coins: 250 });

    // 1ª respuesta: pide la tool. 2ª: texto final (con DNI para probar Guardrails).
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [{ name: 'get_user_coins', args: {} }],
        usageMetadata: { totalTokenCount: 8 },
      })
      .mockResolvedValueOnce({
        functionCalls: undefined,
        text: 'Tienes tus monedas. El DNI 12345678 quedó registrado.',
        usageMetadata: { totalTokenCount: 12 },
      });

    const service = buildService();
    const result = await service.chat(
      { userId: user.id, role: 'USUARIO', providerType: null },
      '¿cuántas monedas tengo?',
    );

    // Dos llamadas a Gemini: functionCall + texto final.
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);

    // La 2ª llamada recibió el resultado REAL de la BD reinyectado.
    const secondContents = JSON.stringify(
      mockGenerateContent.mock.calls[1][0].contents,
    );
    expect(secondContents).toContain('functionResponse');
    expect(secondContents).toContain('get_user_coins');
    expect(secondContents).toContain(
      referralsEnabled ? '250' : 'Herramienta no disponible: get_user_coins',
    );

    // La respuesta final pasó por Guardrails → DNI enmascarado.
    expect(result.reply).toContain('[DATO PRIVADO]');
    expect(result.reply).not.toContain('12345678');
    expect(result.meta.blocked).toBe(false);
  });
});
