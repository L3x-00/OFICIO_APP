import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { AiInsightsService } from './ai-insights.service.js';
import { ConversionModelService } from './conversion-model.service.js';
import type {
  ConversionMetricsDto,
  DataQualityDto,
  InsightsDashboardDto,
  InsightsPatternsDto,
} from './ai-insights.service.js';
import type {
  ModelStatusDto,
  RecentPredictionDto,
  TrainResultDto,
} from './conversion-model.service.js';

/**
 * Analítica predictiva / de conversión para el panel Admin ("Usabilidad de
 * IA"). SOLO ADMIN y SOLO lectura. Aislado bajo /ai-insights; no toca ni
 * conoce el módulo de Ofi.
 */
@Controller('ai-insights')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AiInsightsController {
  constructor(
    private readonly insights: AiInsightsService,
    private readonly model: ConversionModelService,
  ) {}

  /** KPIs de cabecera del dashboard. */
  @Get('dashboard')
  dashboard(@Query('days') days?: string): Promise<InsightsDashboardDto> {
    return this.insights.getDashboard(this.parseDays(days));
  }

  /** Métricas de conversión: general + por plan + por hora + respuesta. */
  @Get('conversion')
  conversion(@Query('days') days?: string): Promise<ConversionMetricsDto> {
    return this.insights.getConversionMetrics(this.parseDays(days));
  }

  /** Calidad de datos de los perfiles de proveedor (5 dimensiones). */
  @Get('data-quality')
  dataQuality(): Promise<DataQualityDto> {
    return this.insights.getDataQuality();
  }

  /** Patrones detectados a partir de las métricas reales del período. */
  @Get('patterns')
  patterns(@Query('days') days?: string): Promise<InsightsPatternsDto> {
    return this.insights.getPatterns(this.parseDays(days));
  }

  /** Estado del modelo de conversión entrenado (versión + métricas). */
  @Get('model')
  model_(): Promise<ModelStatusDto> {
    return this.model.getModelStatus();
  }

  /** Últimas predicciones servidas (para el panel "en tiempo real"). */
  @Get('predictions/recent')
  recentPredictions(
    @Query('limit') limit?: string,
  ): Promise<RecentPredictionDto[]> {
    const n = limit ? Number.parseInt(limit, 10) : 10;
    return this.model.recentPredictions(Number.isFinite(n) ? n : 10);
  }

  /** Reentrena el modelo bajo demanda (además del cron nocturno). */
  @Post('train')
  train(): Promise<TrainResultDto> {
    return this.model.train();
  }

  private parseDays(raw?: string): number {
    const n = raw ? Number.parseInt(raw, 10) : 30;
    return Number.isFinite(n) ? n : 30;
  }
}
