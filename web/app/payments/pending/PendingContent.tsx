'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function PendingContent() {
  const params = useSearchParams();
  const paymentId = params.get('payment_id');
  const externalRef = params.get('external_reference') ?? '';
  const planMatch = externalRef.match(/_plan_([A-Z]+)$/);
  const plan = planMatch?.[1];

  return (
    <main className="min-h-screen bg-bg-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Pago pendiente</h1>
        <p className="text-white/60 mb-2">
          {plan
            ? `Tu pago del plan ${plan} está siendo procesado.`
            : 'Tu pago está siendo procesado.'}
        </p>
        <p className="text-white/40 text-sm mb-8">
          Te notificaremos en la app cuando se confirme. Algunos métodos
          (transferencia, efectivo) pueden tardar hasta 48 horas.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="oficioapp://dashboard"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Abrir Servi
          </a>
          <Link
            href="https://play.google.com/store/apps/details?id=com.oficioapp.mobile"
            className="text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            O ir al sitio web
          </Link>
        </div>

        {paymentId && (
          <p className="text-white/20 text-[10px] mt-8 font-mono">
            ID: {paymentId}
          </p>
        )}
      </div>
    </main>
  );
}
