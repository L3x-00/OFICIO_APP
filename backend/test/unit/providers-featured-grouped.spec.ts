/**
 * UNIT — ProvidersService.getFeaturedGrouped().
 *
 * Un proveedor puede tener varias categorías (`providerCategories`), pero
 * solo UNA marcada `isPrimary: true` (su categoría insignia). Antes del fix,
 * el agrupado por categoría padre matcheaba CUALQUIER categoría del
 * proveedor, así que aparecía duplicado en cada carrusel de /buscar (web) si
 * tenía tags secundarios en otros padres. Este test fija el contrato: tanto
 * el conteo de ranking como el filtro de proveedores por grupo deben exigir
 * `isPrimary: true`.
 */
import { ProvidersService } from '../../src/providers/providers.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('ProvidersService.getFeaturedGrouped', () => {
  let prisma: PrismaMock;
  let service: ProvidersService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new ProvidersService(prisma as any, {} as any);

    prisma.providerCategory.groupBy.mockResolvedValue([
      { categoryId: 1, _count: { providerId: 1 } },
    ]);
    prisma.category.findMany.mockResolvedValue([
      { id: 1, name: 'Electricidad', slug: 'electricidad', iconUrl: null, children: [] },
    ]);
    prisma.provider.findMany.mockResolvedValue([]);
  });

  it('agrupa proveedores por categoría insignia (isPrimary: true), no por cualquier tag', async () => {
    await service.getFeaturedGrouped();

    expect(prisma.provider.findMany).toHaveBeenCalledTimes(1);
    const args = prisma.provider.findMany.mock.calls[0][0];
    expect(args.where.providerCategories.some).toEqual({
      categoryId: { in: [1] },
      isPrimary: true,
    });
  });

  it('el ranking de categorías top también cuenta solo la insignia', async () => {
    await service.getFeaturedGrouped();

    const groupByArgs = prisma.providerCategory.groupBy.mock.calls[0][0];
    expect(groupByArgs.where.isPrimary).toBe(true);
  });
});
