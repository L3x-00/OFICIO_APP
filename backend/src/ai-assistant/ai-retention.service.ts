import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RETENTION_DAYS } from './ai-assistant.constants.js';

/**
 * Política de retención de datos del asistente IA.
 *
 * Retención a nivel de MENSAJE: borra cada `AiMessage` con más de
 * `RETENTION_DAYS` días y, en segundo paso, EXPIRA las conversaciones que
 * quedaron vacías y antiguas. Corre cada día a las 03:00. Resiliente: un fallo
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

  /** Job diario a las 03:00 (hora del servidor). */
  @Cron('0 3 * * *')
  async scheduledPurge(): Promise<void> {
    await this.purgeOldConversations();
  }

  /**
   * Purga la retención: (1) mensajes IA con > RETENTION_DAYS días; (2)
   * conversaciones antiguas que quedaron SIN mensajes (expiradas). El paso 2
   * recoge tanto las conversaciones cuyos mensajes acaban de expirar como
   * cualquier "shell" huérfano sin mensajes.
   *
   * @returns total de filas purgadas (mensajes + conversaciones).
   */
  async purgeOldConversations(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    try {
      // 1) Mensajes individuales con más de RETENTION_DAYS días.
      const messages = await this.prisma.aiMessage.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      // 2) Conversaciones antiguas que quedaron vacías → expiradas. La guarda
      //    `createdAt < cutoff` evita borrar conversaciones nuevas aún sin
      //    mensajes (creadas hace segundos por getOrCreate).
      const conversations = await this.prisma.aiConversation.deleteMany({
        where: { createdAt: { lt: cutoff }, messages: { none: {} } },
      });

      if (messages.count > 0 || conversations.count > 0) {
        this.logger.log(
          `Retención IA: ${messages.count} mensajes y ${conversations.count} ` +
            `conversaciones purgadas (> ${RETENTION_DAYS} días)`,
        );
      }
      return messages.count + conversations.count;
    } catch (e) {
      this.logger.warn(
        `purgeOldConversations falló: ${(e as Error)?.message ?? e}`,
      );
      return 0;
    }
  }
}
