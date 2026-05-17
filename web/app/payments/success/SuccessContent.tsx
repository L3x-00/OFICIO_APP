'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Deep link a la app móvil. Si el user pagó desde el navegador del
// celular, esto le permite saltar de vuelta al app sin tener que
// abrirla manualmente y esperar al polling/WS.
const APP_DEEP_LINK = 'oficioapp://dashboard';

export default function SuccessContent() {
  const params = useSearchParams();
  const paymentId = params.get('payment_id');
  const status    = params.get('status');
  const externalRef = params.get('external_reference') ?? '';
  // external_reference shape: "user_{id}_type_{TYPE}_plan_{PLAN}".
  // Aceptamos también el legacy "user_{id}_plan_{PLAN}".
  const planMatch = externalRef.match(/_plan_([A-Z]+)$/);
  const plan = planMatch?.[1];

  return (
    <main className="min-h-screen bg-bg-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">¡Pago exitoso!</h1>
        <p className="text-white/60 mb-2">
          {plan
            ? `Tu plan ${plan} ha sido activado.`
            : 'Tu suscripción ha sido activada.'}
        </p>
        <p className="text-white/40 text-sm mb-8">
          Recibirás una notificación en la app. Si no aparece de inmediato,
          ciérrala y vuelve a abrirla.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href={APP_DEEP_LINK}
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Abrir Servi
          </a>
          <Link
            href="/"
            className="text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            O ir al sitio web
          </Link>
        </div>

        {(paymentId || status) && (
          <p className="text-white/20 text-[10px] mt-8 font-mono">
            {paymentId && <>ID: {paymentId}</>}
            {paymentId && status && ' · '}
            {status && <>status: {status}</>}
          </p>
        )}
      </div>
    </main>
  );
}
