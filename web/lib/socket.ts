"use client";

import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "https://oficio-backend.onrender.com";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = getAccessToken();
    socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function reconnectWithToken(token: string): Socket {
  disconnectSocket();
  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
  });
  return socket;
}