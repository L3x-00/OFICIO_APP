import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Señal agregada para detectar qué capacidades de Ofi requieren revisión.
 * No admite texto del chat, identidad de usuario, IP ni historial.
 */
export type AiLearningIntent =
  | 'support'
  | 'faq'
  | 'search'
  | 'financial'
  | 'other';

/**
 * Cerebro global interno de Ofi.
 *
 * Solo acumula frecuencias por intención para priorizar futuras mejoras de la
 * KB. No cambia el prompt, personalidad ni conocimiento publicado por sí
 * mismo. Es best-effort: un error nunca afecta una respuesta del asistente.
 */
@Injectable()
export class AiLearningService {
  private readonly logger = new Logger(AiLearningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(intent: AiLearningIntent): Promise<void> {
    try {
      const topic = intent === 'support' ? 'support' : `intent:${intent}`;
      await this.prisma.aiLearningCandidate.upsert({
        where: { topic },
        create: {
          topic,
          intent,
          occurrences: 1,
          status: 'PENDING',
          lastSeenAt: new Date(),
        },
        update: {
          occurrences: { increment: 1 },
          lastSeenAt: new Date(),
        },
      });
    } catch (e) {
      this.logger.warn(`record falló: ${(e as Error)?.message ?? e}`);
    }
  }
}
