'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, HelpCircle, ShieldOff,
  Bell, BellOff, Loader2, ChevronLeft, ChevronRight, CheckCheck,
  CreditCard, RefreshCw, AlertCircle, Megaphone, UserPlus, Gift,
  CalendarRange, X,
  type LucideIcon,
} from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem,
} from '@/lib/api';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import dynamic from 'next/dynamic';

const NotificationDetailModal = dynamic(
  () => import('./notification-detail-modal').then((m) => m.NotificationDetailModal),
  { ssr: false },
);

const TYPE_CONFIG: Record<string, { icon: LucideIcon; label: string; color: string; bg: string; border: string }> = {
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
  PLAN_APROBADO: {
    icon: CreditCard,
    label: 'Plan aprobado',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  PLAN_RECHAZADO: {
    icon: XCircle,
    label: 'Plan rechazado',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  PLAN_SOLICITADO: {
    icon: CreditCard,
    label: 'Plan solicitado',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  BROADCAST_LOG: {
    icon: Megaphone,
    label: 'Broadcast',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  NUEVO_PROVEEDOR: {
    icon: UserPlus,
    label: 'Nuevo proveedor',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  YAPE_PAYMENT_SUBMITTED: {
    icon: CreditCard,
    label: 'Pago Yape',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  REFERRAL_CODE_USED: {
    icon: Gift,
    label: 'Referido',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
  REFERRAL_ADMIN_APPROVED: {
    icon: Gift,
    label: 'Referido aprobado',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  NEW_USER_VERIFIED: {
    icon: UserPlus,
    label: 'Nuevo usuario',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  USER_PENDING: {
    icon: UserPlus,
    label: 'Registro en proceso',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
};

/**
 * Mensaje desde la perspectiva del admin. Antes el listado mostraba
 * el `message` crudo del backend ("Tu perfil X fue aprobado") que está
 * escrito en segunda persona porque también lo lee el proveedor en su
 * inbox. Acá lo reescribimos para el panel admin.
 */
function buildAdminMessage(n: NotificationItem): string {
  const biz = n.provider?.businessName?.trim();
  const fallback = n.message;
  switch (n.type) {
    case 'APROBADO':
      return biz ? `Aprobaste el perfil de ${biz}` : 'Aprobaste un perfil';
    case 'RECHAZADO':
      return biz ? `Rechazaste el perfil de ${biz}` : 'Rechazaste un perfil';
    case 'MAS_INFO':
      return biz
        ? `Solicitaste más información a ${biz}`
        : 'Solicitaste más información a un proveedor';
    case 'VERIFICACION_REVOCADA':
      return biz
        ? `Revocaste la verificación de ${biz}`
        : 'Revocaste una verificación';
    case 'PLAN_APROBADO':
      return biz
        ? `Aprobaste el plan solicitado por ${biz}`
        : 'Aprobaste una solicitud de plan';
    case 'PLAN_RECHAZADO':
      return biz
        ? `Rechazaste el plan solicitado por ${biz}`
        : 'Rechazaste una solicitud de plan';
    case 'PLAN_SOLICITADO':
      return biz ? `${biz} solicitó un cambio de plan` : 'Nueva solicitud de plan';
    case 'BROADCAST_LOG':
      // El backend ya persiste el título completo "Enviaste una
      // notificación a todos los usuarios: …" — lo usamos directo.
      return n.title?.trim() || fallback;
    default:
      return fallback;
  }
}

const DEFAULT_TYPE_CFG = {
  icon: Bell,
  label: 'Notificación',
  color: 'text-gray-400',
  bg: 'bg-white/5',
  border: 'border-white/10',
};

function toIsoBoundary(value: string, endOfDay: boolean): string | undefined {
  if (!value) return undefined;
  const time = endOfDay ? '23:59:59.999' : '00:00:00.000';
  const date = new Date(`${value}T${time}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function NotificationsList() {
  const [items, setItems]           = useState<NotificationItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [lastPage, setLastPage]     = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage]             = useState(1);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [viewingNotif, setViewingNotif] = useState<NotificationItem | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const invalidRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (invalidRange) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await getNotifications({
        page,
        from: toIsoBoundary(dateFrom, false),
        to: toIsoBoundary(dateTo, true),
      });
      setItems(data.data);
      setTotal(data.total);
      setLastPage(data.lastPage);
      setUnreadCount(data.unreadCount);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, invalidRange, page]);

  useEffect(() => { load(); }, [load]);

  // Refresco silencioso (sin spinner) de la página actual — lo dispara el
  // socket admin cuando el backend persiste/emite una nueva notificación
  // (registro, pago Yape, referido, etc.) → el panel se actualiza en vivo.
  const refresh = useCallback(async () => {
    if (invalidRange) return;
    try {
      const data = await getNotifications({
        page,
        from: toIsoBoundary(dateFrom, false),
        to: toIsoBoundary(dateTo, true),
      });
      setItems(data.data);
      setTotal(data.total);
      setLastPage(data.lastPage);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silencioso: el botón "Actualizar" y la próxima navegación reintentan.
    }
  }, [dateFrom, dateTo, invalidRange, page]);

  useAdminSocket(() => {}, refresh);

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    // Snapshot por si el backend falla — revertimos para no mentirle
    // al admin sobre el estado real de su inbox.
    const prevItems = items;
    const prevUnread = unreadCount;
    setItems((p) => p.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err: unknown) {
      setItems(prevItems);
      setUnreadCount(prevUnread);
      setError(err instanceof Error ? err.message : 'No se pudo marcar todo como leído');
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl bg-[#1a1a1a] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            title="Actualizar"
          >
            <RefreshCw size={13} />
          </button>
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
      </div>

      <div className="flex flex-wrap items-end gap-3 border-y border-white/5 py-3">
        <CalendarRange size={16} className="mb-2.5 text-gray-500" />
        <label className="grid gap-1 text-xs text-gray-500">
          <span>Desde</span>
          <input
            aria-label="Desde"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-white/10 bg-[#151515] px-3 text-sm text-gray-200 [color-scheme:dark] focus:border-blue-500/60 focus:outline-none"
          />
        </label>
        <label className="grid gap-1 text-xs text-gray-500">
          <span>Hasta</span>
          <input
            aria-label="Hasta"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-white/10 bg-[#151515] px-3 text-sm text-gray-200 [color-scheme:dark] focus:border-blue-500/60 focus:outline-none"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setPage(1);
            }}
            className="mb-0.5 grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-gray-500 transition-colors hover:border-white/20 hover:text-white"
            title="Limpiar rango"
            aria-label="Limpiar rango"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {invalidRange && (
        <p role="alert" className="text-sm text-red-400">
          La fecha inicial no puede ser posterior a la fecha final.
        </p>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-center gap-4">
          <AlertCircle size={20} className="text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 font-semibold text-sm">Error de conexión</p>
            <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-all"
          >
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      )}

      {/* Lista / Contenedor principal */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : !error && items.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-12 text-center">
          <Bell className="mx-auto mb-3 text-gray-700" size={28} />
          <p className="text-gray-600">No hay notificaciones</p>
        </div>
      ) : !error ? (
        <div className="space-y-2">
          {items.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_TYPE_CFG;
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                onClick={() => setViewingNotif(n)}
                className={`bg-[#1a1a1a] rounded-2xl border transition-all cursor-pointer hover:border-white/15 ${
                  n.isRead ? 'border-white/5' : 'border-orange-500/20 bg-orange-500/[0.03]'
                }`}
              >
                <div className="flex items-start gap-4 p-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                    <Icon size={15} className={cfg.color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      {n.provider?.businessName && (
                        <span className="text-sm font-semibold text-white truncate">
                          {n.provider.businessName}
                        </span>
                      )}
                      {(n.provider?.user?.firstName || n.provider?.user?.lastName) && (
                        <span className="text-xs text-gray-600">
                          {n.provider?.user?.firstName} {n.provider?.user?.lastName}
                        </span>
                      )}
                    </div>
                    {/* Headline: mensaje en perspectiva-admin generado a
                        partir del tipo. BROADCAST_LOG cae al título que
                        ya escribe el backend. */}
                    <p className="text-sm font-medium text-white/90 mb-0.5">
                      {buildAdminMessage(n)}
                    </p>
                    {/* Mostramos también el message original como
                        contexto secundario salvo en BROADCAST_LOG donde
                        ya es el cuerpo del broadcast (lo dejamos). */}
                    {n.message && n.message !== buildAdminMessage(n) && (
                      <p className="text-sm text-gray-400 line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-xs text-gray-700 mt-1">{fmt(n.sentAt)}</p>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
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
      ) : null}

      <NotificationDetailModal
        notification={viewingNotif}
        onClose={() => setViewingNotif(null)}
        onRead={(id) => {
          setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
          setUnreadCount((c) => Math.max(0, c - 1));
        }}
      />

      {/* Paginación */}
      {lastPage > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
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
