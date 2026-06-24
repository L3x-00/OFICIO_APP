/**
 * UNIT — QuotationsService: reglas críticas.
 *   • feature-gate "cotizacion" al crear.
 *   • crear notifica al proveedor.
 *   • ownership en respond/reject (solo el proveedor dueño).
 *   • respond actualiza estado + notifica al cliente.
 */
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { QuotationsService } from '../../src/quotations/quotations.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import { createPushMock } from '../mocks/push.mock';

describe('QuotationsService (unit)', () => {
  let prisma: PrismaMock;
  let push: ReturnType<typeof createPushMock>;
  let features: { assertProviderHasFeature: jest.Mock };
  let minio: { uploadFile: jest.Mock };
  let service: QuotationsService;

  const dto = { providerId: 7, description: 'Necesito pintar mi casa' };

  beforeEach(() => {
    prisma = createPrismaMock();
    push = createPushMock();
    features = {
      assertProviderHasFeature: jest.fn().mockResolvedValue(undefined),
    };
    minio = { uploadFile: jest.fn().mockResolvedValue('https://cdn/x.jpg') };
    service = new QuotationsService(
      prisma as any,
      features as any,
      minio as any,
      push as any,
    );
  });

  describe('create', () => {
    it('rechaza si el proveedor no tiene "cotizacion"', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 7,
        userId: 99,
        businessName: 'X',
      });
      features.assertProviderHasFeature.mockRejectedValue(
        new ForbiddenException('sin cotizacion'),
      );
      await expect(service.create(5, dto as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.quotationRequest.create).not.toHaveBeenCalled();
    });

    it('crea y notifica al proveedor', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 7,
        userId: 99,
        businessName: 'Pintores X',
      });
      prisma.quotationRequest.create.mockResolvedValue({ id: 1, providerId: 7 });
      const res = await service.create(5, dto as any);
      expect(res).toMatchObject({ id: 1 });
      expect(push.sendToUser).toHaveBeenCalledWith(
        99,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ type: 'QUOTATION_REQUEST' }),
      );
    });
  });

  describe('respond', () => {
    it('ownership: un usuario que no es el proveedor dueño → 403', async () => {
      prisma.quotationRequest.findUnique.mockResolvedValue({
        id: 1,
        userId: 5,
        status: 'PENDIENTE',
        provider: { userId: 99 },
      });
      await expect(service.respond(7, 1, 'S/ 500')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('el dueño responde: actualiza a RESPONDIDA + notifica al cliente', async () => {
      prisma.quotationRequest.findUnique.mockResolvedValue({
        id: 1,
        userId: 5,
        status: 'PENDIENTE',
        provider: { userId: 99 },
      });
      prisma.quotationRequest.update.mockResolvedValue({
        id: 1,
        status: 'RESPONDIDA',
      });
      const res = await service.respond(99, 1, 'Te cuesta S/ 500', 500);
      expect(res).toMatchObject({ status: 'RESPONDIDA' });
      expect(prisma.quotationRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'RESPONDIDA',
            estimatedPrice: 500,
          }),
        }),
      );
      expect(push.sendToUser).toHaveBeenCalledWith(
        5,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ type: 'QUOTATION_RESPONDED' }),
      );
    });

    it('no se puede responder una ya atendida', async () => {
      prisma.quotationRequest.findUnique.mockResolvedValue({
        id: 1,
        userId: 5,
        status: 'RESPONDIDA',
        provider: { userId: 99 },
      });
      await expect(service.respond(99, 1, 'x')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reject', () => {
    it('el dueño rechaza: RECHAZADA + notifica al cliente', async () => {
      prisma.quotationRequest.findUnique.mockResolvedValue({
        id: 1,
        userId: 5,
        status: 'PENDIENTE',
        provider: { userId: 99 },
      });
      prisma.quotationRequest.update.mockResolvedValue({
        id: 1,
        status: 'RECHAZADA',
      });
      await service.reject(99, 1);
      expect(push.sendToUser).toHaveBeenCalledWith(
        5,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ type: 'QUOTATION_REJECTED' }),
      );
    });
  });
});
