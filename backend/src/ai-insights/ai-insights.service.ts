import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ConversionModelService } from './conversion-model.service.js';

// ── DTOs de respuesta (lo que consumirá el panel admin) ─────────────
// Se exportan desde el servicio (misma convención que ai-analytics.service).

/** Un bucket de conversión (por plan / por hora / general). */
export interface ConversionBucket {
  /** Etiqueta del bucket: plan ('GRATIS'|'ESTANDAR'|'PREMIUM') u hora '0'..'23'. */
  key: string;
  views: number;
  contacts: number;
  /** contactos / vistas * 100, redondeado. 0 si no hubo vistas. */
  conversionRate: number;
}

/** Tasa de respuesta del proveedor derivada de chat, segmentada por plan. */
export interface ResponseRateBucket {
  plan: string;
  totalRooms: number;
  roomsWithReply: number;
  /** salas con respuesta del proveedor / salas totales * 100. */
  responseRate: number;
}

export interface ConversionMetricsDto {
  periodDays: number;
  general: {
    views: number;
    contacts: number;
    conversionRate: number;
    chatRooms: number;
  };
  byPlan: ConversionBucket[];
  byHour: ConversionBucket[];
  responseRateByPlan: ResponseRateBucket[];
  /**
   * Aviso honesto para el consumidor: los mensajes de chat se purgan a los
   * 7 días, así que `responseRateByPlan` sobre ventanas largas subestima la
   * respuesta (las salas viejas quedan sin mensajes que contar).
   */
  caveats: string[];
}

/** Puntaje 0-100 + números de soporte para una dimensión de calidad. */
export interface QualityDimension {
  score: number;
  detail: Record<string, number>;
}

export interface DataQualityDto {
  sampleSize: number;
  completeness: QualityDimension;
  consistency: QualityDimension;
  validity: QualityDimension;
  uniqueness: QualityDimension;
  accuracy: QualityDimension;
  /** Promedio simple de las 5 dimensiones. */
  overall: number;
}

export interface InsightsPatternsDto {
  periodDays: number;
  patterns: string[];
}

export interface InsightsDashboardDto {
  periodDays: number;
  totalProviders: number;
  activeProviders: number;
  views: number;
  contacts: number;
  conversionRate: number;
  chatRooms: number;
  dataQualityScore: number;
  /** KPIs del modelo predictivo (null/0 si aún no está entrenado). */
  modelVersion: string | null;
  modelAccuracy: number | null;
  predictionsCount: number;
}

// ── Filas crudas de SQL ─────────────────────────────────────────────
interface CountRow {
  views: bigint | number;
  contacts: bigint | number;
}
interface PlanCountRow extends CountRow {
  plan: string;
}
interface HourCountRow extends CountRow {
  hour: number;
}
interface ResponseRow {
  plan: string;
  total_rooms: bigint | number;
  rooms_with_reply: bigint | number;
}
interface QualityScanRow {
  total: bigint | number;
  has_desc: bigint | number;
  has_wa: bigint | number;
  has_addr: bigint | number;
  has_geo: bigint | number;
  has_social: bigint | number;
  has_image: bigint | number;
  has_category: bigint | number;
  inconsistent: bigint | number;
  invalid: bigint | number;
  approved: bigint | number;
}
interface UniquenessRow {
  total: bigint | number;
  dup_providers: bigint | number;
}

const HOUR = 60 * 60 * 1000;
const PLANS = ['GRATIS', 'ESTANDAR', 'PREMIUM'] as const;

/**
 * Analítica predictiva / de conversión para el panel Admin (sección
 * "Usabilidad de IA"). SOLO lectura y admin-only (el controller aplica
 * JwtAuthGuard + RolesGuard).
 *
 * Fuentes REALES del flujo activo:
 *   • `provider_analytics` (eventos view / whatsapp_click / call_click) —
 *     no existe un evento de "contrato", así que la conversión se define
 *     como proxy: contactos / vistas (decisión del propietario).
 *   • `subscriptions.plan` para segmentar por plan.
 *   • `chat_rooms` / `chat_messages` para tasa de respuesta del proveedor.
 *   • `providers` para las 5 dimensiones de calidad de datos.
 *
 * Resiliencia: cada método envuelve su cómputo en try/catch y devuelve
 * ceros/listas vacías si algo falla — nunca rompe el panel. Rendimiento:
 * agregaciones en SQL (no trae filas crudas) + caché de 1 h por endpoint.
 * SQL crudo con tagged template `$queryRaw` (los `${valor}` viajan como
 * bind params, igual que admin-dashboard.service).
 *
 * NO medible aún en el flujo activo y por eso NO se incluye aquí:
 *   • conversión por distancia (el evento no guarda ubicación del cliente →
 *     se habilita en la sub-fase 3 con tracking aditivo);
 *   • aprobación/rechazo de oferta (vive en features ocultas — diferido).
 */
@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly model: ConversionModelService,
  ) {}

  // ── Métricas de conversión ────────────────────────────────────────
  async getConversionMetrics(days = 30): Promise<ConversionMetricsDto> {
    const period = this.clampDays(days);
    return this.cached(`ai-insights:conversion:${period}`, HOUR, async () => {
      const since = this.sinceDaysAgo(period);
      const empty: ConversionMetricsDto = {
        periodDays: period,
        general: { views: 0, contacts: 0, conversionRate: 0, chatRooms: 0 },
        byPlan: [],
        byHour: this.zeroHours(),
        responseRateByPlan: [],
        caveats: this.conversionCaveats(),
      };
      try {
        const [generalRows, planRows, hourRows, responseRows, chatRooms] =
          await Promise.all([
            this.prisma.$queryRaw<CountRow[]>`
              SELECT
                count(*) FILTER (WHERE a."eventType"::text = 'view')                             AS views,
                count(*) FILTER (WHERE a."eventType"::text IN ('whatsapp_click','call_click'))   AS contacts
              FROM provider_analytics a
              WHERE a."createdAt" >= ${since}
            `,
            this.prisma.$queryRaw<PlanCountRow[]>`
              SELECT s.plan::text AS plan,
                count(*) FILTER (WHERE a."eventType"::text = 'view')                           AS views,
                count(*) FILTER (WHERE a."eventType"::text IN ('whatsapp_click','call_click')) AS contacts
              FROM provider_analytics a
              JOIN providers p     ON p.id = a."providerId"
              JOIN subscriptions s ON s."providerId" = p.id
              WHERE a."createdAt" >= ${since}
              GROUP BY s.plan
            `,
            // Hora del día en Perú: "createdAt" es timestamp SIN tz (wall-clock
            // UTC), por eso se interpreta como UTC y recién se convierte a Lima.
            this.prisma.$queryRaw<HourCountRow[]>`
              SELECT extract(hour FROM (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Lima'))::int AS hour,
                count(*) FILTER (WHERE a."eventType"::text = 'view')                           AS views,
                count(*) FILTER (WHERE a."eventType"::text IN ('whatsapp_click','call_click')) AS contacts
              FROM provider_analytics a
              WHERE a."createdAt" >= ${since}
              GROUP BY 1
            `,
            this.prisma.$queryRaw<ResponseRow[]>`
              SELECT s.plan::text AS plan,
                count(DISTINCT r.id)                                 AS total_rooms,
                count(DISTINCT r.id) FILTER (WHERE m.id IS NOT NULL) AS rooms_with_reply
              FROM chat_rooms r
              JOIN providers p     ON p.id = r."providerId"
              JOIN subscriptions s ON s."providerId" = p.id
              LEFT JOIN chat_messages m
                ON m."chatRoomId" = r.id AND m."senderId" = p."userId"
              WHERE r."createdAt" >= ${since}
              GROUP BY s.plan
            `,
            this.prisma.chatRoom.count({
              where: { createdAt: { gte: since } },
            }),
          ]);

        const g = generalRows[0] ?? { views: 0, contacts: 0 };
        const views = Number(g.views);
        const contacts = Number(g.contacts);

        return {
          periodDays: period,
          general: {
            views,
            contacts,
            conversionRate: this.rate(contacts, views),
            chatRooms,
          },
          byPlan: this.orderByPlan(
            planRows.map((r) => this.toBucket(r.plan, r.views, r.contacts)),
          ),
          byHour: this.fillHours(hourRows),
          responseRateByPlan: this.orderByPlan(
            responseRows.map((r) => ({
              plan: r.plan,
              totalRooms: Number(r.total_rooms),
              roomsWithReply: Number(r.rooms_with_reply),
              responseRate: this.rate(
                Number(r.rooms_with_reply),
                Number(r.total_rooms),
              ),
            })),
            (b) => b.plan,
          ),
          caveats: this.conversionCaveats(),
        };
      } catch (e) {
        this.logger.warn(
          `getConversionMetrics falló: ${(e as Error)?.message ?? e}`,
        );
        return empty;
      }
    });
  }

  // ── Calidad de datos ──────────────────────────────────────────────
  async getDataQuality(): Promise<DataQualityDto> {
    return this.cached('ai-insights:data-quality', HOUR, async () => {
      const empty: DataQualityDto = {
        sampleSize: 0,
        completeness: { score: 0, detail: {} },
        consistency: { score: 0, detail: {} },
        validity: { score: 0, detail: {} },
        uniqueness: { score: 0, detail: {} },
        accuracy: { score: 0, detail: {} },
        overall: 0,
      };
      try {
        const [scanRows, uniqRows] = await Promise.all([
          this.prisma.$queryRaw<QualityScanRow[]>`
            SELECT
              count(*)                                                                          AS total,
              count(*) FILTER (WHERE description IS NOT NULL AND btrim(description) <> '')       AS has_desc,
              count(*) FILTER (WHERE whatsapp    IS NOT NULL AND btrim(whatsapp)    <> '')       AS has_wa,
              count(*) FILTER (WHERE address     IS NOT NULL AND btrim(address)     <> '')       AS has_addr,
              count(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL)             AS has_geo,
              count(*) FILTER (WHERE
                    (facebook  IS NOT NULL AND btrim(facebook)  <> '')
                 OR (instagram IS NOT NULL AND btrim(instagram) <> '')
                 OR (tiktok    IS NOT NULL AND btrim(tiktok)    <> '')
                 OR (website   IS NOT NULL AND btrim(website)   <> ''))                          AS has_social,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM provider_images i     WHERE i."providerId" = p.id)) AS has_image,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM provider_categories c WHERE c."providerId" = p.id)) AS has_category,
              count(*) FILTER (WHERE
                    (latitude IS NOT NULL AND (latitude < -18.5 OR latitude > 0.5 OR longitude < -81.5 OR longitude > -68.5))
                 OR ("averageRating" < 0 OR "averageRating" > 5)
                 OR ("totalReviews" = 0 AND "averageRating" > 0))                                AS inconsistent,
              count(*) FILTER (WHERE
                    char_length(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')) < 6
                 OR (ruc IS NOT NULL AND btrim(ruc) <> '' AND char_length(regexp_replace(ruc, '[^0-9]', '', 'g')) <> 11)
                 OR (dni IS NOT NULL AND btrim(dni) <> '' AND char_length(regexp_replace(dni, '[^0-9]', '', 'g')) <> 8)) AS invalid,
              count(*) FILTER (WHERE "verificationStatus"::text = 'APROBADO')                    AS approved
            FROM providers p
          `,
          this.prisma.$queryRaw<UniquenessRow[]>`
            WITH norm AS (
              SELECT id, regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g') AS ph
              FROM providers
            )
            SELECT
              (SELECT count(*) FROM norm) AS total,
              coalesce((
                SELECT sum(cnt) FROM (
                  SELECT ph, count(*) AS cnt FROM norm
                  WHERE ph <> '' GROUP BY ph HAVING count(*) > 1
                ) d
              ), 0) AS dup_providers
          `,
        ]);

        const s = scanRows[0];
        const total = s ? Number(s.total) : 0;
        if (!s || total === 0) return empty;

        const filled = {
          descripcion: Number(s.has_desc),
          whatsapp: Number(s.has_wa),
          direccion: Number(s.has_addr),
          ubicacion: Number(s.has_geo),
          redes: Number(s.has_social),
          fotos: Number(s.has_image),
          categorias: Number(s.has_category),
        };
        const completenessScore = this.avgPct(Object.values(filled), total);

        const inconsistent = Number(s.inconsistent);
        const invalid = Number(s.invalid);
        const approved = Number(s.approved);
        const dup = uniqRows[0] ? Number(uniqRows[0].dup_providers) : 0;

        const dims = {
          completeness: {
            score: completenessScore,
            detail: { total, ...filled },
          },
          consistency: {
            score: this.rate(total - inconsistent, total),
            detail: { total, inconsistentes: inconsistent },
          },
          validity: {
            score: this.rate(total - invalid, total),
            detail: { total, invalidos: invalid },
          },
          uniqueness: {
            score: this.rate(total - dup, total),
            detail: { total, duplicados: dup },
          },
          accuracy: {
            score: this.rate(approved, total),
            detail: { total, verificados: approved },
          },
        };

        const overall = Math.round(
          (dims.completeness.score +
            dims.consistency.score +
            dims.validity.score +
            dims.uniqueness.score +
            dims.accuracy.score) /
            5,
        );

        return { sampleSize: total, ...dims, overall };
      } catch (e) {
        this.logger.warn(`getDataQuality falló: ${(e as Error)?.message ?? e}`);
        return empty;
      }
    });
  }

  // ── Patrones detectados (derivados de métricas reales) ─────────────
  async getPatterns(days = 30): Promise<InsightsPatternsDto> {
    const period = this.clampDays(days);
    const metrics = await this.getConversionMetrics(period);
    const patterns: string[] = [];

    // Patrón 1: plan → conversión.
    const premium = metrics.byPlan.find((b) => b.key === 'PREMIUM');
    const gratis = metrics.byPlan.find((b) => b.key === 'GRATIS');
    if (premium && gratis && premium.views > 0 && gratis.views > 0) {
      const diff = premium.conversionRate - gratis.conversionRate;
      if (Math.abs(diff) >= 1) {
        const verbo = diff >= 0 ? 'más' : 'menos';
        patterns.push(
          `Los proveedores PREMIUM convierten al ${premium.conversionRate}% ` +
            `frente al ${gratis.conversionRate}% del plan GRATIS ` +
            `(${Math.abs(diff)} puntos ${verbo}).`,
        );
      }
    }

    // Patrón 2: horas pico de conversión (con un mínimo de señal).
    const peaks = metrics.byHour
      .filter((h) => h.views >= 5)
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 2)
      .filter((h) => h.conversionRate > 0);
    if (peaks.length > 0) {
      const horas = peaks
        .map((h) => `${String(h.key).padStart(2, '0')}:00`)
        .join(' y ');
      patterns.push(`Las horas de mayor conversión son ${horas}.`);
    }

    // Patrón 3: mejor tasa de respuesta por plan.
    const bestResp = [...metrics.responseRateByPlan]
      .filter((r) => r.totalRooms >= 3)
      .sort((a, b) => b.responseRate - a.responseRate)[0];
    if (bestResp) {
      patterns.push(
        `El plan ${bestResp.plan} tiene la mejor tasa de respuesta en chat ` +
          `(${bestResp.responseRate}%).`,
      );
    }

    if (patterns.length === 0) {
      patterns.push(
        'Aún no hay suficientes datos en este período para detectar patrones ' +
          'estadísticamente útiles.',
      );
    }
    return { periodDays: period, patterns };
  }

  // ── Dashboard (KPIs de cabecera) ──────────────────────────────────
  async getDashboard(days = 30): Promise<InsightsDashboardDto> {
    const period = this.clampDays(days);
    const [
      metrics,
      quality,
      totalProviders,
      activeProviders,
      modelStatus,
      predictionsCount,
    ] = await Promise.all([
      this.getConversionMetrics(period),
      this.getDataQuality(),
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { isVisible: true } }),
      this.model.getModelStatus(),
      this.model.countPredictions(),
    ]);

    return {
      periodDays: period,
      totalProviders,
      activeProviders,
      views: metrics.general.views,
      contacts: metrics.general.contacts,
      conversionRate: metrics.general.conversionRate,
      chatRooms: metrics.general.chatRooms,
      dataQualityScore: quality.overall,
      modelVersion: modelStatus.version ?? null,
      modelAccuracy: modelStatus.metrics?.accuracy ?? null,
      predictionsCount,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  /** Envuelve un cómputo con caché de lectura; degrada si la caché falla. */
  private async cached<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      const hit = await this.cache.get<T>(key);
      if (hit !== undefined && hit !== null) return hit;
    } catch {
      /* caché caída → se recomputa */
    }
    const value = await fn();
    try {
      await this.cache.set(key, value, ttlMs);
    } catch {
      /* caché caída → no se cachea, sin romper */
    }
    return value;
  }

  private toBucket(
    key: string,
    views: bigint | number,
    contacts: bigint | number,
  ): ConversionBucket {
    const v = Number(views);
    const c = Number(contacts);
    return { key, views: v, contacts: c, conversionRate: this.rate(c, v) };
  }

  /** Rellena las 24 horas (0-23) con ceros donde no hubo eventos. */
  private fillHours(rows: HourCountRow[]): ConversionBucket[] {
    const map = new Map(rows.map((r) => [Number(r.hour), r]));
    return Array.from({ length: 24 }, (_, h) => {
      const r = map.get(h);
      return this.toBucket(String(h), r?.views ?? 0, r?.contacts ?? 0);
    });
  }

  private zeroHours(): ConversionBucket[] {
    return Array.from({ length: 24 }, (_, h) => ({
      key: String(h),
      views: 0,
      contacts: 0,
      conversionRate: 0,
    }));
  }

  /** Ordena buckets según el orden canónico de planes. */
  private orderByPlan<T>(
    items: T[],
    keyOf: (i: T) => string = (i) => (i as { key: string }).key,
  ): T[] {
    const rank = (k: string) => {
      const idx = (PLANS as readonly string[]).indexOf(k);
      return idx === -1 ? PLANS.length : idx;
    };
    return [...items].sort((a, b) => rank(keyOf(a)) - rank(keyOf(b)));
  }

  /** numerador / denominador * 100 redondeado; 0 si el denominador es 0. */
  private rate(num: number, den: number): number {
    return den > 0 ? Math.round((num / den) * 100) : 0;
  }

  /** Promedio de porcentajes filled[i]/total. */
  private avgPct(filled: number[], total: number): number {
    if (total === 0 || filled.length === 0) return 0;
    const sum = filled.reduce((acc, f) => acc + f / total, 0);
    return Math.round((sum / filled.length) * 100);
  }

  private clampDays(days: number): number {
    if (!Number.isFinite(days)) return 30;
    return Math.min(Math.max(Math.trunc(days), 1), 365);
  }

  private sinceDaysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * HOUR);
  }

  private conversionCaveats(): string[] {
    return [
      'Conversión = proxy contactos (clic a WhatsApp/llamada) sobre vistas; ' +
        'no existe un evento de contrato formal en el flujo activo.',
      'La tasa de respuesta se deriva del chat, cuyos mensajes se purgan a ' +
        'los 7 días: en ventanas largas puede quedar subestimada.',
    ];
  }
}
