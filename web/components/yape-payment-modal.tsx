'use client';

import { useState } from 'react';
import { X, Upload, QrCode, CheckCircle, Loader2, ScanLine, CreditCard, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { yapePaymentSchema } from '@/lib/validators';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  plan: 'ESTANDAR' | 'PREMIUM';
  planLabel: string;
  amount: number;
}

const STEPS = [
  { icon: ScanLine, label: 'Escanear' },
  { icon: CreditCard, label: 'Pagar' },
  { icon: FileCheck, label: 'Confirmar' },
];

export default function YapePaymentModal({ isOpen, onClose, plan, planLabel, amount }: Props) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [note, setNote] = useState('');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-bg-card border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto animate-scale-in shadow-2xl">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-white/5 bg-bg-card/95 backdrop-blur-md">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Pagar con Yape</h2>
                <p className="text-text-muted text-xs">Plan {planLabel}</p>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-full hover:bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step indicators */}
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center justify-between mb-2">
                {STEPS.map((s, i) => (
                  <div key={s.label} className="flex items-center flex-1 last:flex-initial">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/40 text-primary flex items-center justify-center">
                        <s.icon size={14} />
                      </div>
                      <span className="text-[10px] text-text-muted font-medium">{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-px bg-gradient-to-r from-primary/40 to-transparent mx-2 -mt-4" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Monto destacado */}
              <div className="relative bg-gradient-to-br from-primary/15 via-bg-input to-bg-input border border-primary/25 rounded-2xl p-5 overflow-hidden">
                <div className="blob bg-primary/30 w-40 h-40 -top-10 -right-10 animate-float-slow" aria-hidden />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-xs uppercase tracking-wider font-bold">Total a pagar</p>
                    <p className="text-gradient font-extrabold text-3xl mt-1">S/. {amount.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                    <CreditCard className="text-primary" size={22} />
                  </div>
                </div>
              </div>

              {/* QR */}
              <div className="text-center">
                <div className="w-44 h-44 mx-auto bg-white rounded-2xl p-3 mb-3 shadow-glow-md ring-2 ring-primary/20">
                  <QrCode className="w-full h-full text-bg-dark" />
                </div>
                <p className="text-text-secondary text-sm">Escanea con tu app Yape</p>
              </div>

              {/* Instrucciones */}
              <div className="bg-bg-input/60 border border-white/5 rounded-xl p-4 text-text-secondary text-sm space-y-1.5">
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
                    Paga el monto exacto: <strong className="text-primary">S/. {amount.toFixed(2)}</strong>
                  </span>
                </div>
              </div>

              {/* Comprobante con drag&drop */}
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
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
                        ? 'border-green/40 bg-green/5'
                        : 'border-white/10 hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  {voucherFile ? (
                    <div className="flex items-center gap-2 text-green text-sm font-medium">
                      <CheckCircle size={18} />
                      <span className="truncate max-w-[200px]">{voucherFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="text-text-muted" size={24} />
                      <span className="text-text-muted text-sm text-center">
                        Arrastra o <span className="text-primary font-semibold">selecciona</span> tu comprobante
                      </span>
                      <span className="text-text-muted/60 text-[10px]">JPG, PNG, WebP</span>
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
                <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
                  Código de verificación (3 dígitos)
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  maxLength={3}
                  className="w-full bg-bg-input border border-white/8 rounded-xl px-3 py-3 text-text-primary focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.12)] transition-all tracking-[0.5em] text-center text-2xl font-bold tabular-nums"
                  placeholder="000"
                  inputMode="numeric"
                />
              </div>

              {/* Nota */}
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
                  Nota (opcional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="w-full bg-bg-input border border-white/8 rounded-xl p-3 text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.12)] transition-all resize-none"
                  placeholder="Algún comentario para el administrador..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex gap-3 justify-end p-5 border-t border-white/5 bg-bg-card/95 backdrop-blur-md">
              <button
                onClick={handleClose}
                className="text-text-muted hover:text-text-secondary px-4 py-2 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={sending}
                className="btn-primary press-effect px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
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
          /* Success */
          <div className="p-8 text-center animate-fade-in">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 bg-green/15 rounded-full animate-pulse-glow" />
              <div className="absolute inset-0 bg-green/20 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green animate-scale-in" size={36} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">
              ¡Comprobante enviado!
            </h2>
            <p className="text-text-secondary text-sm mb-7 max-w-sm mx-auto">
              El administrador revisará tu pago y activará tu plan en breve.
              Recibirás una notificación cuando esté listo.
            </p>
            <button
              onClick={handleClose}
              className="btn-primary press-effect w-full sm:w-auto px-7 py-3 rounded-xl font-semibold text-sm"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
