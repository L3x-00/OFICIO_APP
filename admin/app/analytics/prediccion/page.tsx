'use client';

import dynamic from 'next/dynamic';

/**
 * Análisis Predictivo / Conversión ("Usabilidad de IA"). El contenido
 * (Recharts + lógica) vive en `components/ai-insights-content.tsx` y se carga
 * diferido sin SSR — Recharts solo baja cuando el admin entra a esta ruta.
 */
const AiInsightsContent = dynamic(
  () => import('@/components/ai-insights-content'),
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
        Cargando análisis predictivo…
      </div>
    ),
  },
);

export default function AiInsightsPage() {
  return <AiInsightsContent />;
}
