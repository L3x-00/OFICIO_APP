import { Module } from '@nestjs/common';
import { WhatsappAssistantController } from './whatsapp-assistant.controller.js';
import { WhatsappAssistantService } from './whatsapp-assistant.service.js';
import { WhatsappAssistantConfig } from './whatsapp-assistant.config.js';
import { WhatsappPolicyService } from './whatsapp-policy.service.js';
import { WhatsappAiService } from './whatsapp-ai.service.js';
import { WhatsappLinkService } from './whatsapp-link.service.js';
import { WhatsappOperationsController } from './whatsapp-operations.controller.js';
import { WhatsappOperationsService } from './whatsapp-operations.service.js';
import { OpenWaClient } from './openwa.client.js';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * Integración WhatsApp ↔ OpenWA. OFF por defecto
 * (`WHATSAPP_ASSISTANT_ENABLED=false`). Depende de PrismaService (global),
 * ConfigService (global) y —desde F2— de AiAssistantModule para reusar "Ofi"
 * en modo SOLO LECTURA (`chatPublicReadOnly`, persona PUBLIC) como fallback de
 * la política determinista. Ese reuso vive detrás de su propio flag
 * (`WHATSAPP_ASSISTANT_AI_ENABLED`, default false) y la dependencia es
 * unidireccional: la IA no sabe nada de WhatsApp.
 *
 * Si se quita de AppModule, Servi compila y funciona igual.
 */
@Module({
  imports: [AiAssistantModule, AuthModule],
  controllers: [WhatsappAssistantController, WhatsappOperationsController],
  providers: [
    WhatsappAssistantService,
    WhatsappAssistantConfig,
    WhatsappPolicyService,
    WhatsappAiService,
    WhatsappLinkService,
    WhatsappOperationsService,
    OpenWaClient,
  ],
})
export class WhatsappAssistantModule {}
