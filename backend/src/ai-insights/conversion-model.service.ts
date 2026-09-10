import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  crossValidate,
  fitModel,
  probaRaw,
  type CrossValMetrics,
  type LogisticWeights,
  type Standardizer,
} from './conversion-model.math.js';

// ── Contrato de features (orden FIJO — el índice mapea a los pesos) ──
export const FEATURE_NAMES = [
  'rating',
  'reviewsLog',
  'planRank',
  'completeness',
  'responseRate',
  'hasPayments',
] as const;

/** Features nombradas de un proveedor (entrada humana / salida legible). */
export interface NamedFeatures {
  rating: number;
  reviews: number;
  plan: string;
  completeness: number;
  responseRate: number;
  hasPayments: number;
}

export interface PredictionResultDto {
  /** Probabilidad de conversión 0-100. */
  probability: number;
  /** 'alta' | 'media' | 'baja' | 'sin_modelo'. */
  label: string;
  modelVersion: string | null;
  features: NamedFeatures | null;
}

export interface TrainResultDto {
  trained: boolean;
  version: string | null;
  metrics: CrossValMetrics | null;
  reason?: string;
}

export interface ModelStatusDto {
  trained: boolean;
  version?: string;
  algorithm?: string;
  featureNames?: string[];
  metrics?: CrossValMetrics;
  trainedAt?: Date;
}

export interface RecentPredictionDto {
  id: number;
  providerId: number | null;
  modelVersion: string;
  probability: number;
  label: string;
  createdAt: Date;
}

// ── Filas crudas ────────────────────────────────────────────────────
interface FeatureRow {
  id: number;
  rating: number | null;
  reviews: bigint | number | null;
  plan: string | null;
  completeness: number | null;
  views: bigint | number | null;
  contacts: bigint | number | null;
  response_rate: number | null;
  has_payments: number | null;
}
interface ModelRow {
  version: string;
  algorithm: string;
  featureNames: string[];
  weights: number[];
  bias: number;
  featureMeans: number[];
  featureStds: number[];
  metrics: CrossValMetrics;
  trainedAt: Date;
}

const WINDOW_DAYS = 90;
const PREDICTIONS_KEEP = 1000;
const MIN_SAMPLES = 8;

/**
 * Modelo predictivo de conversión ("Super Ofi", sub-fase 2). Regresión
 * logística ENTRENADA EN TYPESCRIPT (sin Python/scikit-learn) sobre datos
 * históricos reales de Supabase.
 *
 * Objetivo (variable dependiente): dado que un proveedor tuvo exposición
 * (≥1 vista) en la ventana, ¿recibió al menos un contacto? = proxy de
 * conversión (no existe evento de contrato en el flujo activo).
 *
 * Predictoras: rating, log(reseñas), plan, completitud de perfil, tasa de
 * respuesta en chat y si tiene pagos. La distancia se incorpora en la
 * sub-fase 3 (requiere el tracking de ubicación del cliente).
 *
 * Persistencia por SQL crudo en `ai_conversion_models` (snapshot del modelo)
 * y `ai_conversion_predictions` (log acotado a las últimas 1000). El cliente
 * Prisma se regenera en CI, por eso NO se depende de sus métodos tipados aquí.
 */
@Injectable()
export class ConversionModelService {
  private readonly logger = new Logger(ConversionModelService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Entrenamiento ─────────────────────────────────────────────────
  async train(): Promise<TrainResultDto> {
    try {
      const rows = await this.fetchTrainingRows();
      if (rows.length < MIN_SAMPLES) {
        return {
          trained: false,
          version: null,
          metrics: null,
          reason: `Datos insuficientes para entrenar (${rows.length} < ${MIN_SAMPLES} proveedores con exposición).`,
        };
      }

      const X = rows.map((r) => this.rowToVector(r));
      const y = rows.map((r) => (Number(r.contacts ?? 0) > 0 ? 1 : 0));

      const metrics = crossValidate(X, y, 5);
      const { weights, standardizer } = fitModel(X, y);
      const version = `lr-${new Date().toISOString()}`;

      await this.saveModel(version, weights, standardizer, metrics);
      this.logger.log(
        `Modelo entrenado ${version}: n=${metrics.sampleSize}, acc=${metrics.accuracy}, auc=${metrics.auc}`,
      );
      return { trained: true, version, metrics };
    } catch (e) {
      this.logger.warn(`train falló: ${(e as Error)?.message ?? e}`);
      return {
        trained: false,
        version: null,
        metrics: null,
        reason: 'Error durante el entrenamiento.',
      };
    }
  }

  // ── Predicción ────────────────────────────────────────────────────
  async predict(input: {
    providerId?: number;
    features?: Partial<NamedFeatures>;
  }): Promise<PredictionResultDto> {
    let model = await this.loadLatestModel();
    if (!model) {
      // Intento perezoso de entrenar una sola vez.
      await this.train();
      model = await this.loadLatestModel();
    }

    const named = await this.resolveFeatures(input);
    if (!model) {
      return {
        probability: 0,
        label: 'sin_modelo',
        modelVersion: null,
        features: named,
      };
    }

    const vector = this.namedToVector(named);
    const std: Standardizer = {
      means: model.featureMeans,
      stds: model.featureStds,
    };
    const weights: LogisticWeights = {
      weights: model.weights,
      bias: model.bias,
    };
    const probability = Math.round(probaRaw(vector, weights, std) * 100);
    const label =
      probability >= 66 ? 'alta' : probability >= 33 ? 'media' : 'baja';

    await this.logPrediction(
      input.providerId ?? null,
      model.version,
      probability,
      label,
      named,
    );

    return { probability, label, modelVersion: model.version, features: named };
  }

  // ── Estado / historial ────────────────────────────────────────────
  async getModelStatus(): Promise<ModelStatusDto> {
    const model = await this.loadLatestModel();
    if (!model) return { trained: false };
    return {
      trained: true,
      version: model.version,
      algorithm: model.algorithm,
      featureNames: model.featureNames,
      metrics: model.metrics,
      trainedAt: model.trainedAt,
    };
  }

  async recentPredictions(limit = 10): Promise<RecentPredictionDto[]> {
    const take = Math.min(Math.max(limit, 1), 100);
    try {
      const rows = await this.prisma.$queryRaw<RecentPredictionDto[]>`
        SELECT id, "providerId", "modelVersion", probability, label, "createdAt"
        FROM ai_conversion_predictions
        ORDER BY "createdAt" DESC, id DESC
        LIMIT ${take}
      `;
      return rows.map((r) => ({
        id: Number(r.id),
        providerId: r.providerId == null ? null : Number(r.providerId),
        modelVersion: r.modelVersion,
        probability: Number(r.probability),
        label: r.label,
        createdAt: r.createdAt,
      }));
    } catch (e) {
      this.logger.warn(
        `recentPredictions falló: ${(e as Error)?.message ?? e}`,
      );
      return [];
    }
  }

  async countPredictions(): Promise<number> {
    try {
      const rows = await this.prisma.$queryRaw<
        Array<{ count: bigint | number }>
      >`
        SELECT count(*) AS count FROM ai_conversion_predictions
      `;
      return rows[0] ? Number(rows[0].count) : 0;
    } catch (e) {
      this.logger.warn(`countPredictions falló: ${(e as Error)?.message ?? e}`);
      return 0;
    }
  }

  // ── Cron: reentrena de madrugada (Perú) y poda el log ─────────────
  // 08:00 UTC = 03:00 Perú (baja carga). Best-effort: si falla, se loguea.
  @Cron('0 8 * * *')
  async scheduledRetrain(): Promise<void> {
    this.logger.log('Reentrenamiento nocturno del modelo de conversión…');
    await this.train();
    await this.prunePredictions();
  }

  async prunePredictions(): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM ai_conversion_predictions
        WHERE id NOT IN (
          SELECT id FROM ai_conversion_predictions
          ORDER BY "createdAt" DESC, id DESC
          LIMIT ${PREDICTIONS_KEEP}
        )
      `;
    } catch (e) {
      this.logger.warn(`prunePredictions falló: ${(e as Error)?.message ?? e}`);
    }
  }

  // ── Helpers de datos ──────────────────────────────────────────────

  private windowStart(): Date {
    return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  }

  /** Proveedores con exposición (≥1 vista) en la ventana → set de entrenamiento. */
  private async fetchTrainingRows(): Promise<FeatureRow[]> {
    const since = this.windowStart();
    return this.prisma.$queryRaw<FeatureRow[]>`
      WITH agg AS (
        SELECT a."providerId" AS pid,
          count(*) FILTER (WHERE a."eventType"::text = 'view')                           AS views,
          count(*) FILTER (WHERE a."eventType"::text IN ('whatsapp_click','call_click')) AS contacts
        FROM provider_analytics a
        WHERE a."createdAt" >= ${since}
        GROUP BY a."providerId"
      ),
      resp AS (
        SELECT r."providerId" AS pid,
          count(DISTINCT r.id)                                 AS rooms,
          count(DISTINCT r.id) FILTER (WHERE m.id IS NOT NULL) AS replied
        FROM chat_rooms r
        JOIN providers pp ON pp.id = r."providerId"
        LEFT JOIN chat_messages m ON m."chatRoomId" = r.id AND m."senderId" = pp."userId"
        GROUP BY r."providerId"
      )
      SELECT p.id,
        p."averageRating" AS rating,
        p."totalReviews"  AS reviews,
        coalesce(s.plan::text, 'GRATIS') AS plan,
        (   (CASE WHEN p.description IS NOT NULL AND btrim(p.description) <> '' THEN 1 ELSE 0 END)
          + (CASE WHEN p.whatsapp    IS NOT NULL AND btrim(p.whatsapp)    <> '' THEN 1 ELSE 0 END)
          + (CASE WHEN p.address      IS NOT NULL AND btrim(p.address)     <> '' THEN 1 ELSE 0 END)
          + (CASE WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN EXISTS (SELECT 1 FROM provider_images i WHERE i."providerId" = p.id) THEN 1 ELSE 0 END)
        )::float / 5.0 AS completeness,
        coalesce(agg.views, 0)    AS views,
        coalesce(agg.contacts, 0) AS contacts,
        coalesce(resp.replied::float / NULLIF(resp.rooms, 0), 0) AS response_rate,
        (CASE WHEN EXISTS (
           SELECT 1 FROM subscriptions s2
           JOIN payments pay ON pay."subscriptionId" = s2.id
           WHERE s2."providerId" = p.id) THEN 1 ELSE 0 END) AS has_payments
      FROM providers p
      LEFT JOIN subscriptions s ON s."providerId" = p.id
      LEFT JOIN agg  ON agg.pid  = p.id
      LEFT JOIN resp ON resp.pid = p.id
      WHERE coalesce(agg.views, 0) > 0
    `;
  }

  /**
   * Features de UN proveedor para predecir (sin filtro de exposición: se
   * puede pedir la probabilidad de un proveedor con pocas vistas).
   */
  private async fetchProviderRow(
    providerId: number,
  ): Promise<FeatureRow | null> {
    const since = this.windowStart();
    const rows = await this.prisma.$queryRaw<FeatureRow[]>`
      WITH agg AS (
        SELECT a."providerId" AS pid,
          count(*) FILTER (WHERE a."eventType"::text = 'view')                           AS views,
          count(*) FILTER (WHERE a."eventType"::text IN ('whatsapp_click','call_click')) AS contacts
        FROM provider_analytics a
        WHERE a."createdAt" >= ${since} AND a."providerId" = ${providerId}
        GROUP BY a."providerId"
      ),
      resp AS (
        SELECT r."providerId" AS pid,
          count(DISTINCT r.id)                                 AS rooms,
          count(DISTINCT r.id) FILTER (WHERE m.id IS NOT NULL) AS replied
        FROM chat_rooms r
        JOIN providers pp ON pp.id = r."providerId"
        LEFT JOIN chat_messages m ON m."chatRoomId" = r.id AND m."senderId" = pp."userId"
        WHERE r."providerId" = ${providerId}
        GROUP BY r."providerId"
      )
      SELECT p.id,
        p."averageRating" AS rating,
        p."totalReviews"  AS reviews,
        coalesce(s.plan::text, 'GRATIS') AS plan,
        (   (CASE WHEN p.description IS NOT NULL AND btrim(p.description) <> '' THEN 1 ELSE 0 END)
          + (CASE WHEN p.whatsapp    IS NOT NULL AND btrim(p.whatsapp)    <> '' THEN 1 ELSE 0 END)
          + (CASE WHEN p.address      IS NOT NULL AND btrim(p.address)     <> '' THEN 1 ELSE 0 END)
          + (CASE WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN EXISTS (SELECT 1 FROM provider_images i WHERE i."providerId" = p.id) THEN 1 ELSE 0 END)
        )::float / 5.0 AS completeness,
        coalesce(agg.views, 0)    AS views,
        coalesce(agg.contacts, 0) AS contacts,
        coalesce(resp.replied::float / NULLIF(resp.rooms, 0), 0) AS response_rate,
        (CASE WHEN EXISTS (
           SELECT 1 FROM subscriptions s2
           JOIN payments pay ON pay."subscriptionId" = s2.id
           WHERE s2."providerId" = p.id) THEN 1 ELSE 0 END) AS has_payments
      FROM providers p
      LEFT JOIN subscriptions s ON s."providerId" = p.id
      LEFT JOIN agg  ON agg.pid  = p.id
      LEFT JOIN resp ON resp.pid = p.id
      WHERE p.id = ${providerId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  private rowToVector(r: FeatureRow): number[] {
    return this.namedToVector(this.rowToNamed(r));
  }

  private rowToNamed(r: FeatureRow): NamedFeatures {
    return {
      rating: Number(r.rating ?? 0),
      reviews: Number(r.reviews ?? 0),
      plan: r.plan ?? 'GRATIS',
      completeness: Number(r.completeness ?? 0),
      responseRate: Number(r.response_rate ?? 0),
      hasPayments: Number(r.has_payments ?? 0),
    };
  }

  private namedToVector(f: NamedFeatures): number[] {
    return [
      f.rating,
      Math.log(1 + Math.max(0, f.reviews)),
      this.planRank(f.plan),
      f.completeness,
      f.responseRate,
      f.hasPayments ? 1 : 0,
    ];
  }

  private planRank(plan: string): number {
    return plan === 'PREMIUM' ? 2 : plan === 'ESTANDAR' ? 1 : 0;
  }

  /** Resuelve features: de un providerId (BD) o de un override manual. */
  private async resolveFeatures(input: {
    providerId?: number;
    features?: Partial<NamedFeatures>;
  }): Promise<NamedFeatures> {
    if (input.providerId != null) {
      const row = await this.fetchProviderRow(input.providerId);
      if (!row) throw new NotFoundException('Proveedor no encontrado');
      return this.rowToNamed(row);
    }
    const f = input.features ?? {};
    return {
      rating: Number(f.rating ?? 0),
      reviews: Number(f.reviews ?? 0),
      plan: f.plan ?? 'GRATIS',
      completeness: Number(f.completeness ?? 0),
      responseRate: Number(f.responseRate ?? 0),
      hasPayments: Number(f.hasPayments ?? 0),
    };
  }

  // ── Persistencia (SQL crudo) ──────────────────────────────────────

  private async saveModel(
    version: string,
    weights: LogisticWeights,
    std: Standardizer,
    metrics: CrossValMetrics,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO ai_conversion_models
        (version, algorithm, "featureNames", weights, bias, "featureMeans", "featureStds", metrics, "trainedAt")
      VALUES (
        ${version}, 'logistic_regression',
        ${JSON.stringify(FEATURE_NAMES)}::jsonb,
        ${JSON.stringify(weights.weights)}::jsonb,
        ${weights.bias},
        ${JSON.stringify(std.means)}::jsonb,
        ${JSON.stringify(std.stds)}::jsonb,
        ${JSON.stringify(metrics)}::jsonb,
        now()
      )
    `;
  }

  private async loadLatestModel(): Promise<ModelRow | null> {
    try {
      const rows = await this.prisma.$queryRaw<ModelRow[]>`
        SELECT version, algorithm, "featureNames", weights, bias,
               "featureMeans", "featureStds", metrics, "trainedAt"
        FROM ai_conversion_models
        ORDER BY "trainedAt" DESC, id DESC
        LIMIT 1
      `;
      return rows[0] ?? null;
    } catch (e) {
      this.logger.warn(`loadLatestModel falló: ${(e as Error)?.message ?? e}`);
      return null;
    }
  }

  private async logPrediction(
    providerId: number | null,
    version: string,
    probability: number,
    label: string,
    features: NamedFeatures,
  ): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO ai_conversion_predictions
          ("providerId", "modelVersion", probability, label, features, "createdAt")
        VALUES (
          ${providerId}, ${version}, ${probability}, ${label},
          ${JSON.stringify(features)}::jsonb, now()
        )
      `;
    } catch (e) {
      this.logger.warn(`logPrediction falló: ${(e as Error)?.message ?? e}`);
    }
  }
}
