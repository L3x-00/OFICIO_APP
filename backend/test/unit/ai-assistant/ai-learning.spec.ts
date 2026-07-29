import { AiLearningService } from '../../../src/ai-assistant/ai-learning.service.js';

function makePrisma() {
  return {
    aiLearningCandidate: {
      upsert: jest.fn(async () => ({})),
    },
  } as any;
}

describe('AiLearningService', () => {
  it('acumula soporte sin guardar contenido ni identidad del chat', async () => {
    const prisma = makePrisma();
    const svc = new AiLearningService(prisma);

    await svc.record('support');

    expect(prisma.aiLearningCandidate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { topic: 'support' },
        create: expect.objectContaining({
          topic: 'support',
          intent: 'support',
          occurrences: 1,
          status: 'PENDING',
        }),
        update: expect.objectContaining({
          occurrences: { increment: 1 },
        }),
      }),
    );
  });

  it('agrupa una intención de Ofi en una clave canónica', async () => {
    const prisma = makePrisma();
    const svc = new AiLearningService(prisma);

    await svc.record('search');

    expect(prisma.aiLearningCandidate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { topic: 'intent:search' },
        create: expect.objectContaining({ intent: 'search' }),
      }),
    );
  });

  it('absorbe fallos de almacenamiento', async () => {
    const prisma = makePrisma();
    prisma.aiLearningCandidate.upsert.mockRejectedValueOnce(new Error('db down'));
    const svc = new AiLearningService(prisma);

    await expect(svc.record('faq')).resolves.toBeUndefined();
  });
});
