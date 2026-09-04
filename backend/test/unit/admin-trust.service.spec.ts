import { AdminTrustService } from '../../src/admin/services/admin-trust.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  type EventsGatewayMock,
} from '../mocks/events-gateway.mock';
import { createPushMock, type PushMock } from '../mocks/push.mock';

describe('AdminTrustService.rejectVerification (unit)', () => {
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let push: PushMock;
  let service: AdminTrustService;

  const rejectedProvider = {
    id: 10,
    userId: 7,
    type: 'OFICIO',
    businessName: 'Taller de Ana',
    verificationStatus: 'RECHAZADO',
    isVerified: false,
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push = createPushMock();
    service = new AdminTrustService(
      prisma as any,
      events as any,
      push as any,
      {} as any,
      {} as any,
    );

    prisma.provider.findUnique.mockResolvedValue({
      id: rejectedProvider.id,
      userId: rejectedProvider.userId,
      type: rejectedProvider.type,
      businessName: rejectedProvider.businessName,
    });
    prisma.provider.update.mockResolvedValue(rejectedProvider);
  });

  it('conserva rol PROVEEDOR si queda otro perfil APROBADO', async () => {
    prisma.provider.count.mockResolvedValue(1);

    await service.rejectVerification(
      rejectedProvider.id,
      'Documentación incompleta',
    );

    expect(prisma.provider.count).toHaveBeenCalledWith({
      where: {
        userId: rejectedProvider.userId,
        verificationStatus: 'APROBADO',
        id: { not: rejectedProvider.id },
      },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('degrada a USUARIO solo cuando no queda ningún otro perfil APROBADO', async () => {
    prisma.provider.count.mockResolvedValue(0);

    await service.rejectVerification(
      rejectedProvider.id,
      'Documentación incompleta',
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: rejectedProvider.userId },
      data: { role: 'USUARIO' },
    });
  });
});

describe('AdminTrustService.requestMoreInfo (unit)', () => {
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let push: PushMock;
  let service: AdminTrustService;

  const provider = {
    id: 21,
    userId: 9,
    type: 'OFICIO',
    businessName: 'Gasfitería Luis',
  };
  const reason = 'Falta la foto del DNI por el reverso';
  const message = `Necesitamos más información para verificar tu perfil: ${reason}`;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push = createPushMock();
    service = new AdminTrustService(
      prisma as any,
      events as any,
      push as any,
      {} as any,
      {} as any,
    );

    prisma.provider.findUnique.mockResolvedValue(provider);
  });

  it('persiste la notificación y la ENTREGA por WS + push', async () => {
    await service.requestMoreInfo(provider.id, reason);

    expect(prisma.adminNotification.create).toHaveBeenCalledWith({
      data: {
        providerId: provider.id,
        type: 'MAS_INFO',
        message,
        targetProfileType: provider.type,
        targetUserId: provider.userId,
      },
    });

    // Regresión: antes solo se creaba la fila — sin estas dos llamadas el
    // proveedor no se enteraba de la solicitud hasta abrir el historial.
    expect(events.emitNotification).toHaveBeenCalledWith({
      type: 'MAS_INFO',
      title: 'Información requerida',
      body: message,
      targetUserId: provider.userId,
      targetProfileType: provider.type,
    });
    expect(push.sendToUser).toHaveBeenCalledWith(
      provider.userId,
      'Información requerida',
      message,
      { type: 'MAS_INFO' },
    );
  });

  it('no cambia el estado de verificación ni degrada el rol', async () => {
    await service.requestMoreInfo(provider.id, reason);

    expect(prisma.provider.update).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(events.emitProviderStatusChanged).not.toHaveBeenCalled();
  });

  it('rechaza un motivo vacío sin notificar', async () => {
    await expect(service.requestMoreInfo(provider.id, '   ')).rejects.toThrow(
      'El detalle de la solicitud es obligatorio',
    );

    expect(prisma.adminNotification.create).not.toHaveBeenCalled();
    expect(events.emitNotification).not.toHaveBeenCalled();
    expect(push.sendToUser).not.toHaveBeenCalled();
  });
});
