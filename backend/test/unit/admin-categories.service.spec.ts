import { ConflictException } from '@nestjs/common';
import { AdminCategoriesService } from '../../src/admin/services/admin-categories.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('AdminCategoriesService (unit)', () => {
  let prisma: PrismaMock;
  let service: AdminCategoriesService;

  const category = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    slug: 'categoria',
    parentId: null,
    forType: null,
    parent: null,
    _count: { providerCategories: 0 },
    ...overrides,
  });

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AdminCategoriesService(prisma as any, {} as any);
  });

  it('normaliza aliases legacy al listar categorias', async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        ...category({ forType: 'PROFESSIONAL' }),
        children: [{ id: 2, forType: 'BUSINESS' }],
        parent: null,
      },
    ]);

    await expect(service.getCategories()).resolves.toEqual([
      expect.objectContaining({
        forType: 'OFICIO',
        children: [expect.objectContaining({ forType: 'NEGOCIO' })],
      }),
    ]);
  });

  describe('createCategory()', () => {
    it('persiste PROFESIONAL como tipo canonico', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({
        id: 1,
        forType: 'PROFESIONAL',
      });

      await service.createCategory({
        name: 'Ingenieria civil',
        slug: 'ingenieria-civil',
        forType: 'PROFESIONAL',
      });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ forType: 'PROFESIONAL' }),
      });
    });

    it('normaliza PROFESSIONAL legacy a OFICIO', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await service.createCategory({
        name: 'Carpinteria',
        slug: 'carpinteria',
        forType: 'PROFESSIONAL',
      });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ forType: 'OFICIO' }),
      });
    });

    it('rechaza una hija PROFESIONAL bajo padre OFICIO', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 8, forType: 'OFICIO' });

      await expect(
        service.createCategory({
          name: 'Estructuras',
          slug: 'estructuras',
          parentId: 8,
          forType: 'PROFESIONAL',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('rechaza una hija tipada bajo raiz legacy compartida', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 8, forType: null });

      await expect(
        service.createCategory({
          name: 'Estructuras',
          slug: 'estructuras',
          parentId: 8,
          forType: 'PROFESIONAL',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('updateCategory()', () => {
    it('normaliza BUSINESS legacy a NEGOCIO', async () => {
      prisma.category.findUnique.mockResolvedValue(category());
      prisma.category.findMany.mockResolvedValue([]);

      await service.updateCategory(1, { forType: 'BUSINESS' });

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { forType: 'NEGOCIO' },
      });
    });

    it('bloquea cambio de tipo si la categoria tiene proveedores asociados', async () => {
      prisma.category.findUnique.mockResolvedValue(
        category({ forType: 'OFICIO', _count: { providerCategories: 1 } }),
      );

      await expect(
        service.updateCategory(1, { forType: 'PROFESIONAL' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('bloquea reclasificar padre si una hija heredada tiene proveedores', async () => {
      prisma.category.findUnique.mockResolvedValue(
        category({ forType: 'OFICIO' }),
      );
      prisma.category.findMany.mockResolvedValue([
        { id: 2, forType: null, _count: { providerCategories: 1 } },
      ]);

      await expect(
        service.updateCategory(1, { forType: 'PROFESIONAL' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('valida compatibilidad al mover una subcategoria', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(
          category({
            id: 3,
            parentId: 1,
            forType: null,
            parent: { id: 1, forType: 'OFICIO' },
          }),
        )
        .mockResolvedValueOnce({ id: 2, forType: 'NEGOCIO' });
      prisma.category.findMany.mockResolvedValue([]);

      await service.updateCategory(3, { parentId: 2 });

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { parentId: 2 },
      });
    });
  });
});
