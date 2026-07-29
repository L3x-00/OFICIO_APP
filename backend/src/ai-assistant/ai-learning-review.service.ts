import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Frecuencia mínima antes de priorizar una mejora de Ofi. */
export const LEARNING_READY_THRESHOLD = 20;

/**
 * Priorización autónoma del cerebro global de Ofi.
 *
 * Solo mueve señales agregadas frecuentes a una cola interna. Nunca publica
 * texto en la KB, altera personalidad ni usa contenido de conversaciones.
 */
@Injectable()
export class AiLearningReviewService {
  private readonly logger = new Logger(AiLearningReviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Corre cada 30 minutos; seguro repetirlo. */
  @Cron('*/30 * * * *')
  async scheduledPromotion(): Promise<void> {
    await this.promoteFrequentCandidates();
  }

  /**
   * Promueve candidatos PENDING frecuentes a READY_FOR_REVIEW.
   * `updateMany` evita carreras: una vez promovidos, no vuelven a contarse.
   */
  async promoteFrequentCandidates(): Promise<number> {
    try {
      const result = await this.prisma.aiLearningCandidate.updateMany({
        where: {
          status: 'PENDING',
          occurrences: { gte: LEARNING_READY_THRESHOLD },
        },
        data: { status: 'READY_FOR_REVIEW' },
      });
      if (result.count > 0) {
        this.logger.log(
          `Cerebro Ofi: ${result.count} candidato(s) listo(s) para revisión`,
        );
      }
      return result.count;
    } catch (e) {
      this.logger.warn(
        `promoteFrequentCandidates falló: ${(e as Error)?.message ?? e}`,
      );
      return 0;
    }
  }
}
