/**
 * UNIT — ChatService.
 *
 * Cubre las invariantes del chat interno:
 *
 *   • Salas idempotentes: getOrCreateRoom(client,provider) usa upsert,
 *     dos llamadas seguidas devuelven la MISMA sala.
 *   • Authorization: sendMessage rechaza si dto.senderId != JWT user
 *     (Forbidden) y si el sender no es ni cliente ni dueño del provider.
 *   • Notif y persistencia: sendMessage dispara push + WS + emit de
 *     notificación tipo CHAT_MESSAGE con título "Tienes un nuevo
 *     mensaje de: <nombre>" (obs 7: persistencia para que cuente al
 *     cambiar de cuenta).
 *   • Read receipts: markRoomAsRead solo afecta mensajes de otro
 *     remitente y emite chatMessagesRead al sender original.
 *   • Pagination: getRoomMessages aplica límites razonables (page≥1,
 *     limit≤100, hasMore correcto).
 */

import { ChatService } from '../../src/chat/chat.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  EventsGatewayMock,
} from '../mocks/events-gateway.mock';
import { createPushMock, PushMock } from '../mocks/push.mock';
import { providerFixture } from '../fixtures/providers.fixture';
import { userFixture } from '../fixtures/users.fixture';

describe('ChatService (unit)', () => {
  let service: ChatService;
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let push: PushMock;

  // Cliente con id=1, proveedor con providerId=10 cuyo dueño es userId=2.
  const CLIENT_ID = 1;
  const PROVIDER_ID = 10;
  const PROVIDER_USER_ID = 2;

  const baseRoom = {
    id: 100,
    clientId: CLIENT_ID,
    providerId: PROVIDER_ID,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    provider: { userId: PROVIDER_USER_ID },
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push = createPushMock();
    // La persistencia de la notif CHAT_MESSAGE es fire-and-forget con
    // `.catch()`; el mock debe devolver una promesa o el `.catch` revienta.
    prisma.adminNotification.create.mockResolvedValue({} as any);
    service = new ChatService(prisma as any, events as any, push as any);
  });

  // ────────────────────────────────────────────────────────────
  //  getOrCreateRoom — idempotencia
  // ────────────────────────────────────────────────────────────
  describe('getOrCreateRoom()', () => {
    it('lanza NotFoundException si el cliente no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.provider.findUnique.mockResolvedValue(
        providerFixture({ id: PROVIDER_ID }),
      );
      await expect(
        service.getOrCreateRoom(CLIENT_ID, PROVIDER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el proveedor no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(userFixture({ id: CLIENT_ID }));
      prisma.provider.findUnique.mockResolvedValue(null);
      await expect(
        service.getOrCreateRoom(CLIENT_ID, PROVIDER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('usa upsert (idempotencia) — devuelve la sala existente sin duplicarla', async () => {
      prisma.user.findUnique.mockResolvedValue(userFixture({ id: CLIENT_ID }));
      prisma.provider.findUnique.mockResolvedValue(
        providerFixture({
          id: PROVIDER_ID,
          userId: PROVIDER_USER_ID,
        }),
      );
      prisma.chatRoom.upsert.mockResolvedValue(baseRoom);

      const r1 = await service.getOrCreateRoom(CLIENT_ID, PROVIDER_ID);
      const r2 = await service.getOrCreateRoom(CLIENT_ID, PROVIDER_ID);

      expect(r1.id).toBe(r2.id);
      expect(prisma.chatRoom.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clientId_providerId: {
              clientId: CLIENT_ID,
              providerId: PROVIDER_ID,
            },
          },
          update: {},
        }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  //  sendMessage — autorización y notificaciones
  // ────────────────────────────────────────────────────────────
  describe('sendMessage()', () => {
    const baseDto = {
      chatRoomId: 100,
      senderId: CLIENT_ID,
      content: 'Hola, ¿estás disponible mañana?',
    };

    it('rechaza si dto.senderId no coincide con el JWT userId (anti-suplantación)', async () => {
      await expect(service.sendMessage(/*JWT*/ 999, baseDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza si la sala no existe', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(null);
      await expect(service.sendMessage(CLIENT_ID, baseDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza si el sender no es cliente ni dueño del provider de la sala', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      // Sender es un user totalmente ajeno con id=42
      await expect(
        service.sendMessage(42, { ...baseDto, senderId: 42 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('persiste el mensaje y dispara push + WS al receptor', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      prisma.chatMessage.create.mockResolvedValue({
        id: 555,
        chatRoomId: 100,
        senderId: CLIENT_ID,
        content: baseDto.content,
        status: 'SENT',
        createdAt: new Date(),
      });
      prisma.user.findUnique.mockResolvedValue({
        firstName: 'Ana',
        lastName: 'Soto',
        avatarUrl: 'https://avatar',
      });

      const msg = await service.sendMessage(CLIENT_ID, baseDto);

      expect(msg.id).toBe(555);
      // Push al receptor (dueño del provider = userId 2)
      // El push se dispara dentro de Promise.allSettled — verificamos
      // el llamado pero permitimos que sea asíncrono.
      await new Promise((r) => setImmediate(r));
      expect(push.sendToUser).toHaveBeenCalledWith(
        PROVIDER_USER_ID,
        expect.stringContaining('Tienes un nuevo mensaje de: Ana Soto'),
        baseDto.content,
        expect.objectContaining({ type: 'CHAT_MESSAGE' }),
      );
      // WS emit a la sala user_<receiverId>
      expect(events.server.to).toHaveBeenCalledWith(`user_${PROVIDER_USER_ID}`);
      // Notificación in-app (persistible por gateway gracias a obs 7)
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CHAT_MESSAGE',
          targetUserId: PROVIDER_USER_ID,
        }),
      );
    });

    it('cuando el proveedor responde al cliente, el receptor es el clientId', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      prisma.chatMessage.create.mockResolvedValue({
        id: 556,
        chatRoomId: 100,
        senderId: PROVIDER_USER_ID,
        content: 'Sí, mañana.',
        status: 'SENT',
        createdAt: new Date(),
      });
      prisma.user.findUnique.mockResolvedValue({
        firstName: 'Carlos',
        lastName: 'Ramos',
        avatarUrl: null,
      });

      await service.sendMessage(PROVIDER_USER_ID, {
        chatRoomId: 100,
        senderId: PROVIDER_USER_ID,
        content: 'Sí, mañana.',
      });

      await new Promise((r) => setImmediate(r));
      expect(push.sendToUser).toHaveBeenCalledWith(
        CLIENT_ID,
        expect.any(String),
        'Sí, mañana.',
        expect.any(Object),
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  //  getRoomMessages — paginación + ACL
  // ────────────────────────────────────────────────────────────
  describe('getRoomMessages()', () => {
    it('lanza ForbiddenException si el caller no es participante', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      await expect(
        service.getRoomMessages(100, /*userId*/ 999),
      ).rejects.toThrow(ForbiddenException);
    });

    it('aplica límites de paginación (page≥1, limit≤100)', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      prisma.chatMessage.findMany.mockResolvedValue([]);
      prisma.chatMessage.count.mockResolvedValue(0);

      // page negativo → clamp a 1; limit > 100 → clamp a 100
      await service.getRoomMessages(100, CLIENT_ID, { page: -3, limit: 9999 });
      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
    });

    it('reporta hasMore=true cuando hay más mensajes que la página actual', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      prisma.chatMessage.findMany.mockResolvedValue(
        Array.from({ length: 30 }, (_, i) => ({ id: i, content: `m${i}` })),
      );
      prisma.chatMessage.count.mockResolvedValue(75);

      const res = await service.getRoomMessages(100, CLIENT_ID, {
        page: 1,
        limit: 30,
      });

      expect(res.hasMore).toBe(true);
      expect(res.total).toBe(75);
      expect(res.items).toHaveLength(30);
    });
  });

  // ────────────────────────────────────────────────────────────
  //  markRoomAsRead — read receipts
  // ────────────────────────────────────────────────────────────
  describe('markRoomAsRead()', () => {
    it('solo marca mensajes de OTRO remitente como READ', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      prisma.chatMessage.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markRoomAsRead(100, CLIENT_ID);

      expect(result.updated).toBe(3);
      // El filtro DEBE incluir senderId: { not: readerUserId }
      expect(prisma.chatMessage.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            chatRoomId: 100,
            senderId: { not: CLIENT_ID },
          }),
          data: { status: 'READ' },
        }),
      );
      // WS chatMessagesRead al otro participante (provider userId 2)
      expect(events.server.to).toHaveBeenCalledWith(`user_${PROVIDER_USER_ID}`);
    });

    it('no emite WS si no hubo cambios (count=0)', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      prisma.chatMessage.updateMany.mockResolvedValue({ count: 0 });

      await service.markRoomAsRead(100, CLIENT_ID);

      // server.to llamado solo cuando count>0 — verificamos que NO
      // se llame para chatMessagesRead.
      const calls = events.server.to.mock.calls;
      expect(calls).toEqual([]);
    });

    it('lanza ForbiddenException si el reader no es participante', async () => {
      prisma.chatRoom.findUnique.mockResolvedValue(baseRoom);
      await expect(service.markRoomAsRead(100, /*userId*/ 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  //  getRoomsForUser — scope filter (client/provider)
  // ────────────────────────────────────────────────────────────
  describe('getRoomsForUser()', () => {
    beforeEach(() => {
      prisma.chatRoom.findMany.mockResolvedValue([]);
      prisma.chatMessage.groupBy.mockResolvedValue([]);
    });

    it('scope=client filtra solo donde el user es cliente', async () => {
      await service.getRoomsForUser(CLIENT_ID, { scope: 'client' });
      expect(prisma.chatRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId: CLIENT_ID }),
        }),
      );
    });

    it('scope=provider filtra por dueño del provider', async () => {
      await service.getRoomsForUser(PROVIDER_USER_ID, { scope: 'provider' });
      expect(prisma.chatRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            provider: { userId: PROVIDER_USER_ID },
          }),
        }),
      );
    });

    it('scope=provider + providerType=OFICIO restringe al perfil específico', async () => {
      await service.getRoomsForUser(PROVIDER_USER_ID, {
        scope: 'provider',
        providerType: 'OFICIO',
      });
      expect(prisma.chatRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            provider: { userId: PROVIDER_USER_ID, type: 'OFICIO' },
          }),
        }),
      );
    });

    it('sin scope retorna client OR provider (compat legacy)', async () => {
      await service.getRoomsForUser(CLIENT_ID);
      expect(prisma.chatRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { clientId: CLIENT_ID },
              { provider: { userId: CLIENT_ID } },
            ]),
          }),
        }),
      );
    });
  });
});
