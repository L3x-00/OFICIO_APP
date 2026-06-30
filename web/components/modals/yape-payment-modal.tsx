'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle, Loader2, ScanLine, CreditCard, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { yapePaymentSchema } from '@/lib/validators';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  plan: 'ESTANDAR' | 'PREMIUM';
  planLabel: string;
  amount: number;
  /** Perfil al que aplicar el pago (cuando el user tiene OFICIO y NEGOCIO). */
  providerType?: 'OFICIO' | 'NEGOCIO';
  /** Se llama al cerrar tras enviar el comprobante con éxito. */
  onSuccess?: () => void;
}

const STEPS = [
  { icon: ScanLine, label: 'Escanear' },
  { icon: CreditCard, label: 'Pagar' },
  { icon: FileCheck, label: 'Confirmar' },
];

export default function YapePaymentModal({ isOpen, onClose, plan, planLabel, amount, providerType, onSuccess }: Props) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [note, setNote] = useState('');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleSubmit = async () => {
    const result = yapePaymentSchema.safeParse({
      plan,
      amount,
      verificationCode,
      note: note || undefined,
    });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || 'Datos inválidos');
      return;
    }
    if (!voucherFile) {
      toast.error('Debes subir el comprobante de pago');
      return;
    }
    setSending(true);
    try {
      await api.submitYapePayment({
        plan,
        amount,
        verificationCode,
        note,
        voucherFile,
        providerType,
      });
      setStep('success');
      toast.success('Comprobante enviado. El administrador lo revisará pronto.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar comprobante');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setVerificationCode('');
    setNote('');
    setVoucherFile(null);
    onClose();
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Solo JPG, PNG o WebP');
      return;
    }
    setVoucherFile(file);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Fondo oscuro difuminado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleClose}
          />

          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="relative bg-dark-surface/95 backdrop-blur-xl border border-white/5 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-glow-lg scrollbar-thin"
          >
            {step === 'form' ? (
              <>
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-white/5 bg-dark-surface/90 backdrop-blur-lg">
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">Pagar con Yape</h2>
                    <p className="text-white/40 text-xs font-medium">Plan {planLabel}</p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-9 h-9 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Step indicators */}
                <div className="px-5 pt-5 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    {STEPS.map((s, i) => (
                      <div key={s.label} className="flex items-center flex-1 last:flex-initial">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center">
                            <s.icon size={15} />
                          </div>
                          <span className="text-[10px] text-white/40 font-medium">{s.label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className="flex-1 h-px bg-white/5 mx-3 -mt-5" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* Monto destacado */}
                  <div className="relative glass border-primary/20 rounded-2xl p-5 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider font-bold">Total a pagar</p>
                        <p className="text-gradient font-extrabold text-3xl mt-1">S/. {amount.toFixed(2)}</p>
                      </div>
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                        <CreditCard className="text-primary-light" size={22} />
                      </div>
                    </div>
                  </div>

                  {/* QR real de la cuenta Yape de Servi */}
                  <div className="text-center">
                    <div className="w-44 h-44 mx-auto glass rounded-2xl p-3 mb-3 shadow-glow-sm">
                      <div className="w-full h-full bg-white rounded-xl p-1.5 flex items-center justify-center overflow-hidden">
                        <Image
                          src="/images/yape/qr.jpeg"
                          alt="QR Yape de Servi"
                          width={168}
                          height={168}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    </div>
                    <p className="text-white/50 text-sm">Escanea con tu app Yape</p>
                  </div>

                  {/* Instrucciones */}
                  <div className="glass rounded-xl p-4 text-white/60 text-sm space-y-2">
                    <div className="flex gap-2">
                      <span className="text-primary font-bold">1.</span>
                      <span>Abre Yape</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-primary font-bold">2.</span>
                      <span>Escanea el QR o usa &quot;Pagar con número&quot;</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-primary font-bold">3.</span>
                      <span>
                        Paga el monto exacto: <strong className="text-primary-light">S/. {amount.toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Comprobante con drag&drop */}
                  <div>
                    <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">
                      Comprobante de pago
                    </label>
                    <label
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        handleFile(e.dataTransfer.files?.[0] ?? null);
                      }}
                      className={`flex flex-col items-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                        dragOver
                          ? 'border-primary bg-primary/10'
                          : voucherFile
                            ? 'border-accent/40 bg-accent/5'
                            : 'border-white/10 hover:border-primary/30 hover:bg-white/[0.02]'
                      }`}
                    >
                      {voucherFile ? (
                        <div className="flex items-center gap-2 text-accent text-sm font-medium">
                          <CheckCircle size={18} />
                          <span className="truncate max-w-[200px]">{voucherFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="text-white/30" size={24} />
                          <span className="text-white/40 text-sm text-center">
                            Arrastra o <span className="text-primary font-semibold">selecciona</span> tu comprobante
                          </span>
                          <span className="text-white/20 text-[10px]">JPG, PNG, WebP</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>

                  {/* OTP-style code */}
                  <div>
                    <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">
                      Código de verificación (3 dígitos)
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      maxLength={3}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all tracking-[0.5em] text-center text-2xl font-bold tabular-nums"
                      placeholder="000"
                      inputMode="numeric"
                    />
                  </div>

                  {/* Nota */}
                  <div>
                    <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">
                      Nota (opcional)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      maxLength={200}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                      placeholder="Algún comentario para el administrador..."
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 flex gap-3 justify-end p-5 border-t border-white/5 bg-dark-surface/90 backdrop-blur-lg">
                  <button
                    onClick={handleClose}
                    className="btn btn-ghost press-effect px-5 py-2.5 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    className="btn btn-primary press-effect px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                    Enviar comprobante
                  </button>
                </div>
              </>
            ) : (
              /* Success State */
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="p-10 text-center"
              >
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 bg-accent/15 rounded-full animate-pulse-glow" />
                  <div className="absolute inset-0 bg-accent/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-accent" size={40} />
                  </div>
                </div>
                <h2 className="text-xl font-display font-bold text-white mb-3">
                  ¡Comprobante enviado!
                </h2>
                <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                  El administrador revisará tu pago y activará tu plan en breve.
                  Recibirás una notificación cuando esté listo.
                </p>
                <button
                  onClick={() => { handleClose(); onSuccess?.(); }}
                  className="btn btn-primary press-effect w-full sm:w-auto px-8 py-3 text-sm"
                >
                  Entendido
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}