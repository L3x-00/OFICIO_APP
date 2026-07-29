import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RETENTION_HOURS } from './ai-assistant.constants.js';

/**
 * Política de retención de datos del asistente IA.
 *
 * Retención a nivel de MENSAJE: borra cada `AiMessage` con más de
 * `RETENTION_HOURS` horas y, en segundo paso, EXPIRA las conversaciones que
 * quedaron vacías y antiguas. Corre cada 15 minutos. Resiliente: un fallo
 * solo se loguea, no tumba el scheduler ni la app.
 *
 * Por qué a nivel de mensaje y no de conversación: `getOrCreate` REUTILIZA una
 * sola conversación por usuario (su `createdAt` es la del primer chat). Borrar
 * por conversación arrasaría el historial RECIENTE de un usuario activo al
 * cumplirse el TTL. A nivel de mensaje, solo cae lo más antiguo y la
 * conversación activa sobrevive con sus mensajes recientes.
 *
 * NO depende del cliente móvil: la limpieza es 100% backend (scheduler).
 */
@Injectable()
export class AiRetentionService {
  private readonly logger = new Logger(AiRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Job cada 15 minutos. */
  @Cron('*/15 * * * *')
  async scheduledPurge(): Promise<void> {
    await this.purgeOldConversations();
  }

  /**
   * Purga la retención: (1) mensajes IA con > RETENTION_HOURS horas; (2)
   * conversaciones antiguas que quedaron SIN mensajes (expiradas). El paso 2
   * recoge tanto las conversaciones cuyos mensajes acaban de expirar como
   * cualquier "shell" huérfano sin mensajes.
   *
   * @returns total de filas purgadas (mensajes + conversaciones).
   */
  async purgeOldConversations(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);
    try {
      // 1) Mensajes individuales con más de RETENTION_HOURS horas.
      const messages = await this.prisma.aiMessage.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      // 2) Conversaciones antiguas que quedaron vacías → expiradas. La guarda
      //    `createdAt < cutoff` evita borrar conversaciones nuevas aún sin
      //    mensajes (creadas hace segundos por getOrCreate).
      const conversations = await this.prisma.aiConversation.deleteMany({
        where: { createdAt: { lt: cutoff }, messages: { none: {} } },
      });
      const memories = await this.prisma.aiUserMemory.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      if (messages.count > 0 || conversations.count > 0) {
        this.logger.log(
          `Retención IA: ${messages.count} mensajes y ${conversations.count} ` +
            `conversaciones purgadas (> ${RETENTION_HOURS} horas)`,
        );
      }
      return messages.count + conversations.count + memories.count;
    } catch (e) {
      this.logger.warn(
        `purgeOldConversations falló: ${(e as Error)?.message ?? e}`,
      );
      return 0;
    }
  }
}
