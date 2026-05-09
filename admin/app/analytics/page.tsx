'use client';

import dynamic from 'next/dynamic';

/**
 * Página de Analytics: el contenido (Recharts + lucide + lógica completa)
 * vive en `components/analytics-content.tsx`. Acá lo cargamos diferido sin
 * SSR para mantener pequeño el bundle inicial del admin — Recharts solo
 * baja cuando el usuario entra a esta ruta.
 */
const AnalyticsContent = dynamic(
  () => import('@/components/analytics-content'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        Cargando analítica…
      </div>
    ),
  },
);

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}
