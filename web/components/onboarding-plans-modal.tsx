'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, X, Loader2, Smartphone, CreditCard, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { PLANS, type PlanInfo, type PlanId } from '@/lib/plans';
import YapePaymentModal from '@/components/yape-payment-modal';

interface Props {
  isOpen: boolean;
  providerType: 'OFICIO' | 'NEGOCIO';
  onClose: () => void;
  /** Plan listo (GRATIS elegido, comprobante Yape enviado o aprobación live). */
  onComplete: () => void;
}

type Step = 'plans' | 'method';

/**
 * Modal de selección de plan + pago al final del onboarding web (Punto 3).
 * GRATIS no requiere pago. ESTÁNDAR/PREMIUM → Yape (comprobante) o MercadoPago
 * (redirección a la pasarela). Mismos endpoints que el móvil.
 *
 * Punto 4 (tiempo real): mientras el modal está abierto, escucha el evento
 * `notification` del WebSocket; si llega `PLAN_APROBADO` (el admin aprobó el
 * pago) cierra el flujo al instante. La suscripción vive en el backend, así
 * que la app móvil con la misma cuenta ya reconoce al proveedor y su plan.
 */
export default function OnboardingPlansModal({ isOpen, providerType, onClose, onComplete }: Props) {
  const [step, setStep] = useState<Step>('plans');
  const [selected, setSelected] = useState<PlanInfo | null>(null);
  const [mpLoading, setMpLoading] = useState(false);
  const [yapeOpen, setYapeOpen] = useState(false);

  // Realtime: aprobación del plan mientras el usuario está en el flujo.
  useEffect(() => {
    if (!isOpen) return;
    const socket = getSocket();
    const onNotif = (n: { type?: string }) => {
      if (n?.type === 'PLAN_APROBADO') {
        toast.success('¡Tu plan fue activado!');
        onComplete();
      }
    };
    socket.on('notification', onNotif);
    return () => { socket.off('notification', onNotif); };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  const choosePlan = (p: PlanInfo) => {
    if (p.id === 'GRATIS') {
      toast.success('Plan Gratis activado. ¡Bienvenido!');
      onComplete();
      return;
    }
    setSelected(p);
    setStep('method');
  };

  const payWithMercadoPago = async () => {
    if (!selected || mpLoading) return;
    setMpLoading(true);
    try {
      const { initPoint } = await api.createMpPreference({
        plan: selected.id as Exclude<PlanId, 'GRATIS'>,
        providerType,
      });
      window.location.href = initPoint; // redirección a la pasarela
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar el pago');
      setMpLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative w-full max-w-lg bg-dark-surface/95 backdrop-blur-xl border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-glow-lg"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-white/5 bg-dark-surface/90 backdrop-blur-lg">
            <div className="flex items-center gap-2">
              {step === 'method' && (
                <button onClick={() => setStep('plans')} className="text-white/50 hover:text-white">
                  <ChevronLeft size={20} />
                </button>
              )}
              <div>
                <h2 className="text-lg font-display font-bold text-white">
                  {step === 'plans' ? 'Elige tu plan' : `Pagar plan ${selected?.label}`}
                </h2>
                <p className="text-white/40 text-xs">
                  {step === 'plans' ? 'Puedes cambiarlo después desde tu panel' : `S/ ${selected?.amount.toFixed(2)} / mes`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full glass flex items-center justify-center text-white/50 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {step === 'plans' ? (
            <div className="p-5 space-y-3">
              {PLANS.map((p) => (
                <button key={p.id} type="button" onClick={() => choosePlan(p)}
                  className="w-full text-left rounded-2xl border p-4 transition-all hover:scale-[1.01]"
                  style={{ borderColor: `${p.accent}66`, background: `${p.accent}14` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-[15px]">{p.label}</span>
                      {p.popular && (
                        <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full" style={{ background: `${p.accent}33`, color: p.accent }}>
                          <Star size={9} className="inline mr-0.5" />Popular
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-white font-extrabold text-lg">{p.price}</span>
                      <span className="text-white/40 text-[11px] block">{p.priceNote}</span>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-white/70 text-[12.5px]">
                        <Check size={13} style={{ color: p.accent }} /> {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
              <button onClick={onComplete} className="w-full text-center text-white/40 hover:text-white/70 text-[13px] py-2 transition-colors">
                Continuar sin elegir ahora
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              <p className="text-white/55 text-sm mb-1">Elige cómo pagar:</p>
              <button onClick={() => setYapeOpen(true)}
                className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-primary/40 p-4 transition-colors">
                <span className="w-10 h-10 rounded-xl bg-[#742284]/20 text-[#a855c9] flex items-center justify-center"><Smartphone size={20} /></span>
                <div className="text-left flex-1">
                  <p className="text-white font-semibold text-[14px]">Yape</p>
                  <p className="text-white/45 text-[12px]">Escanea el QR y sube tu comprobante</p>
                </div>
              </button>
              <button onClick={payWithMercadoPago} disabled={mpLoading}
                className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-primary/40 p-4 transition-colors disabled:opacity-50">
                <span className="w-10 h-10 rounded-xl bg-[#009ee3]/20 text-[#33b5e8] flex items-center justify-center">
                  {mpLoading ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
                </span>
                <div className="text-left flex-1">
                  <p className="text-white font-semibold text-[14px]">MercadoPago</p>
                  <p className="text-white/45 text-[12px]">Tarjeta, transferencia y más</p>
                </div>
              </button>
              <p className="text-white/30 text-[11px] text-center pt-2">
                Con Yape, tu plan se activa cuando el admin aprueba el comprobante.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {selected && selected.id !== 'GRATIS' && (
        <YapePaymentModal
          isOpen={yapeOpen}
          onClose={() => setYapeOpen(false)}
          plan={selected.id as 'ESTANDAR' | 'PREMIUM'}
          planLabel={selected.label}
          amount={selected.amount}
          providerType={providerType}
          onSuccess={onComplete}
        />
      )}
    </AnimatePresence>
  );
}
