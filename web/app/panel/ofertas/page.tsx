'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Zap, MapPin, Clock, DollarSign, Send } from 'lucide-react';
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-text-primary">Oportunidades</h1>

      {opportunities.length === 0 ? (
        <div className="bg-bg-card border border-white/5 rounded-card p-8 text-center">
          <Zap className="text-text-muted mx-auto mb-3" size={40} />
          <p className="text-text-secondary">No hay oportunidades disponibles en este momento.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-bg-card border border-white/5 rounded-card p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-semibold text-green bg-green/10 px-2 py-0.5 rounded-full">
                    Abierta
                  </span>
                  <h3 className="text-text-primary font-semibold mt-2">
                    {opp.category?.name || 'Sin categoría'}
                  </h3>
                </div>
                <span className="text-text-muted text-xs flex items-center gap-1">
                  <Clock size={12} />
                  {formatDistanceToNow(new Date(opp.expiresAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
              <p className="text-text-secondary text-sm mb-3">
                {opp.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted mb-4">
                {opp.distanceKm != null && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {opp.distanceKm.toFixed(1)} km
                  </span>
                )}
                {(opp.budgetMin || opp.budgetMax) && (
                  <span className="flex items-center gap-1">
                    <DollarSign size={12} /> S/. {opp.budgetMin ?? 0} - S/.{' '}
                    {opp.budgetMax ?? 0}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedOpp(opp)}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-button text-sm font-medium transition-colors"
              >
                Postular
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de postulación */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-bg-card border border-white/5 rounded-card p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-text-primary mb-4">
              Enviar oferta
            </h2>
            <p className="text-text-secondary text-sm mb-4">
              {selectedOpp.description}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary text-sm mb-1.5">
                  Precio (S/.)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-bg-input border border-white/5 rounded-button px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Ej: 50"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-1.5">
                  Mensaje
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full bg-bg-input border border-white/5 rounded-button p-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  placeholder="Describe tu propuesta..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setSelectedOpp(null)}
                  className="text-text-muted hover:text-text-secondary px-4 py-2 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={sending}
                  className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white px-6 py-2 rounded-button text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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