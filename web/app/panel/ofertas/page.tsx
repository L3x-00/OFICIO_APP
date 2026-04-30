'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Zap, MapPin, Clock, DollarSign, Send, X, Inbox, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { offerSchema } from '@/lib/validators';
import type { Opportunity } from '@/lib/types';

export default function PanelOfertasPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getOpportunities();
        setOpportunities(data);
      } catch {
        toast.error('Error al cargar oportunidades');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async () => {
    if (!selectedOpp) return;
    const result = offerSchema.safeParse({
      price: Number(price),
      message,
    });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || 'Datos inválidos');
      return;
    }
    setSending(true);
    try {
      await api.submitOffer({
        serviceRequestId: selectedOpp.id,
        price: Number(price),
        message,
      });
      toast.success('Oferta enviada con éxito');
      setSelectedOpp(null);
      setPrice('');
      setMessage('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar oferta');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-9 w-48 rounded" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-4xl">
      <div data-reveal>
        <h1 className="text-3xl font-extrabold text-text-primary flex items-center gap-3">
          <Zap className="text-primary" size={28} />
          Oportunidades
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Postula a solicitudes de clientes en tu zona.
        </p>
      </div>

      {opportunities.length === 0 ? (
        <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center animate-float-slow">
            <Inbox size={36} className="text-text-muted/50" />
          </div>
          <h3 className="text-text-primary font-semibold text-lg mb-2">
            No hay oportunidades disponibles
          </h3>
          <p className="text-text-muted text-sm max-w-sm mx-auto">
            Vuelve pronto. Las nuevas solicitudes de clientes en tu zona aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {opportunities.map((opp, i) => {
            const expiringSoon =
              new Date(opp.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
            return (
              <div
                key={opp.id}
                data-reveal
                className={`reveal-delay-${(i % 6) + 1} group bg-bg-card border border-white/5 rounded-2xl p-5 hover:border-primary/30 hover-lift transition-all duration-300 relative overflow-hidden border-l-4 border-l-green/60`}
              >
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green bg-green/15 border border-green/30 px-2 py-0.5 rounded-full">
                      Abierta
                    </span>
                    <h3 className="text-text-primary font-semibold mt-2 text-base">
                      {opp.category?.name || 'Sin categoría'}
                    </h3>
                  </div>
                  <span
                    className={`text-xs flex items-center gap-1 flex-shrink-0 ${
                      expiringSoon ? 'text-red font-semibold' : 'text-text-muted'
                    }`}
                  >
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(opp.expiresAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
                <p className="text-text-secondary text-sm mb-4 leading-relaxed line-clamp-2">
                  {opp.description}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted mb-4">
                  {opp.distanceKm != null && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-primary" /> {opp.distanceKm.toFixed(1)} km
                    </span>
                  )}
                  {(opp.budgetMin || opp.budgetMax) && (
                    <span className="flex items-center gap-1 font-semibold text-text-secondary">
                      <DollarSign size={12} className="text-green" /> S/. {opp.budgetMin ?? 0} – S/.{' '}
                      {opp.budgetMax ?? 0}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedOpp(opp)}
                  className="btn-primary press-effect px-5 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Send size={14} />
                  Postular
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-md animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">Enviar oferta</h2>
              <button
                onClick={() => setSelectedOpp(null)}
                className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-text-secondary text-sm mb-5 bg-bg-input/60 border border-white/5 rounded-xl p-3">
              {selectedOpp.description}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
                  Precio
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">
                    S/.
                  </span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-bg-input border border-white/8 rounded-xl pl-12 pr-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.12)] transition-all"
                    placeholder="50"
                    min={0}
                  />
                </div>
              </div>
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
                  Mensaje
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full bg-bg-input border border-white/8 rounded-xl p-3 text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.12)] transition-all resize-none"
                  placeholder="Describe tu propuesta y experiencia..."
                />
                <p className={`text-xs tabular-nums mt-1 text-right ${message.length > 450 ? 'text-amber' : 'text-text-muted'}`}>
                  {message.length}/500
                </p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setSelectedOpp(null)}
                  className="text-text-muted hover:text-text-secondary px-4 py-2 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={sending}
                  className="btn-primary press-effect px-6 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Enviar oferta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
