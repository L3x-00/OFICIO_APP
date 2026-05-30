import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { AiAnalyticsService } from './ai-analytics.service.js';
import type {
  AiSecurityEventsDto,
  AiSummaryDto,
  AiTopQueryDto,
} from './ai-analytics.service.js';

/**
 * Panel de observabilidad de "Ofi" (Fase 8) — SOLO ADMIN.
 *
 * Aislado bajo /ai-assistant/analytics. Defensas: JwtAuthGuard +
 * RolesGuard con @Roles('ADMIN'). Todo es de SOLO lectura.
 */
@Controller('ai-assistant/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AiAnalyticsController {
  constructor(private readonly analytics: AiAnalyticsService) {}

  /** KPIs + timeline de uso. */
  @Get('summary')
  summary(): Promise<AiSummaryDto> {
    return this.analytics.getSummary();
  }

  /** Consultas más frecuentes. */
  @Get('top-queries')
  topQueries(@Query('limit') limit?: string): Promise<AiTopQueryDto[]> {
    const n = limit ? Number.parseInt(limit, 10) : 10;
    return this.analytics.getTopQueries(Number.isFinite(n) ? n : 10);
  }

  /** Eventos de seguridad: jailbreaks + errores Gemini/circuit breaker. */
  @Get('security-events')
  securityEvents(): Promise<AiSecurityEventsDto> {
    return this.analytics.getSecurityEvents();
  }
}
