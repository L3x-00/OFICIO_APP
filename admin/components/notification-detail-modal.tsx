'use client';

import { X, CheckCircle, XCircle, HelpCircle, ShieldOff, Building2,
  Briefcase, User, Calendar, MessageSquare } from 'lucide-react';
import { NotificationItem, markNotificationRead } from '@/lib/api';

interface Props {
  notification: NotificationItem | null;
  onClose: () => void;
  onRead: (id: number) => void;
}

const TYPE_CONFIG: Record<
  NotificationItem['type'],
  { icon: any; label: string; color: string; bg: string; border: string; description: string }
> = {
  APROBADO: {
    icon: CheckCircle,
    label: 'Perfil Aprobado',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/25',
    description: 'El perfil del proveedor fue revisado y aprobado por un administrador.',
  },
  RECHAZADO: {
    icon: XCircle,
    label: 'Solicitud Rechazada',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
    description: 'La solicitud de verificación fue rechazada.',
  },
  MAS_INFO: {
    icon: HelpCircle,
    label: 'Información Adicional',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
    description: 'El administrador solicitó información adicional antes de aprobar.',
  },
  VERIFICACION_REVOCADA: {
    icon: ShieldOff,
    label: 'Verificación Revocada',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
    description: 'La verificación previamente otorgada fue revocada por un administrador.',
  },
  PLAN_APROBADO: {
    icon: CheckCircle,
    label: 'Plan Aprobado',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/25',
    description: 'El pago fue verificado y el plan fue activado.',
  },
  PLAN_RECHAZADO: {
    icon: XCircle,
    label: 'Plan Rechazado',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
    description: 'El comprobante de pago no pudo ser verificado.',
  },
  PLAN_SOLICITADO: {
    icon: HelpCircle,
    label: 'Plan Solicitado',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    description: 'El proveedor envió un comprobante de pago para cambio de plan.',
  },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function NotificationDetailModal({ notification, onClose, onRead }: Props) {
  if (!notification) return null;

  const cfg = TYPE_CONFIG[notification.type];
  const Icon = cfg.icon;

  const handleMarkRead = async () => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        onRead(notification.id);
      } catch {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${cfg.bg} ${cfg.border}`}>
              <Icon size={16} className={cfg.color} />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">{cfg.label}</h2>
              {!notification.isRead && (
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Sin leer</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Descripción del tipo */}
          <div className={`rounded-xl p-3 ${cfg.bg} border ${cfg.border}`}>
            <p className={`text-sm ${cfg.color}`}>{cfg.description}</p>
          </div>

          {/* Proveedor */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Proveedor</h3>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
                <Building2 size={16} className="text-purple-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{notification.provider.businessName}</p>
                <p className="text-gray-500 text-xs">
                  {notification.provider.user.firstName} {notification.provider.user.lastName}
                </p>
              </div>
            </div>
          </section>

          {/* Mensaje completo */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Mensaje enviado al proveedor</h3>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex gap-3">
              <MessageSquare size={16} className="text-gray-600 flex-shrink-0 mt-0.5" />
              <p className="text-gray-300 text-sm leading-relaxed">{notification.message}</p>
            </div>
          </section>

          {/* Fecha */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Fecha de envío</h3>
            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3">
              <Calendar size={14} className="text-purple-400" />
              <p className="text-white text-sm">{fmt(notification.sentAt)}</p>
            </div>
          </section>

          {/* Acción */}
          <button
            onClick={handleMarkRead}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
              notification.isRead
                ? 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10'
                : 'bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25'
            }`}
          >
            {notification.isRead ? 'Cerrar' : '✓ Marcar como leído y cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
