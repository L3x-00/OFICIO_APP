import {
  AiLearningReviewService,
  LEARNING_READY_THRESHOLD,
} from '../../../src/ai-assistant/ai-learning-review.service.js';

function makePrisma(count = 0) {
  return {
    aiLearningCandidate: {
      updateMany: jest.fn(async () => ({ count })),
    },
  } as any;
}

describe('AiLearningReviewService', () => {
  it('promueve solo candidatos frecuentes y pendientes', async () => {
    const prisma = makePrisma(2);
    const svc = new AiLearningReviewService(prisma);

    await expect(svc.promoteFrequentCandidates()).resolves.toBe(2);

    expect(prisma.aiLearningCandidate.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'PENDING',
        occurrences: { gte: LEARNING_READY_THRESHOLD },
      },
      data: { status: 'READY_FOR_REVIEW' },
    });
  });

  it('absorbe un fallo de base de datos', async () => {
    const prisma = makePrisma();
    prisma.aiLearningCandidate.updateMany.mockRejectedValueOnce(
      new Error('db down'),
    );
    const svc = new AiLearningReviewService(prisma);

    await expect(svc.promoteFrequentCandidates()).resolves.toBe(0);
  });
});
