/**
 * UNIT — UserReportsService.
 * Reglas: reporterId SIEMPRE del JWT, no auto-reporte, target debe existir,
 * transiciones de estado solo REVIEWED/DISMISSED.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserReportsService } from '../../src/user-reports/user-reports.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('UserReportsService (unit)', () => {
  let prisma: PrismaMock;
  let service: UserReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new UserReportsService(prisma as any);
  });

  describe('create()', () => {
    it('auto-reporte → BadRequest', async () => {
      await expect(
        service.create(7, { reportedUserId: 7, reason: 'SPAM' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('usuario reportado inexistente → NotFound', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.create(7, { reportedUserId: 9, reason: 'SPAM' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('éxito: crea con reporterId del JWT (no del body)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 9 });
      prisma.userReport.create.mockResolvedValue({ id: 1 });
      await service.create(7, {
        reportedUserId: 9,
        reason: 'SCAM',
        description: 'estafa',
      } as any);
      expect(prisma.userReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reporterId: 7,
            reportedUserId: 9,
            reason: 'SCAM',
          }),
        }),
      );
    });
  });

  describe('updateStatus()', () => {
    it('estado inválido → BadRequest', async () => {
      await expect(service.updateStatus(1, 'FOO')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('reporte inexistente → NotFound', async () => {
      prisma.userReport.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus(1, 'REVIEWED')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('éxito: cambia a REVIEWED', async () => {
      prisma.userReport.findUnique.mockResolvedValue({ id: 1 });
      prisma.userReport.update.mockResolvedValue({ id: 1, status: 'REVIEWED' });
      await service.updateStatus(1, 'REVIEWED');
      expect(prisma.userReport.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'REVIEWED' },
      });
    });
  });

  describe('listForAdmin()', () => {
    it('devuelve listado paginado con pendingCount', async () => {
      prisma.userReport.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.userReport.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // pendingCount
      const res = await service.listForAdmin('PENDING', 1, 20);
      expect(res).toEqual(
        expect.objectContaining({
          data: [{ id: 1 }],
          total: 1,
          page: 1,
          lastPage: 1,
          pendingCount: 1,
        }),
      );
    });
  });
});
