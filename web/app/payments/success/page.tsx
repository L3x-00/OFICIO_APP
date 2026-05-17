import { Metadata } from 'next';
import { Suspense } from 'react';
import SuccessContent from './SuccessContent';

export const metadata: Metadata = {
  title: 'Pago Exitoso | Servi',
  description: 'Tu suscripción ha sido activada con éxito.',
};

export default function PaymentSuccessPage() {
  // useSearchParams() requiere Suspense boundary en Next 15.
  return (
    <Suspense fallback={<FallbackLoader />}>
      <SuccessContent />
    </Suspense>
  );
}

function FallbackLoader() {
  return (
    <main className="min-h-screen bg-bg-dark flex items-center justify-center px-4">
      <p className="text-white/60">Cargando…</p>
    </main>
  );
}
