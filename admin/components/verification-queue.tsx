'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, HelpCircle, ShieldOff,
  Loader2, FileText, Image, Phone, Mail, MapPin,
  ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import {
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  requestMoreInfo,
  revokeVerification,
  VerificationProvider,
  getProviders,
  Provider,
} from '@/lib/api';
import { toast } from 'sonner';

type Tab = 'pending' | 'verified';

type Action = 'approve' | 'reject' | 'info' | 'revoke' | null;

interface ModalState {
  provider: VerificationProvider | Provider;
  action: Exclude<Action, 'approve' | null>;
}

export function VerificationQueue() {
  const [tab, setTab]             = useState<Tab>('pending');
  const [pending, setPending]     = useState<VerificationProvider[]>([]);
  const [verified, setVerified]   = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [actionId, setActionId]   = useState<number | null>(null);
  const [modal, setModal]         = useState<ModalState | null>(null);
  const [reason, setReason]       = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const loadPending = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPendingVerifications();
      setPending(data);
    } catch (e: any) {
      toast.error(e?.message || 'Error al cargar solicitudes pendientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadVerified = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getProviders(1, undefined);
      setVerified(data.data.filter((p) => p.isVerified));
    } catch (e: any) {
      toast.error(e?.message || 'Error al cargar proveedores verificados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'pending') loadPending();
    else loadVerified();
  }, [tab, loadPending, loadVerified]);

  const handleApprove = async (id: number) => {
    setActionId(id);
    try {
      await approveVerification(id);
      await loadPending();
    } catch (e: any) {
      toast.error(e?.message || 'Error al aprobar la verificación');
    } finally {
      setActionId(null);
    }
  };

  const handleModalSubmit = async () => {
    if (!modal) return;
    if (!reason.trim()) {
      toast.error('Por favor ingresa un motivo');
      return;
    }
    setModalLoading(true);
    try {
      const id = modal.provider.id;
      if (modal.action === 'reject') await rejectVerification(id, reason);
      else if (modal.action === 'info') await requestMoreInfo(id, reason);
      else if (modal.action === 'revoke') await revokeVerification(id, reason);
      toast.success('Acción completada correctamente');
      setModal(null);
      setReason('');
      if (tab === 'pending') await loadPending();
      else await loadVerified();
    } catch (e: any) {
      toast.error(e?.message || 'Error al procesar la acción');
    } finally {
      setModalLoading(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

  const DOC_TYPE_LABELS: Record<string, string> = {
    dni: 'DNI / Identificación',
    antecedentes: 'Antecedentes penales',
    certificado: 'Certificado profesional',
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('pending')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === 'pending'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-[#1a1a1a] text-gray-400 border border-white/5 hover:border-white/15'
          }`}
        >
          Pendientes {pending.length > 0 && `(${pending.length})`}
        </button>
        <button
          onClick={() => setTab('verified')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === 'verified'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-[#1a1a1a] text-gray-400 border border-white/5 hover:border-white/15'
          }`}
        >
          Verificados {verified.length > 0 && `(${verified.length})`}
        </button>
        <button
          onClick={() => tab === 'pending' ? loadPending() : loadVerified()}
          className="ml-auto p-2.5 rounded-xl bg-[#1a1a1a] border border-white/5 text-gray-500 hover:text-white transition-all"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : tab === 'pending' ? (
        // ── PENDIENTES ──────────────────────────────────────────
        pending.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-12 text-center">
            <CheckCircle className="mx-auto mb-3 text-green-500" size={32} />
            <p className="text-gray-400 font-medium">No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <div key={p.id} className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden">
                {/* Header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <span className="text-orange-400 font-bold text-sm">
                        {p.businessName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{p.businessName}</p>
                      <p className="text-xs text-gray-500">
                        {p.user.firstName} {p.user.lastName} · {p.category.name} · {p.locality.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600">{fmt(p.createdAt)}</span>
                    {expanded === p.id ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                  </div>
                </div>

                {/* Detalle expandido */}
                {expanded === p.id && (
                  <div className="border-t border-white/5 p-5 space-y-4">
                    {/* Info básica */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail size={13} className="text-gray-600" />
                        {p.user.email}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone size={13} className="text-gray-600" />
                        {p.phone}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin size={13} className="text-gray-600" />
                        {p.locality.name}
                      </div>
                      <div className="text-gray-400">
                        Tipo: <span className="text-gray-300">{p.type}</span>
                      </div>
                    </div>

                    {p.description && (
                      <p className="text-sm text-gray-400 bg-white/[0.02] rounded-xl p-3">
                        {p.description}
                      </p>
                    )}

                    {/* Documentos */}
                    {p.verificationDocs.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Documentos adjuntos</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {p.verificationDocs.map((doc) => (
                            <a
                              key={doc.id}
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:border-blue-500/30 transition-all"
                            >
                              <FileText size={14} className="text-blue-400 flex-shrink-0" />
                              <div className="overflow-hidden">
                                <p className="text-sm text-gray-300 truncate">
                                  {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                                </p>
                                <p className={`text-xs ${doc.status === 'APROBADO' ? 'text-green-400' : doc.status === 'RECHAZADO' ? 'text-red-400' : 'text-yellow-400'}`}>
                                  {doc.status}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(p.id)}
                        disabled={actionId === p.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/15 text-green-400 border border-green-500/25 text-sm font-bold hover:bg-green-500/25 transition-all disabled:opacity-50"
                      >
                        {actionId === p.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                        Aprobar
                      </button>
                      <button
                        onClick={() => setModal({ provider: p, action: 'reject' })}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/25 text-sm font-bold hover:bg-red-500/25 transition-all"
                      >
                        <XCircle size={13} /> Rechazar
                      </button>
                      <button
                        onClick={() => setModal({ provider: p, action: 'info' })}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 text-sm font-bold hover:bg-blue-500/25 transition-all"
                      >
                        <HelpCircle size={13} /> Pedir más info
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        // ── VERIFICADOS ────────────────────────────────────────
        verified.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-12 text-center">
            <p className="text-gray-600">No hay proveedores verificados aún</p>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr>
                  {['Proveedor', 'Categoría', 'Localidad', 'Acciones'].map((h) => (
                    <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {verified.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-white text-sm">{p.businessName}</div>
                      <div className="text-xs text-gray-500">{p.user?.email}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-400">{p.category.name}</td>
                    <td className="p-4 text-sm text-gray-400">{p.locality.name}</td>
                    <td className="p-4">
                      <button
                        onClick={() => setModal({ provider: p as any, action: 'revoke' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-all"
                      >
                        <ShieldOff size={12} /> Revocar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal de motivo */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              {modal.action === 'reject' && 'Rechazar verificación'}
              {modal.action === 'info' && 'Solicitar más información'}
              {modal.action === 'revoke' && 'Revocar verificación'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {(modal.provider as any).businessName}
            </p>

            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              {modal.action === 'info' ? 'Información requerida' : 'Motivo'}
              <span className="text-red-400 ml-1">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder={
                modal.action === 'reject'
                  ? 'Ej: Documentos ilegibles, información incompleta...'
                  : modal.action === 'info'
                  ? 'Ej: Por favor adjuntar foto del DNI y certificado de estudios...'
                  : 'Ej: Se detectó información fraudulenta...'
              }
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/40 transition-all resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setModal(null); setReason(''); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:border-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={modalLoading || !reason.trim()}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  modal.action === 'reject' || modal.action === 'revoke'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                }`}
              >
                {modalLoading && <Loader2 size={14} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
