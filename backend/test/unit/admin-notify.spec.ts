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
  let service: AdminService;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push = createPushMock();
    // Solo prisma/events/push son relevantes; el resto de deps del god
    // object no se tocan en notifyProvider → mocks vacíos.
    service = new AdminService(
      prisma as any,
      events as any,
      {} as any, // minio
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
    await expect(
      service.notifyProvider(404, 'a', 'b'),
    ).rejects.toThrow(NotFoundException);
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
    const typeClause = where.OR.find(
      (c: any) => c.type?.in,
    )?.type?.in as string[];
    expect(typeClause).toEqual(
      expect.arrayContaining([
        'BROADCAST_LOG',
        'REFERRAL_CODE_USED',
        'NEW_USER_VERIFIED',
        'USER_PENDING',
      ]),
    );
  });
});
