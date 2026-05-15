import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { PushNotificationsService } from '../firebase/push-notifications.service.js';

const MESSAGE_RETENTION_DAYS = 15;
const MESSAGE_RETENTION_MS = MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly push: PushNotificationsService,
  ) {}

  // ── ROOMS ─────────────────────────────────────────────────

  /**
   * Idempotente: si ya existe la sala entre `clientId` y `providerId`,
   * la devuelve. Si no, la crea. La sala es permanente (no caduca);
   * lo que se purga periódicamente son los mensajes con más de 15 días.
   */
  async getOrCreateRoom(clientId: number, providerId: number) {
    const [client, provider] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: clientId }, select: { id: true } }),
      this.prisma.provider.findUnique({
        where: { id: providerId },
        select: { id: true, userId: true },
      }),
    ]);
    if (!client) throw new NotFoundException('Cliente no encontrado');
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    return this.prisma.chatRoom.upsert({
      where: { clientId_providerId: { clientId, providerId } },
      update: {},
      create: { clientId, providerId },
    });
  }

  /**
   * Salas del usuario autenticado (como cliente o como proveedor),
   * con el último mensaje y la cuenta de no-leídos para previsualizar
   * la bandeja. Ordenadas por última actividad (descendente).
   */
  async getRoomsForUser(userId: number) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        OR: [{ clientId: userId }, { provider: { userId } }],
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        provider: {
          select: {
            id: true,
            businessName: true,
            userId: true,
            images: {
              where: { isCover: true },
              take: 1,
              select: { url: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Cuenta de no-leídos por sala — un único groupBy en lote
    const unreadCounts = await this.prisma.chatMessage.groupBy({
      by: ['chatRoomId'],
      where: {
        chatRoomId: { in: rooms.map((r) => r.id) },
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      _count: { _all: true },
    });
    const unreadByRoom = new Map(
      unreadCounts.map((u) => [u.chatRoomId, u._count._all]),
    );

    return rooms
      .map((r) => ({
        ...r,
        lastMessage: r.messages[0] ?? null,
        lastActivityAt: r.messages[0]?.createdAt ?? r.createdAt,
        unreadCount: unreadByRoom.get(r.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
      )
      .map(({ messages: _msgs, ...rest }) => rest);
  }

  // ── MESSAGES ──────────────────────────────────────────────

  /**
   * Persiste el mensaje, identifica al receptor y dispara push + WebSocket
   * en paralelo. Los fallos de push/WS no bloquean la respuesta.
   *
   * `senderUserId` viene del JWT y se valida contra `dto.senderId`.
   */
  async sendMessage(
    senderUserId: number,
    dto: { chatRoomId: number; senderId: number; content: string },
  ) {
    if (dto.senderId !== senderUserId) {
      throw new ForbiddenException('No puedes enviar mensajes en nombre de otro usuario');
    }

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: dto.chatRoomId },
      include: { provider: { select: { userId: true } } },
    });
    if (!room) throw new NotFoundException('Sala de chat no encontrada');

    const providerOwnerUserId = room.provider.userId;

    const isParticipant =
      senderUserId === room.clientId || senderUserId === providerOwnerUserId;
    if (!isParticipant) {
      throw new ForbiddenException('No perteneces a esta sala de chat');
    }

    const receiverUserId =
      senderUserId === room.clientId ? providerOwnerUserId : room.clientId;

    const message = await this.prisma.chatMessage.create({
      data: {
        chatRoomId: dto.chatRoomId,
        senderId: senderUserId,
        content: dto.content,
      },
    });

    // Push + WebSocket en paralelo. Errores se loguean pero no rompen la API.
    void Promise.allSettled([
      this.push
        .sendToUser(receiverUserId, 'Nuevo mensaje', message.content, {
          type: 'CHAT_MESSAGE',
          chatRoomId: String(message.chatRoomId),
          messageId: String(message.id),
          senderId: String(message.senderId),
        })
        .catch((e) => this.logger.warn(`push falló: ${e?.message ?? e}`)),
      Promise.resolve().then(() => {
        try {
          this.events.server
            .to(`user_${receiverUserId}`)
            .emit('newChatMessage', message);
        } catch (e) {
          this.logger.warn(`ws emit falló: ${(e as Error)?.message}`);
        }
      }),
    ]);

    return message;
  }

  // ── HISTORIAL ─────────────────────────────────────────────

  /**
   * Devuelve mensajes de una sala paginados, **más recientes primero**
   * (`createdAt DESC`). El cliente los renderiza en orden cronológico
   * inverso (los antiguos arriba, los nuevos abajo) y usa la paginación
   * para cargar más historial al hacer scroll hacia arriba.
   *
   * Sólo participantes (cliente o dueño del proveedor) tienen acceso.
   */
  async getRoomMessages(
    roomId: number,
    userId: number,
    opts: { page?: number; limit?: number } = {},
  ) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { provider: { select: { userId: true } } },
    });
    if (!room) throw new NotFoundException('Sala de chat no encontrada');

    const isParticipant =
      userId === room.clientId || userId === room.provider.userId;
    if (!isParticipant) {
      throw new ForbiddenException('No perteneces a esta sala de chat');
    }

    // Sanea paginación; tope alto razonable para evitar dump de tabla
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { chatRoomId: roomId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.chatMessage.count({ where: { chatRoomId: roomId } }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    };
  }

  // ── READ RECEIPTS ─────────────────────────────────────────

  /**
   * Marca como leídos todos los mensajes recibidos en la sala que aún no
   * estén en estado READ. Devuelve la cantidad afectada y notifica al
   * emisor original vía WebSocket para que su UI pinte el doble check azul.
   */
  async markRoomAsRead(roomId: number, readerUserId: number) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { provider: { select: { userId: true } } },
    });
    if (!room) throw new NotFoundException('Sala de chat no encontrada');

    const isParticipant =
      readerUserId === room.clientId ||
      readerUserId === room.provider.userId;
    if (!isParticipant) {
      throw new ForbiddenException('No perteneces a esta sala de chat');
    }

    const result = await this.prisma.chatMessage.updateMany({
      where: {
        chatRoomId: roomId,
        senderId: { not: readerUserId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    // El otro participante es el emisor de los mensajes recién marcados
    const otherUserId =
      readerUserId === room.clientId ? room.provider.userId : room.clientId;

    if (result.count > 0) {
      try {
        this.events.server
          .to(`user_${otherUserId}`)
          .emit('chatMessagesRead', {
            roomId,
            readerUserId,
            updatedCount: result.count,
          });
      } catch (e) {
        this.logger.warn(`ws emit (read) falló: ${(e as Error)?.message}`);
      }
    }

    return { updated: result.count };
  }

  // ── CLEANUP CRON ──────────────────────────────────────────

  /**
   * Listado admin de salas de chat con filtros. Devuelve solo salas con
   * al menos un mensaje (para evitar mostrar habitaciones sin contenido)
   * + el último mensaje + datos minimal del cliente y proveedor.
   */
  async adminList(filters: {
    providerType?: string;
    department?:   string;
    province?:     string;
    district?:     string;
    activeWithin?: number;
    page?:         number;
    limit?:        number;
  }) {
    const { providerType, department, province, district, activeWithin } = filters;
    const page  = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 30));

    const providerWhere: any = {};
    const type = (providerType ?? '').toUpperCase();
    if (type === 'OFICIO' || type === 'NEGOCIO') providerWhere.type = type;

    if (department || province || district) {
      providerWhere.locality = {
        ...(department ? { department } : {}),
        ...(province   ? { province  } : {}),
        ...(district   ? { district  } : {}),
      };
    }

    const messageFilter = activeWithin && activeWithin > 0
      ? { some: { createdAt: { gte: new Date(Date.now() - activeWithin * 24 * 60 * 60 * 1000) } } }
      : { some: {} }; // al menos un mensaje

    const where: any = {
      messages: messageFilter,
      ...(Object.keys(providerWhere).length > 0 ? { provider: providerWhere } : {}),
    };

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client:   { select: { id: true, firstName: true, lastName: true, email: true } },
          provider: {
            select: {
              id: true, businessName: true, type: true,
              locality: { select: { name: true, department: true, province: true, district: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, content: true, createdAt: true, senderId: true },
          },
        },
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    return {
      data:  rooms,
      total,
      page,
      lastPage: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Una vez al día (03:00 UTC) borra los mensajes con más de 15 días.
   * Las salas permanecen — la conversación se limpia, no la relación.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async pruneOldMessages() {
    const threshold = new Date(Date.now() - MESSAGE_RETENTION_MS);
    const result = await this.prisma.chatMessage.deleteMany({
      where: { createdAt: { lt: threshold } },
    });
    if (result.count > 0) {
      this.logger.log(
        `[chat-cleanup] eliminados ${result.count} mensajes > ${MESSAGE_RETENTION_DAYS} días`,
      );
    }
  }
}
