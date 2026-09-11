import { Module } from '@nestjs/common';
import { AiInsightsController } from './ai-insights.controller.js';
import { PredictController } from './predict.controller.js';
import { RecommendationsController } from './recommendations.controller.js';
import { AiInsightsService } from './ai-insights.service.js';
import { ConversionModelService } from './conversion-model.service.js';
import { RolesGuard } from '../auth/roles.guard.js';

/**
 * Módulo de Analítica Predictiva / de Conversión ("Usabilidad de IA" del
 * panel Admin). 100% AISLADO y ADITIVO:
 *   • SOLO lectura sobre tablas ya existentes (provider_analytics,
 *     subscriptions, chat_*, providers) + escritura acotada a sus 2 tablas
 *     propias (ai_conversion_models / ai_conversion_predictions).
 *   • Depende solo de globales: PrismaService (@Global), CACHE_MANAGER
 *     (CacheModule isGlobal) y ScheduleModule (@Cron). Provee RolesGuard.
 *   • Si se quita de app.module, el resto de Servi compila y funciona igual.
 *
 * El modelo predictivo (ConversionModelService) es regresión logística en
 * TypeScript nativo — sin Python ni scikit-learn.
 */
@Module({
  controllers: [
    AiInsightsController,
    PredictController,
    RecommendationsController,
  ],
  providers: [AiInsightsService, ConversionModelService, RolesGuard],
  exports: [AiInsightsService, ConversionModelService],
})
export class AiInsightsModule {}
