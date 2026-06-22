'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  X, Clock, Loader2, AlertTriangle, ChevronRight, ArrowLeft,
  Bell, Send, CheckCircle, Building2,
} from 'lucide-react';
import {
  getExpiringProviders,
  notifyProvider,
  type ExpiringProvider,
} from '@/lib/api';

interface Props {
  onClose: () => void;
}

/** Mensaje pre-cargado del recordatorio de vencimiento. */
function reminderDraft(p: ExpiringProvider) {
  const dias =
    p.daysLeft <= 0
      ? 'hoy'
      : p.daysLeft === 1
        ? 'mañana'
        : `en ${p.daysLeft} días`;
  return {
    title: 'Tu plan está por vencer',
    message:
      `Hola ${p.ownerName || p.businessName}, tu plan ${p.plan} vence ${dias}. ` +
      `Renuévalo desde la app para que tu perfil "${p.businessName}" siga visible ` +
      `para los clientes. ¡No pierdas tus contactos!`,
  };
}

export function ExpiringProvidersModal({ onClose }: Props) {
  const [list, setList] = useState<ExpiringProvider[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ExpiringProvider | null>(null);

  // Estado del formulario de envío.
  const [mode, setMode] = useState<'EXPIRY_REMINDER' | 'ADMIN_MESSAGE'>('EXPIRY_REMINDER');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setList(await getExpiringProviders());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar la lista');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Al elegir proveedor, precargar el recordatorio de vencimiento.
  const pick = (p: ExpiringProvider) => {
    setSelected(p);
    setMode('EXPIRY_REMINDER');
    const d = reminderDraft(p);
    setTitle(d.title);
    setMessage(d.message);
    setSent(null);
    setSendError(null);
  };

  const switchMode = (m: 'EXPIRY_REMINDER' | 'ADMIN_MESSAGE') => {
    setMode(m);
    setSent(null);
    setSendError(null);
    if (m === 'EXPIRY_REMINDER' && selected) {
      const d = reminderDraft(selected);
      setTitle(d.title);
      setMessage(d.message);
    } else {
      setTitle('');
      setMessage('');
    }
  };

  const handleSend = async () => {
    if (!selected || !title.trim() || !message.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await notifyProvider(selected.providerId, {
        title: title.trim(),
        message: message.trim(),
        kind: mode,
      });
      setSent(
        `Notificación enviada a ${selected.businessName} en tiempo real.`,
      );
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  const back = () => {
    setSelected(null);
    setSent(null);
    setSendError(null);
  };

  const disabled = !title.trim() || !message.trim() || sending;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selected && (
              <button
                onClick={back}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition"
                aria-label="Volver"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-orange-500/10 border-orange-500/25">
              <Clock size={16} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">
                {selected ? selected.businessName : 'Vencimiento de planes'}
              </h2>
              <span className="text-[11px] text-gray-500">
                {selected
                  ? `${selected.ownerName || 'Proveedor'} · ${selected.plan}`
                  : 'Proveedores que vencen en los próximos 7 días'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {/* ─── Vista LISTA ─── */}
          {!selected && (
            <>
              {error && (
                <div className="flex items-center gap-2 text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm mb-3">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
              {!list && !error && (
                <div className="flex items-center justify-center py-10 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
              {list && list.length === 0 && (
                <div className="text-center py-10 text-gray-500 text-sm">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500/60" />
                  No hay proveedores por vencer en los próximos 7 días.
                </div>
              )}
              {list && list.length > 0 && (
                <ul className="space-y-2">
                  {list.map((p) => (
                    <li key={p.providerId}>
                      <button
                        onClick={() => pick(p)}
                        className="w-full flex items-center gap-3 text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-3 transition"
                      >
                        <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Building2 size={15} className="text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">
                            {p.businessName}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            {p.category ?? p.type} · {p.locality ?? 'Sin ciudad'}
                          </p>
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                            p.daysLeft <= 1
                              ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                              : 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                          }`}
                        >
                          {p.daysLeft <= 0
                            ? 'Vence hoy'
                            : p.daysLeft === 1
                              ? 'Vence mañana'
                              : `${p.daysLeft} días`}
                        </span>
                        <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* ─── Vista ACCIÓN (proveedor seleccionado) ─── */}
          {selected && (
            <div className="space-y-4">
              {sent ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p className="text-white font-semibold text-sm">{sent}</p>
                  <div className="flex gap-2 justify-center mt-5">
                    <button
                      onClick={back}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-sm font-medium transition"
                    >
                      Volver a la lista
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-black text-sm font-semibold transition"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Toggle de acción */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => switchMode('EXPIRY_REMINDER')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition ${
                        mode === 'EXPIRY_REMINDER'
                          ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                          : 'bg-white/[0.03] text-gray-400 border-white/5 hover:bg-white/[0.06]'
                      }`}
                    >
                      <Clock size={14} /> Recordatorio
                    </button>
                    <button
                      onClick={() => switchMode('ADMIN_MESSAGE')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition ${
                        mode === 'ADMIN_MESSAGE'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : 'bg-white/[0.03] text-gray-400 border-white/5 hover:bg-white/[0.06]'
                      }`}
                    >
                      <Bell size={14} /> Notificación
                    </button>
                  </div>

                  {/* Título */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Título
                    </label>
                    <input
                      type="text"
                      value={title}
                      maxLength={120}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Título de la notificación"
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Mensaje */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">
                      Mensaje
                    </label>
                    <textarea
                      value={message}
                      maxLength={500}
                      rows={4}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Mensaje que recibirá el proveedor"
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:border-orange-500 focus:outline-none resize-none"
                    />
                    <p className="text-[11px] text-gray-600 mt-1">{message.length}/500</p>
                  </div>

                  {sendError && (
                    <div className="flex items-center gap-2 text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm">
                      <AlertTriangle size={14} /> {sendError}
                    </div>
                  )}

                  <button
                    onClick={handleSend}
                    disabled={disabled}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-400 text-black font-semibold px-4 py-2.5 rounded-lg transition"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {sending ? 'Enviando…' : 'Enviar en tiempo real'}
                  </button>
                  <p className="text-[11px] text-gray-600 leading-relaxed text-center">
                    Llega como push (app en segundo plano) y como notificación
                    en vivo si el proveedor tiene la app abierta. Queda guardada
                    en su bandeja.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
