'use client';

import { useState } from 'react';
import { X, Upload, QrCode, CheckCircle } from 'lucide-react';
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

export default function YapePaymentModal({ isOpen, onClose, plan, planLabel, amount }: Props) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [note, setNote] = useState('');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-bg-card border border-white/5 rounded-card w-full max-w-md max-h-[90vh] overflow-y-auto">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-text-primary">
                Pagar con Yape
              </h2>
              <button
                onClick={handleClose}
                className="text-text-muted hover:text-text-secondary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Info del plan */}
              <div className="bg-primary/10 border border-primary/20 rounded-card p-4">
                <p className="text-text-primary font-semibold">Plan {planLabel}</p>
                <p className="text-primary font-bold text-2xl mt-1">S/. {amount.toFixed(2)}</p>
              </div>

              {/* QR de Yape */}
              <div className="text-center">
                <div className="w-40 h-40 mx-auto bg-white rounded-lg p-2 mb-3">
                  <QrCode className="w-full h-full text-bg-dark" />
                  {/* En producción usar la imagen real: <img src="/images/yape/QR.jpeg" alt="QR Yape" /> */}
                </div>
                <p className="text-text-secondary text-sm">
                  Escanea el QR con tu app Yape
                </p>
              </div>

              {/* Instrucciones */}
              <div className="bg-bg-input rounded-card p-4 text-text-secondary text-sm space-y-1">
                <p>1. Abre Yape</p>
                <p>2. Escanea el QR o usa &quot;Pagar con número&quot;</p>
                <p>3. Paga el monto exacto: <strong>S/. {amount.toFixed(2)}</strong></p>
              </div>

              {/* Subir comprobante */}
              <div>
                <label className="block text-text-secondary text-sm mb-1.5">
                  Comprobante de pago (captura de pantalla)
                </label>
                <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-white/10 rounded-button cursor-pointer hover:border-primary/40 transition-colors">
                  {voucherFile ? (
                    <div className="flex items-center gap-2 text-green text-sm">
                      <CheckCircle size={16} />
                      {voucherFile.name}
                    </div>
                  ) : (
                    <>
                      <Upload className="text-text-muted" size={24} />
                      <span className="text-text-muted text-sm">
                        Haz clic para seleccionar imagen
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setVoucherFile(file);
                    }}
                  />
                </label>
              </div>

              {/* Código de verificación */}
              <div>
                <label className="block text-text-secondary text-sm mb-1.5">
                  Código de verificación (3 dígitos)
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  maxLength={3}
                  className="w-full bg-bg-input border border-white/5 rounded-button px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors tracking-widest text-center text-lg"
                  placeholder="000"
                />
              </div>

              {/* Nota opcional */}
              <div>
                <label className="block text-text-secondary text-sm mb-1.5">
                  Nota (opcional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="w-full bg-bg-input border border-white/5 rounded-button p-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  placeholder="Algún comentario para el administrador..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 justify-end p-5 border-t border-white/5">
              <button
                onClick={handleClose}
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
                  <Upload size={16} />
                )}
                Enviar comprobante
              </button>
            </div>
          </>
        ) : (
          /* Success */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green" size={32} />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">
              ¡Comprobante enviado!
            </h2>
            <p className="text-text-secondary text-sm mb-6">
              El administrador revisará tu pago y activará tu plan en breve.
              Recibirás una notificación cuando esté listo.
            </p>
            <button
              onClick={handleClose}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-button font-semibold text-sm transition-colors"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}