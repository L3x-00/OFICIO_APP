/**
 * UNIT — LocalitiesService (mínimo honesto).
 * Solo lógica con valor de regresión: dedup accent/case-insensitive en
 * suggest(), validación de departamento, NotFound en admin, soft-delete,
 * promoción USER→ADMIN. Los list endpoints son proxies puros a Prisma.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LocalitiesService } from '../../src/localities/localities.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('LocalitiesService (unit)', () => {
  let prisma: PrismaMock;
  let service: LocalitiesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new LocalitiesService(prisma as any);
  });

  describe('suggest()', () => {
    it('departamento < 2 chars → BadRequest', async () => {
      await expect(service.suggest({ department: 'A' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('dedup accent/case-insensitive: devuelve la fila existente sin crear', async () => {
      prisma.locality.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Lima',
          department: 'Lima',
          province: null,
          district: null,
          country: 'PE',
          isActive: true,
          source: 'USER',
        },
      ]);
      const res = await service.suggest({ department: 'lima' });
      expect((res as any).id).toBe(1);
      expect(prisma.locality.create).not.toHaveBeenCalled();
    });

    it('sin match: crea nueva con source USER', async () => {
      prisma.locality.findMany.mockResolvedValue([]);
      prisma.locality.create.mockResolvedValue({ id: 2 });
      await service.suggest({ department: 'Cusco' });
      expect(prisma.locality.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: 'USER', isActive: true }),
        }),
      );
    });
  });

  describe('adminCreate()', () => {
    it('promueve una localidad propuesta por usuario (USER → ADMIN)', async () => {
      prisma.locality.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Lima',
          department: 'Lima',
          province: null,
          district: null,
          country: 'PE',
          isActive: true,
          source: 'USER',
        },
      ]);
      prisma.locality.update.mockResolvedValue({ id: 1, source: 'ADMIN' });
      await service.adminCreate({ department: 'Lima' });
      expect(prisma.locality.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ source: 'ADMIN' }),
        }),
      );
    });
  });

  describe('adminUpdate()', () => {
    it('localidad inexistente → NotFound', async () => {
      prisma.locality.findUnique.mockResolvedValue(null);
      await expect(
        service.adminUpdate(1, { department: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('éxito: recompone el name coherente con los nuevos valores', async () => {
      prisma.locality.findUnique.mockResolvedValue({
        id: 1,
        department: 'Lima',
        province: null,
        district: null,
        isActive: true,
      });
      prisma.locality.update.mockResolvedValue({ id: 1 });
      await service.adminUpdate(1, { district: 'Miraflores' });
      expect(prisma.locality.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ name: 'Miraflores' }),
        }),
      );
    });
  });

  describe('adminDelete()', () => {
    it('localidad inexistente → NotFound', async () => {
      prisma.locality.findUnique.mockResolvedValue(null);
      await expect(service.adminDelete(1)).rejects.toThrow(NotFoundException);
    });

    it('soft-delete: desactiva en vez de borrar (no rompe FK)', async () => {
      prisma.locality.findUnique.mockResolvedValue({ id: 1 });
      prisma.locality.update.mockResolvedValue({ id: 1, isActive: false });
      await service.adminDelete(1);
      expect(prisma.locality.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      });
      expect(prisma.locality.delete).not.toHaveBeenCalled();
    });
  });
});
