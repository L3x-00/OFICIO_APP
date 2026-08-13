import { Module } from '@nestjs/common';
import { WhatsappAssistantController } from './whatsapp-assistant.controller.js';
import { WhatsappAssistantService } from './whatsapp-assistant.service.js';
import { WhatsappAssistantConfig } from './whatsapp-assistant.config.js';
import { WhatsappPolicyService } from './whatsapp-policy.service.js';
import { OpenWaClient } from './openwa.client.js';

/**
 * Integración WhatsApp ↔ OpenWA (F1). OFF por defecto
 * (`WHATSAPP_ASSISTANT_ENABLED=false`). 100% aislado: sólo depende de
 * PrismaService (global) y ConfigService (global). No importa ni usa
 * AiAssistantService — la política F1 es determinista, sin IA.
 *
 * Si se quita de AppModule, Servi compila y funciona igual.
 */
@Module({
  controllers: [WhatsappAssistantController],
  providers: [
    WhatsappAssistantService,
    WhatsappAssistantConfig,
    WhatsappPolicyService,
    OpenWaClient,
  ],
})
export class WhatsappAssistantModule {}
