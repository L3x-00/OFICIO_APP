'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Mapeo de status_detail más comunes de MP a mensajes para el user.
// Lista completa: https://www.mercadopago.com.pe/developers/es/docs/checkout-pro/additional-content/your-integrations/notifications
const STATUS_DETAIL_LABELS: Record<string, string> = {
  cc_rejected_insufficient_amount: 'La tarjeta no tiene saldo suficiente.',
  cc_rejected_bad_filled_card_number: 'Número de tarjeta incorrecto.',
  cc_rejected_bad_filled_date: 'Fecha de vencimiento incorrecta.',
  cc_rejected_bad_filled_security_code: 'Código de seguridad incorrecto.',
  cc_rejected_bad_filled_other: 'Datos de la tarjeta incorrectos.',
  cc_rejected_high_risk: 'El pago fue rechazado por riesgo de fraude.',
  cc_rejected_call_for_authorize: 'Tu banco requiere autorización manual.',
  cc_rejected_card_disabled: 'La tarjeta está deshabilitada.',
  cc_rejected_other_reason: 'El banco rechazó el pago.',
};

export default function FailureContent() {
  const params = useSearchParams();
  const statusDetail = params.get('status_detail');
  const paymentId = params.get('payment_id');

  const detailLabel = statusDetail ? STATUS_DETAIL_LABELS[statusDetail] : null;

  return (
    <main className="min-h-screen bg-bg-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Pago rechazado</h1>
        <p className="text-white/60 mb-2">
          {detailLabel ?? 'No se pudo procesar tu pago.'}
        </p>
        <p className="text-white/40 text-sm mb-8">
          Intenta con otro método de pago o contacta a soporte.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="oficioapp://dashboard"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Volver a Servi
          </a>
          <Link
            href="mailto:soporteofiapp@gmail.com"
            className="text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            Contactar soporte
          </Link>
        </div>

        {(paymentId || statusDetail) && (
          <p className="text-white/20 text-[10px] mt-8 font-mono break-all">
            {paymentId && <>ID: {paymentId}</>}
            {paymentId && statusDetail && <br />}
            {statusDetail && <>detail: {statusDetail}</>}
          </p>
        )}
      </div>
    </main>
  );
}
