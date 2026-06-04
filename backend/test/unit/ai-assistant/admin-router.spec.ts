/**
 * UNIT — Router determinístico de métricas admin (sin IA).
 *
 *   • ADMIN + métrica conocida → responde desde BD, SIN llamar a Gemini.
 *   • Funciona aunque el circuit breaker esté OPEN (router antes del breaker).
 *   • No-admin o pregunta no-métrica → flujo IA normal (router omitido).
 *   • Si la BD falla → cae a IA (sin romper).
 *   • matchAdminMetric: cobertura de las intenciones soportadas.
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
  AiRequestMeta,
} from '../../../src/ai-assistant/ai-assistant.types.js';

const ADMIN: AiCaller = { userId: 1, role: 'ADMIN', providerType: null };
const ADMIN_META: AiRequestMeta = { appOrigin: 'admin' };
const CLIENT: AiCaller = { userId: 2, role: 'USUARIO', providerType: null };

const STATS = {
  totalUsers: 1500,
  newUsersToday: 12,
  newUsersThisWeek: 80,
  newUsersLastWeek: 60,
  totalProviders: 300,
  approvedProviders: 250,
  pendingProviders: 50,
  monthlyRevenue: 4200.5,
};
const PENDING = {
  providers: [{ businessName: 'Gasfitero X', type: 'OFICIO', since: '2026-06-01' }],
  trustValidations: [],
  totalProviders: 3,
  totalTrustValidations: 1,
};
const TOP = [
  {
    businessName: 'Negocio Top',
    type: 'NEGOCIO',
    averageRating: 4.9,
    totalReviews: 30,
    movement: 120,
  },
];

function makeService(opts: { breaker?: any; data?: any } = {}) {
  const config = {
    get: jest.fn((k: string) => (k === 'GEMINI_API_KEY' ? 'test-key' : undefined)),
  };
  const flags = {
    promptVersion: () => 'v1',
    isToolEnabled: jest.fn(() => true),
    isEnabledForRole: () => true,
  };
  const breaker = opts.breaker ?? {
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
    searchProvidersSafe: jest.fn(async () => []),
    getPlatformStatsSafe: jest.fn(async () => STATS),
    getPendingApprovalsSafe: jest.fn(async () => PENDING),
    getTopProvidersSafe: jest.fn(async () => TOP),
    ...opts.data,
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
  return { service, data, conversations, breaker };
}

describe('AiAssistantService — router determinístico admin', () => {
  beforeEach(() => mockGenerateContent.mockReset());

  it('ADMIN "¿Cuántos usuarios tengo?" → stats desde BD, SIN IA', async () => {
    const { service, data, conversations } = makeService();

    const r = await service.chat(ADMIN, '¿Cuántos usuarios tengo?', [], ADMIN_META);

    expect(data.getPlatformStatsSafe).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(r.meta.deterministic).toBe(true);
    expect(r.meta.blocked).toBe(false);
    expect(r.reply).toContain('1500');
    expect(r.reply).toContain('Proveedores');
    // Persistió el turno (user + model).
    expect(conversations.saveMessage).toHaveBeenCalledTimes(2);
  });

  it('ADMIN "aprobaciones pendientes" → cola desde BD, SIN IA', async () => {
    const { service, data } = makeService();

    const r = await service.chat(ADMIN, 'aprobaciones pendientes', [], ADMIN_META);

    expect(data.getPendingApprovalsSafe).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(r.meta.deterministic).toBe(true);
    expect(r.reply).toContain('Proveedores por verificar');
  });

  it('ADMIN "top proveedores" → ranking desde BD, SIN IA', async () => {
    const { service, data } = makeService();

    const r = await service.chat(ADMIN, 'top proveedores', [], ADMIN_META);

    expect(data.getTopProvidersSafe).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(r.reply).toContain('Negocio Top');
  });

  it('responde aunque el circuit breaker esté OPEN (router antes del breaker)', async () => {
    const breaker = {
      canRequest: jest.fn(async () => ({ allowed: false, state: 'OPEN' })),
      recordSuccess: jest.fn(async () => {}),
      recordFailure: jest.fn(async () => {}),
    };
    const { service, data } = makeService({ breaker });

    const r = await service.chat(ADMIN, 'cuántos usuarios', [], ADMIN_META);

    expect(r.meta.deterministic).toBe(true);
    expect(data.getPlatformStatsSafe).toHaveBeenCalled();
    // Ni siquiera se consultó el breaker: se respondió antes.
    expect(breaker.canRequest).not.toHaveBeenCalled();
  });

  it('NO-admin "¿cuántos usuarios hay?" → va a IA (router omitido)', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'No tengo acceso a esa información.',
      functionCalls: [],
      usageMetadata: { totalTokenCount: 2 },
    });
    const { service, data } = makeService();

    const r = await service.chat(CLIENT, '¿cuántos usuarios hay?');

    expect(data.getPlatformStatsSafe).not.toHaveBeenCalled();
    expect(mockGenerateContent).toHaveBeenCalled();
    expect(r.meta.deterministic).toBeUndefined();
  });

  it('ADMIN pregunta NO-métrica → va a IA', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Servi es un marketplace.',
      functionCalls: [],
      usageMetadata: { totalTokenCount: 3 },
    });
    const { service, data } = makeService();

    await service.chat(ADMIN, '¿cómo funciona Servi?', [], ADMIN_META);

    expect(data.getPlatformStatsSafe).not.toHaveBeenCalled();
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('métrica admin pero la BD falla → cae a IA (no rompe)', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Déjame revisar…',
      functionCalls: [],
      usageMetadata: { totalTokenCount: 1 },
    });
    const { service } = makeService({
      data: {
        getPlatformStatsSafe: jest.fn(async () => {
          throw new Error('db down');
        }),
      },
    });

    const r = await service.chat(ADMIN, 'cuántos usuarios', [], ADMIN_META);

    expect(mockGenerateContent).toHaveBeenCalled();
    expect(r.meta.deterministic).toBeUndefined();
  });

  it('matchAdminMetric: cobertura de intenciones soportadas', () => {
    const { service } = makeService();
    const match = (s: string): string | null =>
      (service as any).matchAdminMetric(s);

    // platform_stats
    expect(match('usuarios')).toBe('platform_stats');
    expect(match('cantidad de usuarios')).toBe('platform_stats');
    expect(match('proveedores activos')).toBe('platform_stats');
    expect(match('¿Cuántos proveedores activos existen?')).toBe('platform_stats');
    expect(match('ingresos del mes')).toBe('platform_stats');
    expect(match('estadísticas de la plataforma')).toBe('platform_stats');
    // pending_approvals
    expect(match('aprobaciones pendientes')).toBe('pending_approvals');
    expect(match('¿Cuántas solicitudes pendientes hay?')).toBe('pending_approvals');
    expect(match('qué falta verificar')).toBe('pending_approvals');
    // top_providers
    expect(match('top proveedores')).toBe('top_providers');
    expect(match('proveedor con más movimiento')).toBe('top_providers');
    // sin match → IA
    expect(match('cómo funciona Servi')).toBeNull();
    expect(match('hola Ofi')).toBeNull();
  });
});
