/**
 * UNIT — AdminService: notificación 1:1 a un proveedor (drill-down del
 * dashboard) + whitelist de notifs de usuario en ADMIN_NOTIF_WHERE.
 *
 * notifyProvider debe: emitir en tiempo real (emitNotification con
 * targetUserId → persiste en el inbox) Y mandar push (sendToUser). Es el
 * mismo patrón del broadcast pero 1:1.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from '../../src/admin/admin.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import { createEventsGatewayMock } from '../mocks/events-gateway.mock';
import { createPushMock } from '../mocks/push.mock';

describe('AdminService.notifyProvider (unit)', () => {
  let prisma: PrismaMock;
  let events: ReturnType<typeof createEventsGatewayMock>;
  let push: ReturnType<typeof createPushMock>;
  let minio: { assertManagedImageUrl: jest.Mock };
  let service: AdminService;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push = createPushMock();
    minio = {
      assertManagedImageUrl: jest.fn((url: string) => url),
    };
    // Solo prisma/events/push son relevantes; el resto de deps del god
    // object no se tocan en notifyProvider → mocks vacíos.
    service = new AdminService(
      prisma as any,
      events as any,
      minio as any,
      push as any,
      {} as any, // categories
      {} as any, // dashboard
      {} as any, // trust
      {} as any, // payments
      {} as any, // reports
      {} as any, // email
      {} as any, // cacheManager
    );
  });

  it('emite en tiempo real (con targetUserId) Y manda push al dueño', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 7,
      userId: 99,
      businessName: 'Electricidad Pérez',
      type: 'OFICIO',
    });

    const res = await service.notifyProvider(
      7,
      'Tu plan vence',
      'Renueva pronto',
      'EXPIRY_REMINDER',
    );

    expect(res).toEqual({ success: true, providerId: 7, userId: 99 });
    // emitNotification con targetUserId → realtime + persistencia en inbox.
    expect(events.emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EXPIRY_REMINDER',
        title: 'Tu plan vence',
        body: 'Renueva pronto',
        targetUserId: 99,
        targetProfileType: 'OFICIO',
      }),
    );
    // push para app en background/terminated.
    expect(push.sendToUser).toHaveBeenCalledWith(
      99,
      'Tu plan vence',
      'Renueva pronto',
      expect.objectContaining({ type: 'EXPIRY_REMINDER' }),
    );
  });

  it('kind por defecto es ADMIN_MESSAGE', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 1,
      userId: 2,
      businessName: 'X',
      type: 'NEGOCIO',
    });
    await service.notifyProvider(1, 'Hola', 'Mundo');
    expect(events.emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ADMIN_MESSAGE' }),
    );
  });

  it('lanza NotFoundException si el proveedor no existe', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);
    await expect(service.notifyProvider(404, 'a', 'b')).rejects.toThrow(
      NotFoundException,
    );
    expect(events.emitNotification).not.toHaveBeenCalled();
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('lanza BadRequestException si falta título o mensaje', async () => {
    await expect(service.notifyProvider(1, '  ', 'b')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.notifyProvider(1, 'a', '   ')).rejects.toThrow(
      BadRequestException,
    );
    // No debe ni siquiera buscar el proveedor si la validación falla.
    expect(prisma.provider.findUnique).not.toHaveBeenCalled();
  });

  it('REGRESIÓN: ADMIN_NOTIF_WHERE incluye los types de usuario que antes no se guardaban', () => {
    const where = (AdminService as any).ADMIN_NOTIF_WHERE;
    const typeClause = where.OR.find((c: any) => c.type?.in)?.type
      ?.in as string[];
    expect(typeClause).toEqual(
      expect.arrayContaining([
        'BROADCAST_LOG',
        'REFERRAL_CODE_USED',
        'NEW_USER_VERIFIED',
        'USER_PENDING',
      ]),
    );
  });

  it('filtra notificaciones por rango de fecha en todas las consultas', async () => {
    const from = new Date('2026-07-01T05:00:00.000Z');
    const to = new Date('2026-08-01T04:59:59.999Z');
    prisma.adminNotification.findMany.mockResolvedValue([]);
    prisma.adminNotification.count.mockResolvedValue(0);

    await service.getNotifications(2, 20, from, to);

    const expectedRange = { sentAt: { gte: from, lte: to } };
    expect(prisma.adminNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining(expectedRange),
        skip: 20,
        take: 20,
      }),
    );
    for (const call of prisma.adminNotification.count.mock.calls) {
      expect(call[0]?.where).toEqual(expect.objectContaining(expectedRange));
    }
  });

  it('rechaza un rango de fecha invertido sin consultar la BD', async () => {
    await expect(
      service.getNotifications(
        1,
        20,
        new Date('2026-07-20T00:00:00.000Z'),
        new Date('2026-07-10T00:00:00.000Z'),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.adminNotification.findMany).not.toHaveBeenCalled();
  });

  it('rechaza una imagen externa en broadcasts antes de enviarlos', async () => {
    minio.assertManagedImageUrl.mockImplementationOnce(() => {
      throw new BadRequestException('URL no permitida');
    });

    await expect(
      service.broadcastNotification(
        'Aviso',
        'Mensaje',
        'https://evil.example/banner.jpg',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(minio.assertManagedImageUrl).toHaveBeenCalledWith(
      'https://evil.example/banner.jpg',
      ['admin/broadcasts'],
    );
  });

  it('revoca todos los refresh tokens al suspender un usuario', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      role: 'USUARIO',
    });
    prisma.user.update.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      role: 'USUARIO',
      isActive: false,
    });

    await expect(service.updateUserStatus(7, false)).resolves.toEqual(
      expect.objectContaining({ id: 7, isActive: false }),
    );
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7 },
    });
    expect(events.emitUserDeactivated).toHaveBeenCalledWith(7);
  });
});
