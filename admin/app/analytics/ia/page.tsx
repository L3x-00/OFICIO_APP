'use client';

import dynamic from 'next/dynamic';

/**
 * Observabilidad del Asistente IA "Ofi" (Fase 8). El contenido (Recharts +
 * lógica) vive en `components/ai-analytics-content.tsx` y se carga diferido
 * sin SSR — Recharts solo baja cuando el admin entra a esta ruta.
 */
const AiAnalyticsContent = dynamic(
  () => import('@/components/ai-analytics-content'),
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
        Cargando observabilidad IA…
      </div>
    ),
  },
);

export default function AiAnalyticsPage() {
  return <AiAnalyticsContent />;
}
