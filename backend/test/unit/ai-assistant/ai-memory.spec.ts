/**
 * UNIT — AiMemoryService (memoria persistente por usuario/proveedor).
 *
 *   • getUserMemoryBlock: combina ubicación (User) + favoritos + rubros (memoria).
 *   • getProviderMemoryBlock: rubros principales + snapshot de métricas.
 *   • recordTurn: upsert con fusión acotada (dedup case-insensitive + cap).
 *   • refreshProviderMemory: upsert desde el perfil.
 *   • Best-effort: userId inválido → '' / no-op.
 */
import { AiMemoryService } from '../../../src/ai-assistant/ai-memory.service.js';

function makePrisma(over: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: jest.fn(async () => ({
        province: 'Huancayo',
        district: 'El Tambo',
      })),
    },
    aiUserMemory: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async () => ({})),
    },
    favorite: { count: jest.fn(async () => 2) },
    provider: { findFirst: jest.fn(async () => ({ id: 10 })) },
    aiProviderMemory: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async () => ({})),
    },
    ...over,
  } as any;
}

describe('AiMemoryService', () => {
  describe('getUserMemoryBlock', () => {
    it('combina ubicación + rubros + favoritos en un bloque compacto', async () => {
      const prisma = makePrisma({
        aiUserMemory: {
          findUnique: jest.fn(async () => ({
            searchCategories: ['electricista', 'gasfitero'],
            recentProviderIds: [1],
            lastIntent: 'search',
          })),
          upsert: jest.fn(),
        },
      });
      const svc = new AiMemoryService(prisma);

      const block = await svc.getUserMemoryBlock(7);

      expect(block).toContain('Ubicación habitual: El Tambo, Huancayo');
      expect(block).toContain('Rubros que suele buscar: electricista, gasfitero');
      expect(block).toContain('2 proveedor(es) en favoritos');
    });

    it('sin datos útiles → cadena vacía', async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn(async () => ({ province: null, district: null })) },
        aiUserMemory: { findUnique: jest.fn(async () => null), upsert: jest.fn() },
        favorite: { count: jest.fn(async () => 0) },
      });
      const svc = new AiMemoryService(prisma);

      expect(await svc.getUserMemoryBlock(7)).toBe('');
    });

    it('userId inválido → vacío sin tocar la BD', async () => {
      const prisma = makePrisma();
      const svc = new AiMemoryService(prisma);

      expect(await svc.getUserMemoryBlock(0)).toBe('');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getProviderMemoryBlock', () => {
    it('formatea rubros + métricas del proveedor', async () => {
      const prisma = makePrisma({
        aiProviderMemory: {
          findUnique: jest.fn(async () => ({
            mainCategories: ['Gasfitería'],
            metricsSnapshot: { rating: 4.8, reviews: 12, plan: 'PREMIUM' },
          })),
          upsert: jest.fn(),
        },
      });
      const svc = new AiMemoryService(prisma);

      const block = await svc.getProviderMemoryBlock(7);

      expect(block).toContain('Rubros principales: Gasfitería');
      expect(block).toContain('⭐ 4.8');
      expect(block).toContain('12 reseñas');
      expect(block).toContain('plan PREMIUM');
    });

    it('sin perfil de proveedor → vacío', async () => {
      const prisma = makePrisma({
        provider: { findFirst: jest.fn(async () => null) },
      });
      const svc = new AiMemoryService(prisma);

      expect(await svc.getProviderMemoryBlock(7)).toBe('');
    });
  });

  describe('recordTurn', () => {
    it('crea memoria nueva con las señales del turno', async () => {
      const prisma = makePrisma();
      const svc = new AiMemoryService(prisma);

      await svc.recordTurn(7, {
        intent: 'search',
        categories: ['electricista'],
        providerIds: [1, 2],
      });

      const arg = prisma.aiUserMemory.upsert.mock.calls[0][0];
      expect(arg.where).toEqual({ userId: 7 });
      expect(arg.create.searchCategories).toEqual(['electricista']);
      expect(arg.create.recentProviderIds).toEqual([1, 2]);
      expect(arg.create.lastIntent).toBe('search');
    });

    it('fusiona con lo existente, dedup case-insensitive y cap (más reciente primero)', async () => {
      const prisma = makePrisma({
        aiUserMemory: {
          findUnique: jest.fn(async () => ({
            searchCategories: ['a', 'b', 'c', 'd', 'e'],
            recentProviderIds: [1, 2],
            lastIntent: 'faq',
          })),
          upsert: jest.fn(async () => ({})),
        },
      });
      const svc = new AiMemoryService(prisma);

      await svc.recordTurn(7, { categories: ['NEW', 'A'], providerIds: [9, 1] });

      const arg = prisma.aiUserMemory.upsert.mock.calls[0][0];
      // 'A' (del turno) desplaza a 'a' existente (recent-first); cap 5.
      expect(arg.update.searchCategories).toEqual(['NEW', 'A', 'b', 'c', 'd']);
      // providers: 9 nuevo al frente, dedup 1.
      expect(arg.update.recentProviderIds).toEqual([9, 1, 2]);
    });

    it('sin señales → no escribe', async () => {
      const prisma = makePrisma();
      const svc = new AiMemoryService(prisma);

      await svc.recordTurn(7, {});

      expect(prisma.aiUserMemory.upsert).not.toHaveBeenCalled();
    });

    it('userId inválido → no escribe', async () => {
      const prisma = makePrisma();
      const svc = new AiMemoryService(prisma);

      await svc.recordTurn(-1, { intent: 'search', categories: ['x'] });

      expect(prisma.aiUserMemory.upsert).not.toHaveBeenCalled();
    });
  });

  describe('refreshProviderMemory', () => {
    it('upsert desde el perfil (rubros + snapshot)', async () => {
      const prisma = makePrisma({
        provider: {
          findFirst: jest.fn(async () => ({
            id: 10,
            averageRating: 4.5,
            totalReviews: 8,
            subscription: { plan: 'ESTANDAR' },
            providerCategories: [
              { category: { name: 'Gasfitería' } },
              { category: { name: 'Electricidad' } },
            ],
          })),
        },
      });
      const svc = new AiMemoryService(prisma);

      await svc.refreshProviderMemory(7);

      const arg = prisma.aiProviderMemory.upsert.mock.calls[0][0];
      expect(arg.where).toEqual({ providerId: 10 });
      expect(arg.create.mainCategories).toEqual(['Gasfitería', 'Electricidad']);
      expect(arg.create.metricsSnapshot).toEqual({
        rating: 4.5,
        reviews: 8,
        plan: 'ESTANDAR',
      });
    });
  });

  it('resiliente: si Prisma falla, getUserMemoryBlock devuelve ""', async () => {
    const prisma = makePrisma({
      user: {
        findUnique: jest.fn(async () => {
          throw new Error('db down');
        }),
      },
    });
    const svc = new AiMemoryService(prisma);

    await expect(svc.getUserMemoryBlock(7)).resolves.toBe('');
  });
});
