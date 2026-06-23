import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../generated/client/client.js';
import { AiFeatureFlagService } from './ai-feature-flag.service.js';
import {
  AiCircuitBreakerService,
  type CircuitStatus,
} from './ai-circuit-breaker.service.js';
import {
  EST_COST_PER_MTOK_USD,
  breakerOpensKey,
  geminiErrorsKey,
  peruDayKey,
} from './ai-assistant.constants.js';

// ── DTOs de respuesta (lo que consume el panel admin) ───────────
export interface AiUsagePoint {
  day: string;
  questions: number;
  tokens: number;
}

export interface AiSummaryDto {
  questionsToday: number;
  questionsAllTime: number;
  tokensToday: number;
  estimatedCostTodayUSD: number;
  avgLatencyMs: number;
  promptVersion: string;
  timeline: AiUsagePoint[];
}

export interface AiTopQueryDto {
  query: string;
  count: number;
}

export interface AiSecurityEventsDto {
  jailbreakToday: number;
  jailbreakTotal: number;
  geminiErrorsToday: number;
  breakerOpensToday: number;
  circuitBreaker: CircuitStatus;
  recentJailbreaks: Array<{
    content: string;
    createdAt: Date;
    ip: string | null;
  }>;
}

/** Fila cruda del timeline (raw SQL → DTO). */
interface TimelineRow {
  day: string;
  questions: bigint | number;
  tokens: bigint | number;
}

/**
 * Servicio de observabilidad del asistente "Ofi" (Fase 8). SOLO lectura;
 * agrega datos de `AiMessage` (persistencia, Fase 4) + contadores Redis.
 * Resiliente: cualquier fallo devuelve ceros/listas vacías en vez de
 * romper el panel admin.
 */
@Injectable()
export class AiAnalyticsService {
  private readonly logger = new Logger(AiAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: AiFeatureFlagService,
    private readonly breaker: AiCircuitBreakerService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /** Resumen: preguntas, tokens/costo de hoy, latencia, versión + timeline. */
  async getSummary(): Promise<AiSummaryDto> {
    const promptVersion = this.flags.promptVersion();
    try {
      const today = this.startOfPeruDayUtc();

      const [
        questionsToday,
        questionsAllTime,
        tokensAgg,
        latencyAgg,
        timeline,
      ] = await Promise.all([
        this.prisma.aiMessage.count({
          where: { role: 'user', createdAt: { gte: today } },
        }),
        this.prisma.aiMessage.count({ where: { role: 'user' } }),
        this.prisma.aiMessage.aggregate({
          _sum: { tokensUsed: true },
          where: { createdAt: { gte: today } },
        }),
        this.prisma.aiMessage.aggregate({
          _avg: { responseTimeMs: true },
          where: { role: 'model', createdAt: { gte: today } },
        }),
        this.dailyTimeline(14),
      ]);

      const tokensToday = tokensAgg._sum.tokensUsed ?? 0;
      const avgLatencyMs = Math.round(latencyAgg._avg.responseTimeMs ?? 0);

      return {
        questionsToday,
        questionsAllTime,
        tokensToday,
        estimatedCostTodayUSD: this.estimateCost(tokensToday),
        avgLatencyMs,
        promptVersion,
        timeline,
      };
    } catch (e) {
      this.logger.warn(`getSummary falló: ${(e as Error)?.message ?? e}`);
      return {
        questionsToday: 0,
        questionsAllTime: 0,
        tokensToday: 0,
        estimatedCostTodayUSD: 0,
        avgLatencyMs: 0,
        promptVersion,
        timeline: [],
      };
    }
  }

  /**
   * Consultas de usuario más frecuentes.
   *
   * Antes agrupaba por `content` EXACTO: "¿Cuánto cuesta?", "cuanto cuesta"
   * y "Cuánto cuesta " contaban como 3 consultas distintas (count=1 cada
   * una) → la lista parecía un log crudo y "no agrupaba". Ahora normaliza
   * en SQL (minúsculas + colapso de espacios + recorte de signos ¿¡?!.,)
   * antes de agrupar, y muestra como etiqueta el original más reciente.
   */
  async getTopQueries(limit = 10): Promise<AiTopQueryDto[]> {
    const take = Math.min(Math.max(limit, 1), 50);
    try {
      const rows = await this.prisma.$queryRaw<
        Array<{ query: string; count: bigint | number }>
      >(Prisma.sql`
        SELECT (array_agg(content ORDER BY "createdAt" DESC))[1] AS query,
               count(*)                                          AS count
        FROM ai_messages
        WHERE role = 'user' AND flagged = false
        GROUP BY lower(btrim(regexp_replace(content, '\\s+', ' ', 'g'), ' ¿¡?!.,'))
        ORDER BY count DESC
        LIMIT ${take}
      `);
      return rows.map((r) => ({
        query: this.truncate(r.query, 140),
        count: Number(r.count),
      }));
    } catch (e) {
      this.logger.warn(`getTopQueries falló: ${(e as Error)?.message ?? e}`);
      return [];
    }
  }

  /** Eventos de seguridad: jailbreaks (sanitizer) + estado del breaker. */
  async getSecurityEvents(): Promise<AiSecurityEventsDto> {
    const circuitBreaker = await this.breaker.getStatus();
    try {
      const today = this.startOfPeruDayUtc();
      const dayKey = peruDayKey();

      const [
        jailbreakToday,
        jailbreakTotal,
        recent,
        geminiErrors,
        breakerOpens,
      ] = await Promise.all([
        this.prisma.aiMessage.count({
          where: { role: 'user', flagged: true, createdAt: { gte: today } },
        }),
        this.prisma.aiMessage.count({
          where: { role: 'user', flagged: true },
        }),
        this.prisma.aiMessage.findMany({
          where: { role: 'user', flagged: true },
          select: { content: true, createdAt: true, ipAddress: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.cache.get<number>(geminiErrorsKey(dayKey)),
        this.cache.get<number>(breakerOpensKey(dayKey)),
      ]);

      return {
        jailbreakToday,
        jailbreakTotal,
        geminiErrorsToday: geminiErrors ?? 0,
        breakerOpensToday: breakerOpens ?? 0,
        circuitBreaker,
        recentJailbreaks: recent.map((r) => ({
          content: this.truncate(r.content, 160),
          createdAt: r.createdAt,
          ip: r.ipAddress,
        })),
      };
    } catch (e) {
      this.logger.warn(
        `getSecurityEvents falló: ${(e as Error)?.message ?? e}`,
      );
      return {
        jailbreakToday: 0,
        jailbreakTotal: 0,
        geminiErrorsToday: 0,
        breakerOpensToday: 0,
        circuitBreaker,
        recentJailbreaks: [],
      };
    }
  }

  // ── Helpers ─────────────────────────────────────────────────

  /**
   * Uso diario (preguntas + tokens) de los últimos `days` días, agrupado
   * por día en horario de Perú. Raw SQL parametrizado (regla 3): el único
   * valor dinámico (`days`) viaja como bind param.
   *
   * BACKFILL: `generate_series` produce TODOS los días de la ventana y se
   * hace LEFT JOIN con los conteos reales → la serie siempre trae `days`
   * puntos (con ceros donde no hubo actividad). Antes la query solo
   * devolvía días CON mensajes: con uso reciente y disperso la gráfica
   * quedaba con 1 punto (línea invisible) y parecía "sin reporte".
   */
  private async dailyTimeline(days: number): Promise<AiUsagePoint[]> {
    // Se trabaja con el tipo DATE (día calendario en Perú), no con timestamps
    // "naked" + interval: así el JOIN serie↔uso es exacto sin ambigüedad de
    // zona horaria ni de hora del día (antes el día de hoy podía no matchear).
    const rows = await this.prisma.$queryRaw<TimelineRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT (now() AT TIME ZONE 'America/Lima')::date AS today
      ),
      series AS (
        SELECT ((SELECT today FROM bounds) - g) AS day
        FROM generate_series(0, ${days - 1}::int) AS g
      ),
      usage AS (
        -- "createdAt" es timestamp WITHOUT time zone (mapeo Prisma de DateTime)
        -- y guarda el wall-clock UTC. Para obtener el día en Perú hay que
        -- interpretarlo primero como UTC y luego convertir a 'America/Lima'.
        -- (Hacer AT TIME ZONE 'America/Lima' directo lo desfasaba +1 día en la
        -- ventana UTC 00:00–05:00, dejando "hoy" fuera del rango → timeline 0.)
        SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Lima')::date AS day,
               count(*) FILTER (WHERE role = 'user') AS questions,
               coalesce(sum("tokensUsed"), 0)        AS tokens
        FROM ai_messages
        WHERE (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Lima')::date
              > (SELECT today FROM bounds) - ${days}::int
        GROUP BY 1
      )
      SELECT to_char(s.day, 'YYYY-MM-DD')      AS day,
             coalesce(u.questions, 0)          AS questions,
             coalesce(u.tokens, 0)             AS tokens
      FROM series s
      LEFT JOIN usage u ON u.day = s.day
      ORDER BY s.day ASC
    `);
    return rows.map((r) => ({
      day: r.day,
      questions: Number(r.questions),
      tokens: Number(r.tokens),
    }));
  }

  /** Instante UTC del inicio del día actual en Perú (UTC-5). */
  private startOfPeruDayUtc(): Date {
    const dayMs = 24 * 60 * 60 * 1000;
    const offset = 5 * 60 * 60 * 1000;
    const startMs = Math.floor((Date.now() - offset) / dayMs) * dayMs + offset;
    return new Date(startMs);
  }

  /** Costo estimado en USD para una cantidad de tokens. */
  private estimateCost(tokens: number): number {
    const raw = this.config.get<string>('AI_COST_PER_MTOK_USD');
    const perMtok = raw ? Number.parseFloat(raw) : NaN;
    const rate =
      Number.isFinite(perMtok) && perMtok >= 0
        ? perMtok
        : EST_COST_PER_MTOK_USD;
    const cost = (tokens / 1_000_000) * rate;
    // 4 decimales — costos diarios son pequeños.
    return Math.round(cost * 10000) / 10000;
  }

  private truncate(s: string, max: number): string {
    return s.length > max ? `${s.slice(0, max)}…` : s;
  }
}
