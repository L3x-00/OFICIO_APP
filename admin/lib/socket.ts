import { io, Socket } from 'socket.io-client';

// Singleton: una sola conexión para todo el panel admin.
// Se inicializa lazy para evitar problemas con SSR de Next.js.
let _socket: Socket | null = null;

export function getAdminSocket(): Socket {
  if (_socket) return _socket;

  const url = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  _socket = io(url, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
  });

  return _socket;
}

export interface AdminNotificationPayload {
  type: string;
  title: string;
  body: string;
  targetUserId?: number;
  targetRole?: string;
  targetProfileType?: string;
}
