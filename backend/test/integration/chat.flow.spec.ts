/**
 * INTEGRATION — Flujo de chat interno contra Postgres real.
 *
 * Verifica:
 *   1. getOrCreateRoom es idempotente (mismo room.id en 2 llamadas).
 *   2. sendMessage persiste el mensaje con status SENT.
 *   3. getRoomMessages retorna paginado con orden DESC + hasMore.
 *   4. markRoomAsRead actualiza solo los mensajes ajenos a READ.
 *   5. getRoomsForUser refleja el unread count correcto.
 *   6. Multi-cuenta: dos usuarios distintos sin compartir salas.
 */

import { ChatService } from '../../src/chat/chat.service.js';
import {
  getTestPrisma,
  disconnectTestPrisma,
  truncateAll,
  ensureSeedCatalogs,
} from '../utils/db.util';
import { createEventsGatewayMock } from '../mocks/events-gateway.mock';
import { createPushMock } from '../mocks/push.mock';
import { createTestUser, createTestProvider } from '../utils/factories';
import type { PrismaService } from '../../prisma/prisma.service.js';

function build(prisma: PrismaService) {
  const events = createEventsGatewayMock();
  const push = createPushMock();
  const service = new ChatService(prisma, events as any, push as any);
  return { service, events, push };
}

describe('Chat flow (integration)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
    await ensureSeedCatalogs(prisma);
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  it('getOrCreateRoom es idempotente: 2 llamadas devuelven el MISMO id', async () => {
    const { service } = build(prisma);
    const client = await createTestUser(prisma);
    const providerUser = await createTestUser(prisma, {
      email: `pu-${Date.now()}@x.com`,
    });
    const provider = await createTestProvider(prisma, providerUser.id);

    const r1 = await service.getOrCreateRoom(client.id, provider.id);
    const r2 = await service.getOrCreateRoom(client.id, provider.id);

    expect(r1.id).toBe(r2.id);
    // En BD solo hay 1 fila.
    const rooms = await prisma.chatRoom.findMany({
      where: { clientId: client.id, providerId: provider.id },
    });
    expect(rooms).toHaveLength(1);
  });

  it('sendMessage persiste el mensaje y emite notificación al receptor', async () => {
    const { service, events, push } = build(prisma);
    const client = await createTestUser(prisma, {
      firstName: 'Cliente',
      lastName: 'Test',
    });
    const providerUser = await createTestUser(prisma, {
      email: `pu-${Date.now()}@x.com`,
    });
    const provider = await createTestProvider(prisma, providerUser.id);

    const room = await service.getOrCreateRoom(client.id, provider.id);

    const msg = await service.sendMessage(client.id, {
      chatRoomId: room.id,
      senderId: client.id,
      content: '¿Atienden este sábado?',
    });

    expect(msg.id).toBeGreaterThan(0);
    expect(msg.content).toBe('¿Atienden este sábado?');
    expect(msg.senderId).toBe(client.id);

    // Persistido en BD.
    const stored = await prisma.chatMessage.findUnique({
      where: { id: msg.id },
    });
    expect(stored).not.toBeNull();
    expect(stored!.status).toBe('SENT');

    // emitNotification a userProvider con título que incluye nombre del cliente.
    await new Promise((r) => setImmediate(r));
    expect(events.emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CHAT_MESSAGE',
        targetUserId: providerUser.id,
        title: expect.stringContaining('Cliente Test'),
      }),
    );
    expect(push.sendToUser).toHaveBeenCalledWith(
      providerUser.id,
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ type: 'CHAT_MESSAGE' }),
    );
  });

  it('markRoomAsRead marca solo los mensajes del OTRO remitente como READ', async () => {
    const { service } = build(prisma);
    const client = await createTestUser(prisma);
    const providerUser = await createTestUser(prisma, {
      email: `pu-${Date.now()}@x.com`,
    });
    const provider = await createTestProvider(prisma, providerUser.id);

    const room = await service.getOrCreateRoom(client.id, provider.id);

    // Cliente envía 2; proveedor envía 1.
    await service.sendMessage(client.id, {
      chatRoomId: room.id,
      senderId: client.id,
      content: 'A',
    });
    await service.sendMessage(client.id, {
      chatRoomId: room.id,
      senderId: client.id,
      content: 'B',
    });
    await service.sendMessage(providerUser.id, {
      chatRoomId: room.id,
      senderId: providerUser.id,
      content: 'C',
    });

    // El proveedor marca como leído.
    const res = await service.markRoomAsRead(room.id, providerUser.id);
    expect(res.updated).toBe(2);

    // Verifica BD: mensajes del CLIENTE son READ; mensaje del PROVIDER sigue SENT.
    const all = await prisma.chatMessage.findMany({
      where: { chatRoomId: room.id },
      orderBy: { id: 'asc' },
    });
    expect(
      all
        .filter((m) => m.senderId === client.id)
        .every((m) => m.status === 'READ'),
    ).toBe(true);
    expect(all.find((m) => m.senderId === providerUser.id)!.status).toBe(
      'SENT',
    );
  });

  it('getRoomMessages devuelve paginado con hasMore correcto', async () => {
    const { service } = build(prisma);
    const client = await createTestUser(prisma);
    const providerUser = await createTestUser(prisma, {
      email: `pu-${Date.now()}@x.com`,
    });
    const provider = await createTestProvider(prisma, providerUser.id);

    const room = await service.getOrCreateRoom(client.id, provider.id);

    // 5 mensajes.
    for (let i = 0; i < 5; i++) {
      await service.sendMessage(client.id, {
        chatRoomId: room.id,
        senderId: client.id,
        content: `msg ${i + 1}`,
      });
    }

    const page1 = await service.getRoomMessages(room.id, client.id, {
      page: 1,
      limit: 3,
    });
    expect(page1.items).toHaveLength(3);
    expect(page1.total).toBe(5);
    expect(page1.hasMore).toBe(true);
    // Orden DESC: el último mensaje ("msg 5") está primero.
    expect(page1.items[0].content).toBe('msg 5');

    const page2 = await service.getRoomMessages(room.id, client.id, {
      page: 2,
      limit: 3,
    });
    expect(page2.items).toHaveLength(2);
    expect(page2.hasMore).toBe(false);
  });

  it('getRoomsForUser refleja unreadCount correcto por scope', async () => {
    const { service } = build(prisma);
    const client = await createTestUser(prisma);
    const providerUser = await createTestUser(prisma, {
      email: `pu-${Date.now()}@x.com`,
    });
    const provider = await createTestProvider(prisma, providerUser.id);

    const room = await service.getOrCreateRoom(client.id, provider.id);
    await service.sendMessage(client.id, {
      chatRoomId: room.id,
      senderId: client.id,
      content: 'Hola',
    });
    await service.sendMessage(client.id, {
      chatRoomId: room.id,
      senderId: client.id,
      content: 'Hola otra vez',
    });

    // Para el dueño del provider, esos 2 mensajes son unread.
    const providerInbox = await service.getRoomsForUser(providerUser.id, {
      scope: 'provider',
    });
    expect(providerInbox).toHaveLength(1);
    expect((providerInbox[0] as any).unreadCount).toBe(2);

    // Para el cliente, sus propios mensajes no cuentan como unread.
    const clientInbox = await service.getRoomsForUser(client.id, {
      scope: 'client',
    });
    expect(clientInbox).toHaveLength(1);
    expect((clientInbox[0] as any).unreadCount).toBe(0);
  });

  it('multi-cuenta: dos clientes con el mismo provider tienen salas independientes', async () => {
    const { service } = build(prisma);
    const clientA = await createTestUser(prisma, {
      email: `a-${Date.now()}@x.com`,
    });
    const clientB = await createTestUser(prisma, {
      email: `b-${Date.now()}@x.com`,
    });
    const providerUser = await createTestUser(prisma, {
      email: `p-${Date.now()}@x.com`,
    });
    const provider = await createTestProvider(prisma, providerUser.id);

    const roomA = await service.getOrCreateRoom(clientA.id, provider.id);
    const roomB = await service.getOrCreateRoom(clientB.id, provider.id);

    expect(roomA.id).not.toBe(roomB.id);

    await service.sendMessage(clientA.id, {
      chatRoomId: roomA.id,
      senderId: clientA.id,
      content: 'soy A',
    });
    await service.sendMessage(clientB.id, {
      chatRoomId: roomB.id,
      senderId: clientB.id,
      content: 'soy B',
    });

    // El proveedor ve LAS DOS salas en su inbox de provider.
    const inbox = await service.getRoomsForUser(providerUser.id, {
      scope: 'provider',
    });
    expect(inbox).toHaveLength(2);
  });
});
