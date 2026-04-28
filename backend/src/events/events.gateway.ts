import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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
}

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  emitProviderStatusChanged(data: {
    id: number;
    businessName: string;
    verificationStatus: string;
    isVerified: boolean;
  }) {
    this.server.emit('providerStatusChanged', data);
  }

  /**
   * Emite a todos los clientes conectados que el usuario con [userId]
   * ha sido desactivado. La app móvil filtra por su propio userId
   * y cierra sesión si coincide.
   */
  /** Cliente se une a su sala personal para recibir notificaciones dirigidas. */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.userId) {
      client.join(`user_${data.userId}`);
    }
  }

  emitUserDeactivated(userId: number) {
    this.server.emit('userDeactivated', { userId });
  }

  /**
   * Notificación genérica.
   * Si tiene targetUserId, emite solo a la sala user_{id} (cliente unido vía joinRoom).
   * Si no, broadcast a todos (filtrado posterior en el cliente por targetRole).
   */
  emitNotification(payload: NotificationPayload) {
    if (payload.targetUserId) {
      this.server.to(`user_${payload.targetUserId}`).emit('notification', payload);
    } else {
      this.server.emit('notification', payload);
    }
  }

  /**
   * Evento broadcast para el panel de administración.
   * Solo el panel admin escucha 'adminEvent'.
   */
  emitAdminEvent(event: 'NEW_PROVIDER' | 'PROVIDER_APPROVED' | 'PROVIDER_REJECTED' | 'PROVIDER_DELETED' | 'NEW_PLAN_REQUEST' | 'PLAN_APPROVED' | 'PLAN_CANCELADO' | 'METRICS_CHANGED' | 'USER_PENDING' | 'NEW_USER_VERIFIED' | 'NEW_YAPE_PAYMENT', data?: Record<string, unknown>) {
    this.server.emit('adminEvent', { event, data, timestamp: new Date().toISOString() });
  }

  /**
   * Broadcast nueva solicitud de subasta a todos los proveedores conectados.
   * El cliente Flutter filtra por categoryId y distancia.
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
    this.server.emit('subastaNew', data);
  }
}
