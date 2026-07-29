import { AiLearningPublisherService } from '../../../src/ai-assistant/ai-learning-publisher.service.js';

function makePrisma(candidates: Array<{ id: number; topic: string }> = []) {
  return {
    aiLearningCandidate: {
      findMany: jest.fn(async () => candidates),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    aiKnowledgeEntry: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => ({ id: 1 })),
    },
  } as any;
}

describe('AiLearningPublisherService', () => {
  it('publica solo plantilla de búsqueda aprobada y limpia cache KB', async () => {
    const prisma = makePrisma([{ id: 7, topic: 'intent:search' }]);
    const knowledge = { invalidate: jest.fn(async () => {}) } as any;
    const svc = new AiLearningPublisherService(prisma, knowledge);

    await expect(svc.publishApprovedTemplates()).resolves.toBe(1);

    expect(prisma.aiKnowledgeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ topic: 'ofi_busqueda_proveedores' }),
      }),
    );
    expect(prisma.aiLearningCandidate.updateMany).toHaveBeenCalledWith({
      where: { id: 7, status: 'READY_FOR_REVIEW' },
      data: { status: 'PUBLISHED' },
    });
    expect(knowledge.invalidate).toHaveBeenCalledTimes(1);
  });

  it('deja temas no aprobados en revisión sin escribir KB', async () => {
    const prisma = makePrisma([{ id: 8, topic: 'intent:financial' }]);
    const knowledge = { invalidate: jest.fn(async () => {}) } as any;
    const svc = new AiLearningPublisherService(prisma, knowledge);

    await expect(svc.publishApprovedTemplates()).resolves.toBe(0);

    expect(prisma.aiKnowledgeEntry.create).not.toHaveBeenCalled();
    expect(prisma.aiLearningCandidate.updateMany).not.toHaveBeenCalled();
    expect(knowledge.invalidate).not.toHaveBeenCalled();
  });

  it('absorbe fallos de lectura sin afectar Ofi', async () => {
    const prisma = makePrisma();
    prisma.aiLearningCandidate.findMany.mockRejectedValueOnce(
      new Error('db down'),
    );
    const svc = new AiLearningPublisherService(prisma, {
      invalidate: jest.fn(),
    } as any);

    await expect(svc.publishApprovedTemplates()).resolves.toBe(0);
  });
});
