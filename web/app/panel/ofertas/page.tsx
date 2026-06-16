'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, MapPin, Clock, DollarSign, Send, X, Inbox, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { offerSchema } from '@/lib/validators';
import type { Opportunity } from '@/lib/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
  }
};

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
        // FASE 4 #3: salvaguarda en frontend — nunca mostrar subastas
        // expiradas/cerradas aunque el backend las devolviera por cache.
        const now = Date.now();
        setOpportunities(
          data.filter(
            (o) => o.status === 'OPEN' && new Date(o.expiresAt).getTime() > now,
          ),
        );
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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-20 md:pb-0 max-w-4xl"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-extrabold text-white font-display tracking-tightest flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-sm">
            <Zap className="text-primary-light" size={22} />
          </div>
          Oportunidades
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Postula a solicitudes de clientes en tu zona.
        </p>
      </motion.div>

      {opportunities.length === 0 ? (
        <motion.div variants={itemVariants} className="glass rounded-xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl glass flex items-center justify-center animate-float-slow">
            <Inbox size={36} className="text-white/20" />
          </div>
          <h3 className="text-white font-semibold text-lg font-display mb-2">
            No hay oportunidades disponibles
          </h3>
          <p className="text-white/40 text-sm max-w-sm mx-auto">
            Vuelve pronto. Las nuevas solicitudes de clientes en tu zona aparecerán aquí.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {opportunities.map((opp) => {
            const expiringSoon =
              new Date(opp.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
            return (
              <motion.div
                key={opp.id}
                variants={itemVariants}
                className="group glass glass-hover rounded-xl p-5 relative overflow-hidden border-l-4 border-l-accent/40"
              >
                {/* Indicador de urgencia sutil */}
                {expiringSoon && (
                   <div className="absolute top-0 right-0 w-20 h-20 bg-rose/5 blur-2xl pointer-events-none" />
                )}

                <div className="flex items-start justify-between mb-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                      Abierta
                    </span>
                    <h3 className="text-white font-semibold mt-2 text-base font-display">
                      {opp.category?.name || 'Sin categoría'}
                    </h3>
                  </div>
                  <span
                    className={`text-xs flex items-center gap-1 flex-shrink-0 ${
                      expiringSoon ? 'text-rose-400 font-semibold' : 'text-white/40'
                    }`}
                  >
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(opp.expiresAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
                <p className="text-white/60 text-sm mb-4 leading-relaxed line-clamp-2">
                  {opp.description}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 mb-4">
                  {opp.distanceKm != null && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-accent" /> {opp.distanceKm.toFixed(1)} km
                    </span>
                  )}
                  {(opp.budgetMin || opp.budgetMax) && (
                    <span className="flex items-center gap-1.5 font-semibold text-primary-light">
                      <DollarSign size={12} className="text-primary" /> S/. {opp.budgetMin ?? 0} – S/.{' '}
                      {opp.budgetMax ?? 0}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedOpp(opp)}
                  className="btn btn-primary press-effect px-5 py-2 text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Send size={14} />
                  Postular
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de Postulación Framer Motion */}
      <AnimatePresence>
        {selectedOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              onClick={() => setSelectedOpp(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="relative glass rounded-2xl p-6 w-full max-w-md shadow-glow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white font-display">Enviar oferta</h2>
                <button
                  onClick={() => setSelectedOpp(null)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="text-white/60 text-sm mb-5 bg-white/[0.03] border border-white/5 rounded-xl p-3">
                {selectedOpp.description}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">
                    Precio
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-semibold">
                      S/.
                    </span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-3 py-3 text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                      placeholder="50"
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">
                    Mensaje
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={500}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                    placeholder="Describe tu propuesta y experiencia..."
                  />
                  <p className={`text-xs tabular-nums mt-1 text-right ${message.length > 450 ? 'text-amber' : 'text-white/30'}`}>
                    {message.length}/500
                  </p>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => setSelectedOpp(null)}
                    className="btn btn-ghost press-effect px-4 py-2 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    className="btn btn-primary press-effect px-6 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}