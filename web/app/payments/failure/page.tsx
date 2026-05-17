import { Metadata } from 'next';
import { Suspense } from 'react';
import FailureContent from './FailureContent';

export const metadata: Metadata = {
  title: 'Pago Rechazado | Servi',
  description: 'No se pudo procesar tu pago. Intenta nuevamente.',
};

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<FallbackLoader />}>
      <FailureContent />
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
