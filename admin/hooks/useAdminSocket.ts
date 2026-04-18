'use client';

import { useEffect, useRef } from 'react';
import { getAdminSocket, AdminNotificationPayload } from '@/lib/socket';

/**
 * Escucha eventos WebSocket del backend y llama `onEvent` cuando llega
 * una notificación dirigida al rol ADMIN (targetRole === 'ADMIN').
 *
 * @param onEvent  Callback que recibe el payload completo del evento.
 *                 Estabiliza la referencia con useCallback en el componente padre.
 */
export function useAdminSocket(
  onEvent: (payload: AdminNotificationPayload) => void,
) {
  // Guardamos la referencia mutable para no re-suscribir en cada render
  const callbackRef = useRef(onEvent);
  useEffect(() => { callbackRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    // Solo ejecutar en el cliente (Next.js puede renderizar en servidor)
    if (typeof window === 'undefined') return;

    const socket = getAdminSocket();

    const handler = (payload: AdminNotificationPayload) => {
      // Filtrar: solo procesar notificaciones dirigidas al admin
      if (payload.targetRole === 'ADMIN') {
        callbackRef.current(payload);
      }
    };

    socket.on('notification', handler);
    return () => { socket.off('notification', handler); };
  }, []); // sin dependencias: se monta/desmonta una vez
}
