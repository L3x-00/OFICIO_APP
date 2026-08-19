'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Deep link a la app móvil. Si el user pagó desde el navegador del
// celular, esto le permite saltar de vuelta al app sin tener que
// abrirla manualmente y esperar al polling/WS.
const APP_DEEP_LINK = 'oficioapp://dashboard';

// Estado visual derivado del status que devuelve Mercado Pago en la
// redirección. El webhook sigue siendo la ÚNICA vía que activa la
// suscripción; esta página solo refleja con honestidad el resultado del
// redirect (antes afirmaba "¡Pago exitoso!" siempre, incluso si estaba
// pendiente o rechazado).
type PayState = 'approved' | 'pending' | 'failed' | 'unknown';

const STATE_UI: Record<PayState, {
  ring: string; icon: string; iconColor: string; title: string;
}> = {
  approved: { ring: 'bg-green-500/10', iconColor: 'text-green-500', icon: 'M5 13l4 4L19 7', title: '¡Pago exitoso!' },
  pending:  { ring: 'bg-amber-500/10', iconColor: 'text-amber-500', icon: 'M6 12h.01M12 12h.01M18 12h.01', title: 'Pago en proceso' },
  failed:   { ring: 'bg-rose-500/10',  iconColor: 'text-rose-500',  icon: 'M6 18L18 6M6 6l12 12', title: 'Pago no completado' },
  unknown:  { ring: 'bg-primary/10',   iconColor: 'text-primary',   icon: 'M12 8v4m0 4h.01', title: 'Confirmando tu pago' },
};

export default function SuccessContent() {
  const params = useSearchParams();
  const paymentId = params.get('payment_id');
  const status    = params.get('status') || params.get('collection_status');
  const externalRef = params.get('external_reference') ?? '';
  // external_reference shape: "user_{id}_type_{TYPE}_plan_{PLAN}".
  // Aceptamos también el legacy "user_{id}_plan_{PLAN}".
  const planMatch = externalRef.match(/_plan_([A-Z]+)$/);
  const plan = planMatch?.[1];

  const raw = (status || '').toLowerCase();
  const state: PayState =
    raw === 'approved' ? 'approved'
    : raw === 'pending' || raw === 'in_process' ? 'pending'
    : raw ? 'failed'          // rejected / cancelled / etc.
    : 'unknown';              // sin status en la URL
  const ui = STATE_UI[state];

  const message =
    state === 'approved'
      ? (plan ? `Tu plan ${plan} ha sido activado.` : 'Tu suscripción ha sido activada.')
      : state === 'pending'
      ? 'Tu pago está siendo procesado. Te avisaremos apenas se confirme.'
      : state === 'failed'
      ? 'No se concretó el pago. Puedes intentarlo de nuevo desde la app.'
      : 'Estamos confirmando tu pago. Te avisaremos apenas tengamos el resultado.';

  return (
    <main className="min-h-screen bg-bg-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full ${ui.ring} flex items-center justify-center`}>
          <svg className={`w-10 h-10 ${ui.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ui.icon} />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">{ui.title}</h1>
        <p className="text-white/60 mb-2">{message}</p>
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
            href="https://play.google.com/store/apps/details?id=com.oficioapp.mobile"
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
