import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RETENTION_DAYS } from './ai-assistant.constants.js';

/**
 * Política de retención de datos del asistente IA (Fase 4).
 *
 * Borra conversaciones (y sus mensajes en cascada) con más de
 * `RETENTION_DAYS` días. Corre cada día a las 03:00. Resiliente: un fallo
 * solo se loguea, no tumba el scheduler ni la app.
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
   * Elimina conversaciones IA > RETENTION_DAYS. El `onDelete: Cascade`
   * borra sus mensajes; además limpiamos mensajes huérfanos por defensa.
   *
   * @returns número de conversaciones purgadas.
   */
  async purgeOldConversations(): Promise<number> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    try {
      const res = await this.prisma.aiConversation.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      // Defensa: mensajes sueltos antiguos (no debería quedar ninguno).
      await this.prisma.aiMessage.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (res.count > 0) {
        this.logger.log(
          `Retención IA: ${res.count} conversaciones purgadas (> ${RETENTION_DAYS} días)`,
        );
      }
      return res.count;
    } catch (e) {
      this.logger.warn(
        `purgeOldConversations falló: ${(e as Error)?.message ?? e}`,
      );
      return 0;
    }
  }
}
