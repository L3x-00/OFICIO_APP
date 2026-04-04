'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, HelpCircle, ShieldOff,
  Bell, BellOff, Loader2, ChevronLeft, ChevronRight, CheckCheck,
} from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem,
} from '@/lib/api';

const TYPE_CONFIG: Record<
  NotificationItem['type'],
  { icon: any; label: string; color: string; bg: string; border: string }
> = {
  APROBADO: {
    icon: CheckCircle,
    label: 'Aprobado',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  RECHAZADO: {
    icon: XCircle,
    label: 'Rechazado',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  MAS_INFO: {
    icon: HelpCircle,
    label: 'Más info',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  VERIFICACION_REVOCADA: {
    icon: ShieldOff,
    label: 'Revocado',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
};

export function NotificationsList() {
  const [items, setItems]           = useState<NotificationItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [lastPage, setLastPage]     = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage]             = useState(1);
  const [isLoading, setIsLoading]   = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getNotifications(page);
      setItems(data.data);
      setTotal(data.total);
      setLastPage(data.lastPage);
      setUnreadCount(data.unreadCount);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {unreadCount > 0 ? (
            <span className="flex items-center gap-2 text-sm font-medium text-orange-400">
              <Bell size={15} />
              {unreadCount} sin leer
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <BellOff size={15} />
              Todo leído
            </span>
          )}
          <span className="text-gray-700 text-xs">/ {total} total</span>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 text-gray-400 text-sm hover:text-white hover:border-white/20 transition-all"
          >
            {markingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
            Marcar todo como leído
          </button>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-12 text-center">
          <Bell className="mx-auto mb-3 text-gray-700" size={28} />
          <p className="text-gray-600">No hay notificaciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const cfg = TYPE_CONFIG[n.type];
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={`bg-[#1a1a1a] rounded-2xl border transition-all ${
                  n.isRead ? 'border-white/5' : 'border-orange-500/20 bg-orange-500/[0.03]'
                }`}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Icono tipo */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                    <Icon size={15} className={cfg.color} />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      <span className="text-sm font-semibold text-white truncate">
                        {n.provider.businessName}
                      </span>
                      <span className="text-xs text-gray-600">
                        {n.provider.user.firstName} {n.provider.user.lastName}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-700 mt-1">{fmt(n.sentAt)}</p>
                  </div>

                  {/* Marcar leído */}
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      title="Marcar como leído"
                      className="p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-gray-300 transition-all flex-shrink-0"
                    >
                      <CheckCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {lastPage > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-[#1a1a1a] border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-400">Página {page} de {lastPage}</span>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage}
            className="p-2 rounded-lg bg-[#1a1a1a] border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
