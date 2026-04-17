import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

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
  emitUserDeactivated(userId: number) {
    this.server.emit('userDeactivated', { userId });
  }

  /**
   * Notificación genérica. La app móvil filtra por targetUserId o targetRole.
   */
  emitNotification(payload: NotificationPayload) {
    this.server.emit('notification', payload);
  }
}
