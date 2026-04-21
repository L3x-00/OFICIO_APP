"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { getAdminSocket } from './socket';

export type AdminEventType =
  | 'NEW_PROVIDER'
  | 'PROVIDER_APPROVED'
  | 'PROVIDER_REJECTED'
  | 'NEW_PLAN_REQUEST'
  | 'PLAN_APPROVED'
  | 'METRICS_CHANGED'
  | 'USER_PENDING'
  | 'NEW_USER_VERIFIED';

export interface AdminEvent {
  event: AdminEventType;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface UseAdminRealtimeOptions {
  onEvent?: (ev: AdminEvent) => void;
  /** Si true, llama onRefresh automáticamente cuando llega cualquier adminEvent */
  autoRefresh?: boolean;
  onRefresh?: () => void;
}

export function useAdminRealtime({ onEvent, autoRefresh, onRefresh }: UseAdminRealtimeOptions = {}) {
  const [connected, setConnected]         = useState(false);
  const [lastEvent, setLastEvent]         = useState<AdminEvent | null>(null);
  const [pendingCount, setPendingCount]   = useState(0);
  const onEventRef   = useRef(onEvent);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { onEventRef.current   = onEvent;   }, [onEvent]);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const socket = getAdminSocket();

    function handleConnect()    { setConnected(true);  }
    function handleDisconnect() { setConnected(false); }

    function handleAdminEvent(ev: AdminEvent) {
      setLastEvent(ev);
      // Badge counter para NEW_PROVIDER / NEW_PLAN_REQUEST / USER_PENDING
      if (ev.event === 'NEW_PROVIDER' || ev.event === 'NEW_PLAN_REQUEST' || ev.event === 'USER_PENDING') {
        setPendingCount((c) => c + 1);
      }
      onEventRef.current?.(ev);
      if (autoRefresh) {
        onRefreshRef.current?.();
      }
    }

    // providerStatusChanged también dispara refresh
    function handleProviderStatusChanged() {
      if (autoRefresh) onRefreshRef.current?.();
    }

    socket.on('connect',                handleConnect);
    socket.on('disconnect',             handleDisconnect);
    socket.on('adminEvent',             handleAdminEvent);
    socket.on('providerStatusChanged',  handleProviderStatusChanged);

    // Estado inicial
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect',               handleConnect);
      socket.off('disconnect',            handleDisconnect);
      socket.off('adminEvent',            handleAdminEvent);
      socket.off('providerStatusChanged', handleProviderStatusChanged);
    };
  }, [autoRefresh]);

  const clearPending = useCallback(() => setPendingCount(0), []);

  return { connected, lastEvent, pendingCount, clearPending };
}
