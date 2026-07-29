import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '../generated/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AiKnowledgeService } from './ai-knowledge.service.js';

interface PublishTemplate {
  knowledgeTopic: string;
  content: Record<string, string>;
}

/**
 * Publicación autónoma limitada a conocimiento Servi previamente aprobado.
 * No genera texto con IA, no procesa chats y jamás sobreescribe una KB creada
 * o editada por el equipo.
 */
@Injectable()
export class AiLearningPublisherService {
  private readonly logger = new Logger(AiLearningPublisherService.name);

  private static readonly TEMPLATES: Readonly<Record<string, PublishTemplate>> =
    {
      'intent:search': {
        knowledgeTopic: 'ofi_busqueda_proveedores',
        content: {
          resumen:
            'Ofi puede ayudarte a buscar proveedores activos por rubro y ubicación dentro de Servi.',
          sugerencia:
            'Indica el servicio que necesitas y, si la conoces, tu distrito o ciudad para afinar los resultados.',
        },
      },
    };

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: AiKnowledgeService,
  ) {}

  /** Corre una vez por hora después de que la cola interna se priorice. */
  @Cron('5 * * * *')
  async scheduledPublish(): Promise<void> {
    await this.publishApprovedTemplates();
  }

  /**
   * Publica solamente plantillas verificadas y marca el candidato terminado.
   * Un topic sin plantilla queda READY_FOR_REVIEW: nunca se inventa contenido.
   */
  async publishApprovedTemplates(): Promise<number> {
    try {
      const candidates = await this.prisma.aiLearningCandidate.findMany({
        where: { status: 'READY_FOR_REVIEW' },
        select: { id: true, topic: true },
        orderBy: { occurrences: 'desc' },
        take: 20,
      });
      let published = 0;

      for (const candidate of candidates) {
        const template = AiLearningPublisherService.TEMPLATES[candidate.topic];
        if (!template) continue;

        const existing = await this.prisma.aiKnowledgeEntry.findUnique({
          where: { topic: template.knowledgeTopic },
          select: { id: true },
        });
        if (!existing) {
          await this.prisma.aiKnowledgeEntry.create({
            data: {
              topic: template.knowledgeTopic,
              content: template.content as Prisma.InputJsonValue,
              version: 1,
              isActive: true,
            },
          });
        }
        await this.prisma.aiLearningCandidate.updateMany({
          where: { id: candidate.id, status: 'READY_FOR_REVIEW' },
          data: { status: 'PUBLISHED' },
        });
        published += 1;
      }

      if (published > 0) {
        await this.knowledge.invalidate();
        this.logger.log(
          `Cerebro Ofi: ${published} plantilla(s) aprobada(s) publicada(s)`,
        );
      }
      return published;
    } catch (e) {
      this.logger.warn(
        `publishApprovedTemplates falló: ${(e as Error)?.message ?? e}`,
      );
      return 0;
    }
  }
}
