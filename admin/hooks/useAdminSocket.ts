'use client';

import { useEffect, useRef } from 'react';
import { getAdminSocket, AdminNotificationPayload } from '@/lib/socket';

/**
 * Escucha notificaciones ADMIN y actividad administrativa del backend.
 * La actividad dispara una recarga autoritativa del listado y contador.
 *
 * @param onEvent  Callback que recibe el payload completo del evento.
 *                 Estabiliza la referencia con useCallback en el componente padre.
 */
export function useAdminSocket(
  onNotification: (payload: AdminNotificationPayload) => void,
  onAdminActivity?: () => void,
) {
  const notificationRef = useRef(onNotification);
  const activityRef = useRef(onAdminActivity);
  useEffect(() => {
    notificationRef.current = onNotification;
  }, [onNotification]);
  useEffect(() => {
    activityRef.current = onAdminActivity;
  }, [onAdminActivity]);

  useEffect(() => {
    // Solo ejecutar en el cliente (Next.js puede renderizar en servidor)
    if (typeof window === 'undefined') return;

    const socket = getAdminSocket();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    // Algunos flujos emiten ambos eventos seguidos. Una sola recarga
    // autoritativa evita requests y contadores duplicados.
    const scheduleRefresh = () => {
      if (!activityRef.current) return;
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => activityRef.current?.(), 120);
    };

    const notificationHandler = (payload: AdminNotificationPayload) => {
      // Filtrar: solo procesar notificaciones dirigidas al admin
      if (payload.targetRole === 'ADMIN') {
        notificationRef.current(payload);
        scheduleRefresh();
      }
    };
    const adminEventHandler = () => scheduleRefresh();
    const connectHandler = () => scheduleRefresh();

    socket.on('notification', notificationHandler);
    socket.on('adminEvent', adminEventHandler);
    socket.on('connect', connectHandler);
    if (!socket.connected) socket.connect();

    return () => {
      socket.off('notification', notificationHandler);
      socket.off('adminEvent', adminEventHandler);
      socket.off('connect', connectHandler);
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, []); // sin dependencias: se monta/desmonta una vez
}
