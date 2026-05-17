import { Metadata } from 'next';
import { Suspense } from 'react';
import PendingContent from './PendingContent';

export const metadata: Metadata = {
  title: 'Pago Pendiente | Servi',
  description: 'Tu pago está siendo procesado.',
};

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<FallbackLoader />}>
      <PendingContent />
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
