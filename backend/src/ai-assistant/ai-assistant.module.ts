import { Module } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller.js';
import { AiAssistantService } from './ai-assistant.service.js';
import { AiCircuitBreakerService } from './ai-circuit-breaker.service.js';
import { AiSanitizerService } from './ai-sanitizer.service.js';
import { AiGuardrailsService } from './ai-guardrails.service.js';
import { AiFeatureFlagService } from './ai-feature-flag.service.js';
import { AiDataAccessService } from './ai-data-access.service.js';
import { AiKnowledgeService } from './ai-knowledge.service.js';
import { AiKnowledgeSeeder } from './ai-knowledge.seeder.js';
import { AiConversationService } from './ai-conversation.service.js';
import { AiQuotaService } from './ai-quota.service.js';
import { AiRetentionService } from './ai-retention.service.js';
import { AiAnalyticsController } from './ai-analytics.controller.js';
import { AiAnalyticsService } from './ai-analytics.service.js';
import { GuestStrategy } from './strategies/guest.strategy.js';
import { ClientStrategy } from './strategies/client.strategy.js';
import { ProviderStrategy } from './strategies/provider.strategy.js';
import { AdminStrategy } from './strategies/admin.strategy.js';
import { RolesGuard } from '../auth/roles.guard.js';

/**
 * Módulo "Ofi" — Asistente IA de Servi. 100% AISLADO (regla 5).
 *
 * Dependencias externas que consume (todas globales en la app):
 *   • ConfigService   (ConfigModule.forRoot isGlobal) — flags + API key.
 *   • CACHE_MANAGER   (CacheModule isGlobal) — circuit breaker + cuotas.
 *   • PrismaService   (PrismaModule @Global) — capa de datos.
 *   • ScheduleModule  (forRoot en app.module) — @Cron de retención.
 *   • JwtAuthGuard    — vía import directo en el controller.
 *
 * No exporta nada: ningún otro módulo depende de la IA. Si este módulo
 * se quita de app.module, Servi compila y funciona igual.
 */
@Module({
  controllers: [AiAssistantController, AiAnalyticsController],
  providers: [
    AiAssistantService,
    AiCircuitBreakerService,
    AiSanitizerService,
    AiGuardrailsService,
    AiFeatureFlagService,
    AiDataAccessService,
    AiKnowledgeService,
    AiKnowledgeSeeder,
    AiConversationService,
    AiQuotaService,
    AiRetentionService,
    AiAnalyticsService,
    // Estrategias de Contexto (persona) — inyectadas en AiAssistantService.
    GuestStrategy,
    ClientStrategy,
    ProviderStrategy,
    AdminStrategy,
    RolesGuard,
  ],
})
export class AiAssistantModule {}
