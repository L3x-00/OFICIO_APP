'use client';

import dynamic from 'next/dynamic';

/**
 * Mapa de calor de usuarios (geo-stats). Lee users.lastIp del backend,
 * resuelve geolocalización contra ip-api.com (batch) y agrupa por
 * (ciudad, departamento). Cache backend 1h — no satura la API gratis.
 *
 * El contenido vive en `components/users-geo-content.tsx` y se carga
 * diferido para mantener pequeño el bundle inicial del admin.
 */
const UsersGeoContent = dynamic(
  () => import('@/components/users-geo-content'),
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
        Cargando mapa de usuarios…
      </div>
    ),
  },
);

export default function UsersGeoPage() {
  return <UsersGeoContent />;
}
