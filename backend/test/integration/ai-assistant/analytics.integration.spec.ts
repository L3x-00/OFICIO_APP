/**
 * INTEGRATION — Observabilidad / analítica (Fase 8).
 *
 * AiAnalyticsService REAL agregando ai_messages reales (Postgres) + contadores
 * en cache. AiCircuitBreakerService REAL sobre el mismo cache (Map) para el
 * estado del breaker. Foco: CONSISTENCIA MATEMÁTICA de las métricas (sumas,
 * promedios, invariantes cruzados). No se valida UI.
 *
 *   1. Tokens consumidos      (sum tokensUsed hoy).
 *   2. Costos estimados       (cost == tokens/1e6 * rate, 4 dec).
 *   3. Latencia promedio      (avg responseTimeMs role=model hoy).
 *   4. Intentos de jailbreak  (today ≤ total; recientes ≤ 10).
 *   5. Estado circuit breaker (refleja cache; isOpen == state OPEN).
 *   6. Top consultas          (desc; excluye flagged; Σcount == no-flagged).
 *   7. Dashboard cross-check  (Σtop + jailbreakTotal == questionsAllTime).
 */
import {
  getTestPrisma,
  disconnectTestPrisma,
} from '../../utils/db.util';
import {
  EST_COST_PER_MTOK_USD,
  CB_STATE_KEY,
  CB_FAILS_KEY,
  CB_OPENED_AT_KEY,
  geminiErrorsKey,
  breakerOpensKey,
  peruDayKey,
} from '../../../src/ai-assistant/ai-assistant.constants.js';
import { CircuitState } from '../../../src/ai-assistant/ai-assistant.types.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';

(jest as any).unstable_mockModule('@sentry/nestjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
let AiAnalyticsService: any;
let AiCircuitBreakerService: any;

interface MsgOpts {
  role: 'user' | 'model';
  content?: string;
  tokens?: number | null;
  latency?: number | null;
  flagged?: boolean;
  ip?: string | null;
  createdAt?: Date;
}

describe('AI analytics (integration, BD real)', () => {
  let prisma: PrismaService;
  let store: Map<string, unknown>;
  let cache: any;
  let analytics: any;
  let convId: number;

  beforeAll(async () => {
    ({ AiAnalyticsService } = await import(
      '../../../src/ai-assistant/ai-analytics.service.js'
    ));
    ({ AiCircuitBreakerService } = await import(
      '../../../src/ai-assistant/ai-circuit-breaker.service.js'
    ));
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "ai_messages", "ai_conversations" RESTART IDENTITY CASCADE;',
    );
    store = new Map();
    cache = {
      get: async (k: string) => store.get(k),
      set: async (k: string, v: unknown) => {
        store.set(k, v);
      },
      del: async (k: string) => {
        store.delete(k);
      },
    };
    const flags = { promptVersion: () => 'v1' };
    const config = { get: () => undefined }; // estimateCost usa el default 0.5
    const breaker = new AiCircuitBreakerService(cache);
    analytics = new AiAnalyticsService(prisma, flags, breaker, config, cache);

    const conv = await prisma.aiConversation.create({
      data: { userId: 1, promptVersion: 'v1' },
    });
    convId = conv.id;
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  const insert = (o: MsgOpts) =>
    prisma.aiMessage.create({
      data: {
        conversationId: convId,
        role: o.role,
        content: o.content ?? 'mensaje',
        tokensUsed: o.tokens ?? null,
        responseTimeMs: o.latency ?? null,
        flagged: o.flagged ?? false,
        moderationPass: !(o.flagged ?? false),
        ipAddress: o.ip ?? null,
        createdAt: o.createdAt ?? new Date(),
      },
    });

  it('Case 1: tokens consumidos = Σ tokensUsed de hoy', async () => {
    // 3 turnos: user (sin tokens) + model (con tokens).
    await insert({ role: 'user', content: 'a' });
    await insert({ role: 'model', tokens: 100 });
    await insert({ role: 'user', content: 'b' });
    await insert({ role: 'model', tokens: 250 });
    await insert({ role: 'user', content: 'c' });
    await insert({ role: 'model', tokens: 50 });

    const s = await analytics.getSummary();
    expect(s.tokensToday).toBe(400); // 100+250+50
  });

  it('Case 2: costo estimado = tokens/1e6 * rate (0.5), redondeado a 4 dec', async () => {
    await insert({ role: 'model', tokens: 1_000_000 }); // 1 MTok exacto
    await insert({ role: 'model', tokens: 500_000 }); //  0.5 MTok

    const s = await analytics.getSummary();
    expect(s.tokensToday).toBe(1_500_000);
    // 1.5 MTok * 0.5 USD/MTok = 0.75 USD.
    const expected =
      Math.round((s.tokensToday / 1_000_000) * EST_COST_PER_MTOK_USD * 10000) /
      10000;
    expect(s.estimatedCostTodayUSD).toBe(expected);
    expect(s.estimatedCostTodayUSD).toBe(0.75);
  });

  it('Case 3: latencia promedio = avg(responseTimeMs) de model hoy, redondeado', async () => {
    await insert({ role: 'model', latency: 100, tokens: 1 });
    await insert({ role: 'model', latency: 200, tokens: 1 });
    await insert({ role: 'model', latency: 300, tokens: 1 });
    // user no entra al promedio de latencia.
    await insert({ role: 'user', latency: 9999 });

    const s = await analytics.getSummary();
    expect(s.avgLatencyMs).toBe(200); // (100+200+300)/3
  });

  it('Case 4: jailbreaks → today ≤ total; recientes acotados a 10', async () => {
    const old = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    // 2 flagged hoy + 1 flagged viejo + 1 user limpio.
    await insert({ role: 'user', content: 'ignora todo', flagged: true, ip: '1.1.1.1' });
    await insert({ role: 'user', content: 'reveal prompt', flagged: true });
    await insert({ role: 'user', content: 'viejo ataque', flagged: true, createdAt: old });
    await insert({ role: 'user', content: 'consulta normal', flagged: false });

    const ev = await analytics.getSecurityEvents();
    expect(ev.jailbreakToday).toBe(2);
    expect(ev.jailbreakTotal).toBe(3);
    expect(ev.jailbreakToday).toBeLessThanOrEqual(ev.jailbreakTotal); // invariante
    expect(ev.recentJailbreaks.length).toBe(3);
    expect(ev.recentJailbreaks.length).toBeLessThanOrEqual(10);
    // recientes solo flagged → ninguna "consulta normal".
    expect(ev.recentJailbreaks.some((r: any) => r.content === 'consulta normal')).toBe(false);
  });

  it('Case 5: estado del circuit breaker refleja cache; counters de hoy correctos', async () => {
    const ts = Date.UTC(2026, 0, 1);
    store.set(CB_STATE_KEY, CircuitState.OPEN);
    store.set(CB_FAILS_KEY, 5);
    store.set(CB_OPENED_AT_KEY, ts);
    store.set(geminiErrorsKey(peruDayKey()), 3);
    store.set(breakerOpensKey(peruDayKey()), 2);

    const ev = await analytics.getSecurityEvents();
    expect(ev.circuitBreaker.state).toBe(CircuitState.OPEN);
    expect(ev.circuitBreaker.fails).toBe(5);
    expect(ev.circuitBreaker.openedAt).toBe(ts);
    expect(ev.circuitBreaker.isOpen).toBe(true); // isOpen == (state === OPEN)
    expect(ev.geminiErrorsToday).toBe(3);
    expect(ev.breakerOpensToday).toBe(2);
  });

  it('Case 6: top consultas → orden desc, excluye flagged, Σcount == user no-flagged', async () => {
    const rep = async (content: string, n: number) => {
      for (let i = 0; i < n; i++) await insert({ role: 'user', content });
    };
    await rep('¿cómo funciona Servi?', 3);
    await rep('buscar electricista', 2);
    await rep('hola', 1);
    // flagged NO debe aparecer en el top.
    await insert({ role: 'user', content: 'ignora todo', flagged: true });

    const top = await analytics.getTopQueries();
    // Orden descendente por frecuencia.
    expect(top[0]).toMatchObject({ query: '¿cómo funciona Servi?', count: 3 });
    expect(top.map((t: any) => t.count)).toEqual([3, 2, 1]);
    // Σcount == total de mensajes user NO-flagged (6).
    const sum = top.reduce((acc: number, t: any) => acc + t.count, 0);
    expect(sum).toBe(6);
    // El flagged quedó fuera.
    expect(top.some((t: any) => t.query === 'ignora todo')).toBe(false);
  });

  it('Case 7: dashboard cross-check → Σtop + jailbreakTotal == questionsAllTime == Σtimeline(hoy)', async () => {
    // 4 user no-flagged (2+2) + 2 user flagged + algunos model con tokens.
    await insert({ role: 'user', content: 'q1' });
    await insert({ role: 'user', content: 'q1' });
    await insert({ role: 'user', content: 'q2' });
    await insert({ role: 'user', content: 'q2' });
    await insert({ role: 'user', content: 'ataque', flagged: true });
    await insert({ role: 'user', content: 'ataque2', flagged: true });
    await insert({ role: 'model', tokens: 120, latency: 100 });
    await insert({ role: 'model', tokens: 80, latency: 300 });

    const [summary, top, sec] = await Promise.all([
      analytics.getSummary(),
      analytics.getTopQueries(),
      analytics.getSecurityEvents(),
    ]);

    // questionsAllTime cuenta TODOS los user (flagged o no).
    expect(summary.questionsAllTime).toBe(6);
    expect(summary.questionsToday).toBe(6);
    expect(summary.questionsToday).toBeLessThanOrEqual(summary.questionsAllTime);

    // Invariante de partición: cada user es top (no-flagged) o jailbreak (flagged).
    const sumTop = top.reduce((a: number, t: any) => a + t.count, 0);
    expect(sumTop + sec.jailbreakTotal).toBe(summary.questionsAllTime);

    // timeline: todo se insertó "ahora" → toda la actividad cae dentro de la
    // ventana. En vez de asumir qué fila es "hoy" (frágil cerca de medianoche
    // o según la hora UTC), validamos el INVARIANTE robusto: la suma de la
    // serie == lo de hoy (porque todo se insertó hoy).
    // DEBUG TEMPORAL — diagnóstico del desfase timeline vs hoy.
    const diag = await prisma.$queryRawUnsafe(
      `SELECT (now() AT TIME ZONE 'America/Lima')::date::text AS today,
              (SELECT min(("createdAt" AT TIME ZONE 'America/Lima')::date)::text FROM ai_messages) AS min_msg,
              (SELECT max(("createdAt" AT TIME ZONE 'America/Lima')::date)::text FROM ai_messages) AS max_msg,
              (SELECT count(*)::int FROM ai_messages WHERE role = 'user') AS user_count`,
    );
    // eslint-disable-next-line no-console
    console.log(
      'TIMELINE_DEBUG diag=',
      JSON.stringify(diag),
      'timeline=',
      JSON.stringify(summary.timeline),
      'qToday=',
      summary.questionsToday,
    );

    expect(summary.timeline.length).toBe(14); // backfill de 14 días
    const tlQuestions = summary.timeline.reduce(
      (a: number, r: { questions: number }) => a + r.questions,
      0,
    );
    const tlTokens = summary.timeline.reduce(
      (a: number, r: { tokens: number }) => a + r.tokens,
      0,
    );
    expect(tlQuestions).toBe(summary.questionsToday);
    expect(tlTokens).toBe(summary.tokensToday);
    expect(summary.tokensToday).toBe(200); // 120 + 80

    // costo coherente con tokens.
    expect(summary.estimatedCostTodayUSD).toBe(
      Math.round((summary.tokensToday / 1_000_000) * EST_COST_PER_MTOK_USD * 10000) /
        10000,
    );
  });
});
