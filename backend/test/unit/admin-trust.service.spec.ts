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
