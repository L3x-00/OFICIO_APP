import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

// Misma lógica de orígenes que main.ts: lista en prod, abierto en dev.
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins: string[] | boolean = isProd
  ? (process.env.ALLOWED_ORIGINS ?? 'https://admin.tudominio.com')
      .split(',')
      .map((o) => o.trim())
  : true;

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  /** Si está presente, solo el usuario con este id debe mostrarlo */
  targetUserId?: number;
  /** Si está presente, solo usuarios con este rol deben mostrarlo (ej: 'ADMIN') */
  targetRole?: string;
  /** Si está presente, solo el perfil de este tipo (OFICIO|NEGOCIO) debe procesarlo */
  targetProfileType?: string;
  /** Plan asociado al evento (`ESTANDAR`/`PREMIUM`). Lo usa la app para
   * elegir el set de slides del carrousel de bienvenida. */
  plan?: string;
  /** Avatar del remitente — usado por CHAT_MESSAGE para reemplazar el
   * icono genérico del inbox con la foto del usuario que envía. */
  avatarUrl?: string;
}

interface SocketUser {
  userId: number;
  email: string;
  role: string;
}

// Extiende Socket.data para tipar lo que guardamos tras el handshake
type AuthSocket = Socket & { data: { user?: SocketUser } };

@WebSocketGateway({
  cors: { origin: allowedOrigins, credentials: true },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /// Tipos de notificación que algún servicio YA persiste en
  /// adminNotification por su cuenta — el gateway no debe re-persistirlos
  /// (evita filas duplicadas). CHAT_MESSAGE está acá: el chat tiene su
  /// propia persistencia en chat_messages y la fila de alerta en
  /// adminNotification la crea `chat.service.ts.sendMessage()` justo
  /// después de insertar el mensaje. Mantener al gateway fuera de ese
  /// path evita race conditions con el send + dos posibles filas
  /// (orden de Promise.allSettled vs. emisión sincrónica del WS).
  private static readonly _skipPersist = new Set<string>([
    'PROVIDER_APPROVED', 'APROBADO',
    'PROVIDER_REJECTED', 'RECHAZADO',
    'PLAN_APROBADO', 'PLAN_RECHAZADO', 'PLAN_SOLICITADO',
    'MAS_INFO', 'VERIFICACION_REVOCADA',
    'NEW_REVIEW', 'NUEVA_OPORTUNIDAD',
    'OFERTA_ACEPTADA', 'OFFER_ACCEPTED',
    'CHAT_MESSAGE',
  ]);

  // ── HANDSHAKE: validar JWT antes de aceptar el socket ─────
  async handleConnection(client: AuthSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`[WS] connection sin token desde ${client.id}`);
        client.disconnect(true);
        return;
      }

      const secret = this.config.get<string>('JWT_SECRET');
      const payload = this.jwt.verify(token, { secret });

      // El token de acceso usa { sub, email, role } (ver auth.service.generateTokens)
      if (!payload?.sub || !payload?.email || !payload?.role) {
        this.logger.warn(`[WS] token incompleto desde ${client.id}`);
        client.disconnect(true);
        return;
      }

      client.data.user = {
        userId: Number(payload.sub),
        email:  String(payload.email),
        role:   String(payload.role),
      };

      // Sala personal automática (no depende de evento del cliente)
      client.join(`user_${client.data.user.userId}`);
      // Si es admin, lo unimos a 'admin' para emitAdminEvent
      if (client.data.user.role === 'ADMIN') client.join('admin');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'token inválido';
      this.logger.warn(`[WS] handshake rechazado (${client.id}): ${msg}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthSocket) {
    if (client.data?.user) {
      this.logger.log(`[WS] disconnect user=${client.data.user.userId}`);
    }
  }

  /** Extrae el token de auth.token o del header Authorization. */
  private extractToken(client: AuthSocket): string | null {
    const authObj = client.handshake.auth as Record<string, unknown> | undefined;
    const fromAuth = typeof authObj?.token === 'string' ? authObj.token : null;
    if (fromAuth) return fromAuth.replace(/^Bearer\s+/i, '');

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string') {
      return header.replace(/^Bearer\s+/i, '');
    }
    return null;
  }

  // ── EVENTOS DEL CLIENTE ────────────────────────────────────

  /**
   * Cliente puede pedir explícitamente unirse a su sala personal.
   * Se mantiene por compatibilidad con clientes existentes, pero ya no
   * confiamos en el body: usamos el userId validado del handshake.
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: AuthSocket) {
    const user = client.data.user;
    if (!user) return;
    client.join(`user_${user.userId}`);
    if (user.role === 'ADMIN') client.join('admin');
  }

  /**
   * Proveedores se unen a las salas de las categorías que les interesan
   * para recibir solo las subastas que les correspondan.
   */
  @SubscribeMessage('joinCategoryRooms')
  handleJoinCategoryRooms(
    @MessageBody() data: { categoryIds: number[] },
    @ConnectedSocket() client: AuthSocket,
  ) {
    if (!client.data.user) return;
    if (!Array.isArray(data?.categoryIds)) return;
    for (const id of data.categoryIds) {
      if (Number.isFinite(id)) client.join(`category_${id}`);
    }
  }

  // ── EMISIONES SERVER → CLIENTES ────────────────────────────

  emitProviderStatusChanged(data: {
    id: number;
    businessName: string;
    verificationStatus: string;
    isVerified: boolean;
  }) {
    this.server.emit('providerStatusChanged', data);
  }

  /**
   * Notifica a todos los clientes que el usuario [userId] fue desactivado.
   * La app móvil filtra por su propio userId y cierra sesión si coincide.
   */
  emitUserDeactivated(userId: number) {
    this.server.emit('userDeactivated', { userId });
  }

  /**
   * Notificación genérica.
   * - targetUserId → emite solo a `user_{id}`.
   * - targetRole === 'ADMIN' → emite solo a la sala 'admin'.
   * - sin target → broadcast (filtrado posterior por el cliente).
   */
  emitNotification(payload: NotificationPayload) {
    // Persistir las notificaciones dirigidas a un usuario concreto para
    // que sobrevivan al cierre de la app — funciona igual para clientes
    // (sin perfil de proveedor) que para proveedores. Se omiten los tipos
    // que algún servicio ya persiste, para no duplicar la fila.
    if (
      payload.targetUserId &&
      !EventsGateway._skipPersist.has(payload.type)
    ) {
      void this.prisma.adminNotification
        .create({
          data: {
            providerId:        null,
            targetUserId:      payload.targetUserId,
            type:              payload.type,
            title:             payload.title,
            message:           payload.body,
            targetProfileType: payload.targetProfileType ?? null,
          },
        })
        .catch(() => {
          /* si falla la persistencia, la notif en vivo igual se emite */
        });
    }

    if (payload.targetUserId) {
      this.server.to(`user_${payload.targetUserId}`).emit('notification', payload);
      return;
    }
    if (payload.targetRole === 'ADMIN') {
      this.server.to('admin').emit('notification', payload);
      return;
    }
    this.server.emit('notification', payload);
  }

  /**
   * Evento broadcast para el panel de administración. Solo los sockets
   * unidos a la sala 'admin' lo reciben (admins autenticados).
   */
  emitAdminEvent(
    event:
      | 'NEW_PROVIDER'
      | 'PROVIDER_APPROVED'
      | 'PROVIDER_REJECTED'
      | 'PROVIDER_DELETED'
      | 'NEW_PLAN_REQUEST'
      | 'PLAN_APPROVED'
      | 'PLAN_CANCELADO'
      | 'METRICS_CHANGED'
      | 'USER_PENDING'
      | 'NEW_USER_VERIFIED'
      | 'NEW_YAPE_PAYMENT'
      | 'NEW_MP_PAYMENT',  // pago MercadoPago auto-aprobado
    data?: Record<string, unknown>,
  ) {
    this.server.to('admin').emit('adminEvent', {
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Nueva solicitud de subasta. Solo los proveedores unidos a la sala
   * `category_${categoryId}` la reciben. El cliente Flutter sigue
   * filtrando por distancia localmente.
   */
  emitSubastaNew(data: {
    requestId: number;
    categoryId: number;
    categoryName: string;
    description: string;
    photoUrl: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    latitude: number | null;
    longitude: number | null;
    department: string | null;
    expiresAt: string;
  }) {
    this.server.to(`category_${data.categoryId}`).emit('subastaNew', data);
  }
}
