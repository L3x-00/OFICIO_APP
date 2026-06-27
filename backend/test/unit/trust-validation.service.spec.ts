/**
 * UNIT — TrustValidationService.
 * Reglas críticas: solo perfiles APROBADOS solicitan, una solicitud pendiente
 * a la vez, transiciones de estado idempotentes (no reprocesar APPROVED/REJECTED),
 * rechazo exige motivo, notificación al proveedor + admin.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TrustValidationService } from '../../src/trust-validation/trust-validation.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  type EventsGatewayMock,
} from '../mocks/events-gateway.mock';
import { createPushMock, type PushMock } from '../mocks/push.mock';

describe('TrustValidationService (unit)', () => {
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let push: PushMock;
  let minio: { uploadFile: jest.Mock };
  let service: TrustValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push = createPushMock();
    minio = { uploadFile: jest.fn().mockResolvedValue('https://cdn/x.jpg') };
    service = new TrustValidationService(
      prisma as any,
      events as any,
      minio as any,
      push as any,
    );
  });

  describe('submitRequest()', () => {
    it('proveedor inexistente → NotFound', async () => {
      prisma.provider.findFirst.mockResolvedValue(null);
      await expect(
        service.submitRequest(7, 'OFICIO', {}, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('perfil no APROBADO → BadRequest', async () => {
      prisma.provider.findFirst.mockResolvedValue({
        id: 5,
        trustStatus: null,
        verificationStatus: 'PENDIENTE',
      });
      await expect(
        service.submitRequest(7, 'OFICIO', {}, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('ya tiene solicitud PENDING → BadRequest', async () => {
      prisma.provider.findFirst.mockResolvedValue({
        id: 5,
        trustStatus: 'PENDING',
        verificationStatus: 'APROBADO',
      });
      await expect(
        service.submitRequest(7, 'OFICIO', {}, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('éxito: crea solicitud, marca trustStatus PENDING y avisa al admin', async () => {
      prisma.provider.findFirst.mockResolvedValue({
        id: 5,
        trustStatus: null,
        verificationStatus: 'APROBADO',
      });
      prisma.trustValidationRequest.create.mockResolvedValue({ id: 9 });
      const res = await service.submitRequest(
        7,
        'OFICIO',
        { dniNumber: '12345678' },
        {},
      );
      expect(prisma.trustValidationRequest.create).toHaveBeenCalled();
      expect(prisma.provider.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { trustStatus: 'PENDING' },
      });
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TRUST_VALIDATION_REQUEST',
          targetRole: 'ADMIN',
        }),
      );
      // Sin archivos → no se sube nada a MinIO.
      expect(minio.uploadFile).not.toHaveBeenCalled();
      expect(res).toEqual({ success: true, requestId: 9 });
    });
  });

  describe('getMyTrustStatus()', () => {
    it('perfil inexistente → NotFound', async () => {
      prisma.provider.findFirst.mockResolvedValue(null);
      await expect(service.getMyTrustStatus(7, 'OFICIO')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve estado + última solicitud', async () => {
      prisma.provider.findFirst.mockResolvedValue({
        id: 5,
        trustStatus: 'APPROVED',
        isTrusted: true,
        trustValidations: [{ id: 1, status: 'APPROVED' }],
      });
      const res = await service.getMyTrustStatus(7, 'OFICIO');
      expect(res).toEqual({
        trustStatus: 'APPROVED',
        isTrusted: true,
        latestRequest: { id: 1, status: 'APPROVED' },
      });
    });
  });

  describe('approveRequest()', () => {
    it('solicitud inexistente → NotFound', async () => {
      prisma.trustValidationRequest.findUnique.mockResolvedValue(null);
      await expect(service.approveRequest(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('solicitud ya procesada → BadRequest', async () => {
      prisma.trustValidationRequest.findUnique.mockResolvedValue({
        id: 1,
        status: 'APPROVED',
        providerId: 5,
        provider: { userId: 9, type: 'OFICIO', businessName: 'X' },
      });
      await expect(service.approveRequest(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('éxito: marca APPROVED + isTrusted y notifica al proveedor (WS + push)', async () => {
      prisma.trustValidationRequest.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDING',
        providerId: 5,
        provider: { userId: 9, type: 'OFICIO', businessName: 'Negocio X' },
      });
      const res = await service.approveRequest(1);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TRUST_APPROVED', targetUserId: 9 }),
      );
      expect(push.sendToUser).toHaveBeenCalledWith(
        9,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ type: 'TRUST_APPROVED' }),
      );
      expect(res).toEqual({ success: true });
    });
  });

  describe('rejectRequest()', () => {
    it('sin motivo → BadRequest', async () => {
      await expect(service.rejectRequest(1, '   ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('solicitud inexistente → NotFound', async () => {
      prisma.trustValidationRequest.findUnique.mockResolvedValue(null);
      await expect(service.rejectRequest(1, 'datos falsos')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('solicitud ya procesada → BadRequest', async () => {
      prisma.trustValidationRequest.findUnique.mockResolvedValue({
        id: 1,
        status: 'REJECTED',
        providerId: 5,
        provider: { userId: 9, type: 'OFICIO', businessName: 'X' },
      });
      await expect(service.rejectRequest(1, 'motivo')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('éxito: marca REJECTED y notifica el motivo al proveedor', async () => {
      prisma.trustValidationRequest.findUnique.mockResolvedValue({
        id: 1,
        status: 'PENDING',
        providerId: 5,
        provider: { userId: 9, type: 'OFICIO', businessName: 'X' },
      });
      const res = await service.rejectRequest(1, 'Fotos ilegibles');
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TRUST_REJECTED',
          targetUserId: 9,
          body: 'Fotos ilegibles',
        }),
      );
      // Push para background (espejo de approveRequest): sin esto el rechazo
      // solo se veía al reiniciar la app.
      expect(push.sendToUser).toHaveBeenCalledWith(
        9,
        expect.any(String),
        'Fotos ilegibles',
        expect.objectContaining({ type: 'TRUST_REJECTED' }),
      );
      expect(res).toEqual({ success: true });
    });
  });
});
