import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { AiInsightsService } from './ai-insights.service.js';
import type {
  ConversionMetricsDto,
  DataQualityDto,
  InsightsDashboardDto,
  InsightsPatternsDto,
} from './ai-insights.service.js';

/**
 * Analítica predictiva / de conversión para el panel Admin ("Usabilidad de
 * IA"). SOLO ADMIN y SOLO lectura. Aislado bajo /ai-insights; no toca ni
 * conoce el módulo de Ofi.
 */
@Controller('ai-insights')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AiInsightsController {
  constructor(private readonly insights: AiInsightsService) {}

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

  private parseDays(raw?: string): number {
    const n = raw ? Number.parseInt(raw, 10) : 30;
    return Number.isFinite(n) ? n : 30;
  }
}
