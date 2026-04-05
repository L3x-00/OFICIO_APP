import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

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
}
