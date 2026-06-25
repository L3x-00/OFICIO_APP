/**
 * UNIT — FavoritesService.
 * Reglas: toggle idempotente (no duplica), scope siempre por userId del JWT,
 * alias `category.name` derivado para retrocompat del frontend.
 */
import { FavoritesService } from '../../src/favorites/favorites.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('FavoritesService (unit)', () => {
  let prisma: PrismaMock;
  let service: FavoritesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new FavoritesService(prisma as any);
  });

  describe('toggle()', () => {
    it('si ya existe → lo borra y devuelve isFavorite:false', async () => {
      prisma.favorite.findUnique.mockResolvedValue({ id: 1 });
      const res = await service.toggle(7, 3);
      expect(prisma.favorite.delete).toHaveBeenCalledWith({
        where: { userId_providerId: { userId: 7, providerId: 3 } },
      });
      expect(prisma.favorite.create).not.toHaveBeenCalled();
      expect(res).toEqual({ isFavorite: false });
    });

    it('si no existe → lo crea y devuelve isFavorite:true', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);
      const res = await service.toggle(7, 3);
      expect(prisma.favorite.create).toHaveBeenCalledWith({
        data: { userId: 7, providerId: 3 },
      });
      expect(prisma.favorite.delete).not.toHaveBeenCalled();
      expect(res).toEqual({ isFavorite: true });
    });
  });

  describe('getUserFavorites()', () => {
    it('filtra por userId e inyecta alias category.name', async () => {
      prisma.favorite.findMany.mockResolvedValue([
        {
          provider: {
            id: 3,
            providerCategories: [{ category: { name: 'Plomería' } }],
          },
        },
      ]);
      const res = await service.getUserFavorites(7);
      expect(prisma.favorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 7 } }),
      );
      expect(res[0].category.name).toBe('Plomería');
    });

    it('sin categorías → alias "Sin categoría"', async () => {
      prisma.favorite.findMany.mockResolvedValue([
        { provider: { id: 3, providerCategories: [] } },
      ]);
      const res = await service.getUserFavorites(7);
      expect(res[0].category.name).toBe('Sin categoría');
    });
  });
});
