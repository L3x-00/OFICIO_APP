import { Module } from '@nestjs/common';
import { AiInsightsController } from './ai-insights.controller.js';
import { AiInsightsService } from './ai-insights.service.js';
import { RolesGuard } from '../auth/roles.guard.js';

/**
 * Módulo de Analítica Predictiva / de Conversión ("Usabilidad de IA" del
 * panel Admin). 100% AISLADO y ADITIVO:
 *   • SOLO lectura sobre tablas ya existentes (provider_analytics,
 *     subscriptions, chat_*, providers). No crea ni muta datos.
 *   • Depende solo de globales: PrismaService (@Global) y CACHE_MANAGER
 *     (CacheModule isGlobal). Provee RolesGuard para el guard admin-only.
 *   • Si se quita de app.module, el resto de Servi compila y funciona igual.
 *
 * Sub-fases posteriores añaden aquí el modelo predictivo (POST /predict/
 * conversion) y la conversión por distancia.
 */
@Module({
  controllers: [AiInsightsController],
  providers: [AiInsightsService, RolesGuard],
  exports: [AiInsightsService],
})
export class AiInsightsModule {}
