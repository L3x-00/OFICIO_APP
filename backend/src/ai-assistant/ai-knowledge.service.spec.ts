import {
  AiKnowledgeService,
  MAX_KNOWLEDGE_CONTEXT_CHARS,
  MAX_KNOWLEDGE_ENTRIES,
} from './ai-knowledge.service.js';

describe('AiKnowledgeService', () => {
  it('acota el contexto dinámico y lo etiqueta como datos', async () => {
    const entries = Array.from(
      { length: MAX_KNOWLEDGE_ENTRIES + 5 },
      (_, i) => ({
        topic: `tema ${i}`,
        content: 'x'.repeat(1_000),
      }),
    );
    const prisma = {
      aiKnowledgeEntry: { findMany: jest.fn().mockResolvedValue(entries) },
    };
    const cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
    };
    const service = new AiKnowledgeService(prisma as any, cache as any);

    const context = await service.getKnowledgeContext();

    expect(prisma.aiKnowledgeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: MAX_KNOWLEDGE_ENTRIES }),
    );
    expect(context.length).toBeLessThanOrEqual(MAX_KNOWLEDGE_CONTEXT_CHARS);
    expect(context).toContain('Tema: tema 0');
    expect(context).toContain('Datos:');
  });
});
