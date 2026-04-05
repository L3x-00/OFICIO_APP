'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Loader2, Clock, ShieldCheck,
} from 'lucide-react';
import {
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  type VerificationProvider,
} from '@/lib/api';
import { toast } from 'sonner';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PROFESSIONAL: { label: 'Profesional', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  BUSINESS:     { label: 'Negocio',     color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  OFICIO:       { label: 'Profesional', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  NEGOCIO:      { label: 'Negocio',     color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
};

interface Props {
  /** Se llama cada vez que se aprueba o rechaza un proveedor */
  onAction?: () => void;
}

interface RejectModal {
  id: number;
  name: string;
}

export function PendingApprovalsTable({ onAction }: Props) {
  const [items, setItems]           = useState<VerificationProvider[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actionId, setActionId]     = useState<number | null>(null);
  const [modal, setModal]           = useState<RejectModal | null>(null);
  const [reason, setReason]         = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setItems(await getPendingVerifications());
    } catch (e: any) {
      toast.error(e?.message || 'Error al cargar solicitudes pendientes');
    } finally {
      setLoading(false);
    }
  }

  function removeItem(id: number) {
    setItems(prev => prev.filter(p => p.id !== id));
    onAction?.();
  }

  async function handleApprove(id: number) {
    setActionId(id);
    try {
      await approveVerification(id);
      removeItem(id);
      toast.success('Proveedor aprobado y publicado en la app');
    } catch (e: any) {
      toast.error(e?.message || 'Error al aprobar');
    } finally {
      setActionId(null);
    }
  }

  async function handleRejectSubmit() {
    if (!modal) return;
    if (!reason.trim()) { toast.error('El motivo es obligatorio'); return; }
    setModalLoading(true);
    try {
      await rejectVerification(modal.id, reason);
      removeItem(modal.id);
      toast.success('Solicitud rechazada');
      setModal(null);
      setReason('');
    } catch (e: any) {
      toast.error(e?.message || 'Error al rechazar');
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() { setModal(null); setReason(''); }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

  // ── LOADING ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden">
        <div className="divide-y divide-white/5">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/5 rounded w-2/5" />
                <div className="h-2.5 bg-white/5 rounded w-1/3" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-white/5 rounded-xl" />
                <div className="h-8 w-20 bg-white/5 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── VACÍO ────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-10 flex flex-col items-center gap-2">
        <ShieldCheck className="text-green-500" size={28} />
        <p className="text-gray-400 text-sm font-medium">Sin solicitudes pendientes</p>
        <p className="text-gray-600 text-xs">Todos los proveedores están al día</p>
      </div>
    );
  }

  // ── TABLA ────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden">
        {/* Cabecera tabla */}
        <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 bg-white/[0.02] border-b border-white/5 text-xs font-bold text-gray-500 uppercase tracking-widest">
          <span>Negocio / Profesional</span>
          <span>Email</span>
          <span>Tipo</span>
          <span>Fecha</span>
          <span>Acciones</span>
        </div>

        <div className="divide-y divide-white/5">
          {items.map(p => {
            const typeInfo = TYPE_LABELS[p.type] ?? { label: p.type, color: 'text-gray-400 bg-white/5 border-white/10' };
            const isActing = actionId === p.id;

            return (
              <div
                key={p.id}
                className="flex flex-col md:grid md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-center gap-3 md:gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Nombre */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-400 font-bold text-sm">
                      {p.businessName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.businessName}</p>
                    <p className="text-xs text-gray-500 truncate md:hidden">{p.user.email}</p>
                    <p className="text-xs text-gray-600">{p.category.name} · {p.locality.name}</p>
                  </div>
                </div>

                {/* Email (solo desktop) */}
                <p className="hidden md:block text-sm text-gray-400 truncate">{p.user.email}</p>

                {/* Tipo */}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold self-start md:self-auto ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>

                {/* Fecha */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 self-start md:self-auto">
                  <Clock size={11} />
                  {fmt(p.createdAt)}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    onClick={() => handleApprove(p.id)}
                    disabled={isActing}
                    title="Aprobar"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/15 text-green-400 border border-green-500/25 text-xs font-bold hover:bg-green-500/25 disabled:opacity-50 transition-all"
                  >
                    {isActing
                      ? <Loader2 size={12} className="animate-spin" />
                      : <CheckCircle size={12} />
                    }
                    <span className="hidden sm:inline">Aprobar</span>
                  </button>
                  <button
                    onClick={() => setModal({ id: p.id, name: p.businessName })}
                    disabled={isActing}
                    title="Rechazar"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/25 text-xs font-bold hover:bg-red-500/25 disabled:opacity-50 transition-all"
                  >
                    <XCircle size={12} />
                    <span className="hidden sm:inline">Rechazar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de rechazo */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <XCircle size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Rechazar solicitud</h3>
                <p className="text-gray-500 text-sm truncate">{modal.name}</p>
              </div>
            </div>

            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Motivo del rechazo <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              placeholder="Ej: Documentos ilegibles, información incompleta, datos no verificables..."
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-red-500/40 transition-all resize-none mb-4"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:border-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={modalLoading || !reason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-bold hover:bg-red-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {modalLoading && <Loader2 size={14} className="animate-spin" />}
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
