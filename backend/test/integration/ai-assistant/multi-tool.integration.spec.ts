/**
 * INTEGRATION — Orquestación multi-tool (cadenas reales de Function Calling).
 *
 * Gemini mockeado (ESM) para guionar las rondas de function-calling; el resto
 * REAL: el loop de `callGemini`, `buildActiveTools` (persona ∩ flag),
 * `executeTool` y AiDataAccessService contra Postgres. NO se valida texto.
 *
 * Las cadenas usan tools de la persona PROVIDER (get_my_context,
 * get_subscription_status, get_provider_stats, recommend_actions):
 *   1. Cadena doble  (get_my_context → recommend_actions).
 *   2. Cadena triple (get_subscription_status → get_provider_stats → recommend_actions).
 *   3. Anti-loop     (4 rondas seguidas → corte + FORCED_REPHRASE_MESSAGE).
 *   4. Tool OFF      (search_providers apagada → no se declara ni se ejecuta).
 *   5. Tool timeout  (query >3s → withTimeout corta → el flujo continúa).
 */
import {
  getTestPrisma,
  disconnectTestPrisma,
  truncateAll,
  ensureSeedCatalogs,
} from '../../utils/db.util';
import { createTestUser, createTestProvider } from '../../utils/factories';
import type { PrismaService } from '../../../prisma/prisma.service.js';

const mockGenerateContent = jest.fn();
const referralsEnabled = process.env.FEATURE_REFERIDOS === 'true';

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
let AiDataAccessService: any;
let AiConversationService: any;
let AiSanitizerService: any;
let AiGuardrailsService: any;
let FORCED_REPHRASE_MESSAGE: string;
let MAX_TOOL_ROUNDS: number;

/** Respuesta de Gemini que pide una function call. */
const fnCall = (name: string, args: Record<string, unknown> = {}) => ({
  functionCalls: [{ name, args }],
  text: undefined,
  usageMetadata: { totalTokenCount: 4 },
});
/** Respuesta final de texto (cierra el loop). */
const fnText = (text = 'listo') => ({
  functionCalls: undefined,
  text,
  usageMetadata: { totalTokenCount: 2 },
});

describe('Multi-tool orchestration (integration, BD real)', () => {
  let prisma: PrismaService;
  let data: any;
  let conversations: any;
  let sanitizer: any;
  let guardrails: any;

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
    ({ FORCED_REPHRASE_MESSAGE, MAX_TOOL_ROUNDS } = await import(
      '../../../src/ai-assistant/ai-assistant.constants.js'
    ));

    prisma = await getTestPrisma();
    data = new AiDataAccessService(prisma);
    conversations = new AiConversationService(prisma);
    sanitizer = new AiSanitizerService();
    guardrails = new AiGuardrailsService();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
    await ensureSeedCatalogs(prisma);
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "ai_messages", "ai_conversations" RESTART IDENTITY CASCADE;',
    );
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  /** Service con infra mockeada + servicios de datos/persistencia REALES. */
  function build(flags?: { isToolEnabled?: (name: string) => boolean }) {
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
    const flagSvc = {
      promptVersion: () => 'v1',
      isToolEnabled: flags?.isToolEnabled ?? (() => true),
      isEnabledForRole: () => true,
    };
    const breaker = {
      canRequest: async () => ({ allowed: true, state: 'CLOSED' }),
      recordSuccess: async () => {},
      recordFailure: async () => {},
    };
    const knowledge = { getKnowledgeContext: async () => '' };

    return new AiAssistantService(
      config as any,
      flagSvc as any,
      breaker as any,
      sanitizer,
      guardrails,
      knowledge as any,
      data,
      conversations,
      cache as any,
    );
  }

  it('Case 1: cadena doble (get_my_context → recommend_actions) — ambas ejecutadas, en orden, reinyectadas', async () => {
    // get_my_context + recommend_actions son tools de la persona PROVIDER.
    const u = await createTestUser(prisma, { role: 'PROVEEDOR', coins: 50 });
    await createTestProvider(prisma, u.id, { businessName: 'Negocio Case1' });
    const ctxSpy = jest.spyOn(data, 'getMyContextSafe');
    const recSpy = jest.spyOn(data, 'recommendActionsSafe');

    mockGenerateContent
      .mockResolvedValueOnce(fnCall('get_my_context'))
      .mockResolvedValueOnce(fnCall('recommend_actions'))
      .mockResolvedValueOnce(fnText());

    const res = await build().chat(
      { userId: u.id, role: 'PROVEEDOR', providerType: null },
      'qué hago ahora',
    );

    expect(res.meta.blocked).toBe(false);
    expect(mockGenerateContent).toHaveBeenCalledTimes(3); // 2 tools + cierre

    // Ambas ejecutadas (recommend_actions reusa getMyContextSafe internamente,
    // por eso ctxSpy ≥ 1, no exactamente 1).
    expect(ctxSpy).toHaveBeenCalled();
    expect(recSpy).toHaveBeenCalledTimes(1);
    // Orden correcto: get_my_context (tool) ANTES de recommend_actions.
    expect(ctxSpy.mock.invocationCallOrder[0]).toBeLessThan(
      recSpy.mock.invocationCallOrder[0],
    );

    // Resultado reinyectado: la 2ª llamada lleva el functionResponse de la 1ª.
    const call2 = JSON.stringify(mockGenerateContent.mock.calls[1][0].contents);
    expect(call2).toContain('functionResponse');
    expect(call2).toContain('get_my_context');
    // La 3ª llamada ya lleva el resultado de recommend_actions.
    const call3 = JSON.stringify(mockGenerateContent.mock.calls[2][0].contents);
    expect(call3).toContain('recommend_actions');
  });

  it('Case 2: cadena triple (get_subscription_status → get_provider_stats → recommend_actions) — las 3 ejecutadas', async () => {
    const u = await createTestUser(prisma, { role: 'PROVEEDOR', coins: 10 });
    await createTestProvider(prisma, u.id, {
      categoryName: 'Electricistas',
      businessName: 'Electricistas Test',
      averageRating: 4.2,
    });
    const subSpy = jest.spyOn(data, 'getSubscriptionStatusSafe');
    const statsSpy = jest.spyOn(data, 'getProviderStatsSafe');
    const recSpy = jest.spyOn(data, 'recommendActionsSafe');

    mockGenerateContent
      .mockResolvedValueOnce(fnCall('get_subscription_status'))
      .mockResolvedValueOnce(fnCall('get_provider_stats'))
      .mockResolvedValueOnce(fnCall('recommend_actions'))
      .mockResolvedValueOnce(fnText());

    const res = await build().chat(
      { userId: u.id, role: 'PROVEEDOR', providerType: null },
      'cómo van mis stats y qué hago',
    );

    expect(res.meta.blocked).toBe(false);
    expect(mockGenerateContent).toHaveBeenCalledTimes(4); // 3 tools + cierre
    expect(subSpy).toHaveBeenCalledTimes(1);
    expect(statsSpy).toHaveBeenCalledTimes(1);
    expect(recSpy).toHaveBeenCalledTimes(1);
    // Orden encadenado.
    expect(subSpy.mock.invocationCallOrder[0]).toBeLessThan(
      statsSpy.mock.invocationCallOrder[0],
    );
    expect(statsSpy.mock.invocationCallOrder[0]).toBeLessThan(
      recSpy.mock.invocationCallOrder[0],
    );
  });

  it('Case 3: anti-loop (4 rondas de tools seguidas) → corte en MAX_TOOL_ROUNDS + FORCED_REPHRASE_MESSAGE', async () => {
    const u = await createTestUser(prisma, { role: 'USUARIO' });
    // Gemini SIEMPRE pide una tool → nunca da texto.
    mockGenerateContent.mockResolvedValue(fnCall('search_providers'));

    const res = await build().chat(
      { userId: u.id, role: 'USUARIO', providerType: null },
      'busca y busca y busca',
    );

    expect(res.reply).toBe(FORCED_REPHRASE_MESSAGE);
    expect(res.meta.blocked).toBe(false);
    // Llama MAX_TOOL_ROUNDS + 1 veces (la última dispara el corte).
    expect(mockGenerateContent).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS + 1);
  });

  it('Case 4: tool deshabilitada (search_providers OFF) → no se declara a Gemini ni se ejecuta', async () => {
    const u = await createTestUser(prisma, { role: 'USUARIO' });
    const searchSpy = jest.spyOn(data, 'searchProvidersSafe');

    // El modelo intenta llamarla igual; el orquestador debe rechazarla.
    mockGenerateContent
      .mockResolvedValueOnce(fnCall('search_providers', { category: 'x' }))
      .mockResolvedValueOnce(fnText());

    const res = await build({
      isToolEnabled: (name) => name !== 'search_providers',
    }).chat({ userId: u.id, role: 'USUARIO', providerType: null }, 'busca algo');

    expect(res.meta.blocked).toBe(false);
    // No llegó a Gemini: la declaración NO está en el catálogo enviado.
    const declared = (mockGenerateContent.mock.calls[0][0].config.tools ?? [])
      .flatMap((t: any) => t.functionDeclarations ?? [])
      .map((d: any) => d.name);
    expect(declared).not.toContain('search_providers');
    expect(declared.includes('get_user_coins')).toBe(referralsEnabled);
    // No se ejecutó: executeTool la corta por activeNames.
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('Case 5: tool timeout (query >3s) → withTimeout corta, el flujo continúa sin crash', async () => {
    const u = await createTestUser(prisma, { role: 'USUARIO' });
    // La rama sin coords usa provider.findMany → la hacemos lenta (5s).
    jest.spyOn(prisma.provider, 'findMany').mockImplementation(
      (() =>
        new Promise((resolve) =>
          setTimeout(() => resolve([]), 5000),
        )) as any,
    );
    const searchSpy = jest.spyOn(data, 'searchProvidersSafe');

    mockGenerateContent
      .mockResolvedValueOnce(fnCall('search_providers', { category: 'electricista' }))
      .mockResolvedValueOnce(fnText());

    const start = Date.now();
    const res = await build().chat(
      { userId: u.id, role: 'USUARIO', providerType: null },
      'busca electricista',
    );
    const elapsed = Date.now() - start;

    // El flujo terminó sin crash y siguió a la ronda final.
    expect(res.meta.blocked).toBe(false);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(searchSpy).toHaveBeenCalledTimes(1);
    // Cortó a ~3s (withTimeout), no esperó los 5s.
    expect(elapsed).toBeGreaterThanOrEqual(2800);
    expect(elapsed).toBeLessThan(4800);
  }, 15000);

  it('Case 6 (admin): X-App-Origin admin + rol ADMIN → get_top_providers ejecutada con movimiento real', async () => {
    // Proveedor APROBADO con movimiento (2 vistas + 1 clic de WhatsApp).
    const owner = await createTestUser(prisma, {
      role: 'PROVEEDOR',
      email: `top_${Date.now()}@x.com`,
    });
    const provider = await createTestProvider(prisma, owner.id, {
      businessName: 'Proveedor Movido',
    });
    await prisma.providerAnalytic.createMany({
      data: [
        { providerId: provider.id, eventType: 'view' as any },
        { providerId: provider.id, eventType: 'view' as any },
        { providerId: provider.id, eventType: 'whatsapp_click' as any },
      ],
    });

    // El admin consulta desde el PANEL (header X-App-Origin: admin).
    const admin = await createTestUser(prisma, {
      role: 'ADMIN',
      email: `admin_${Date.now()}@x.com`,
    });
    const topSpy = jest.spyOn(data, 'getTopProvidersSafe');

    mockGenerateContent
      .mockResolvedValueOnce(fnCall('get_top_providers'))
      .mockResolvedValueOnce(fnText('El que más se mueve es Proveedor Movido.'));

    const res = await build().chat(
      { userId: admin.id, role: 'ADMIN', providerType: null },
      'qué proveedor tiene más movimiento',
      [],
      { appOrigin: 'admin' },
    );

    expect(res.meta.blocked).toBe(false);
    // La métrica admin 'top_providers' la resuelve el ROUTER DETERMINÍSTICO
    // (sin IA): consulta getTopProvidersSafe y formatea la respuesta desde BD.
    // Gemini NO se invoca (ni para function-calling ni para reinyección),
    // aunque el mock tenga respuestas encoladas → ahorra cuota y funciona con
    // Gemini caído.
    expect(res.meta.deterministic).toBe(true);
    expect(topSpy).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).not.toHaveBeenCalled();
    // La respuesta trae datos REALES: el proveedor con más movimiento
    // (2 vistas + 1 clic = 3 interacciones).
    expect(res.reply).toContain('Proveedor Movido');
    expect(res.reply).toContain('3 interacciones');
  });
});
