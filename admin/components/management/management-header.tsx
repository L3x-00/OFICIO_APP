'use client';

import { useEffect, useState } from 'react';
import { Users, Briefcase, UsersRound, MapPin } from 'lucide-react';
import { getDashboardMetrics, type DashboardMetrics } from '@/lib/api';
import { ManagementStatCard } from './management-stat-card';

/**
 * Bloque hero de la página de Gestión con 4 KPIs principales.
 *
 * NO refactoriza ningún endpoint — usa `getDashboardMetrics()` que ya
 * está conectado. Si el fetch falla, los counters caen a 0 con un
 * hint discreto.
 */
export function ManagementHeader() {
  const [m, setM] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDashboardMetrics()
      .then((data) => { if (!cancelled) setM(data); })
      .catch(() => { if (!cancelled) setM(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <header className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Gestión de cuentas
        </h1>
        <p className="text-white/50 text-sm mt-1.5 flex items-center gap-1.5">
          <MapPin size={13} className="text-orange-400" />
          Clientes y proveedores registrados en el Perú
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ManagementStatCard
          label="Usuarios totales"
          value={(m?.totalUsers ?? 0).toLocaleString('es-PE')}
          icon={Users}
          tone="cyan"
          loading={loading}
        />
        <ManagementStatCard
          label="Proveedores"
          value={(m?.totalProviders ?? 0).toLocaleString('es-PE')}
          icon={Briefcase}
          tone="orange"
          loading={loading}
        />
        <ManagementStatCard
          label="Activos"
          value={(m?.activeProviders ?? 0).toLocaleString('es-PE')}
          icon={UsersRound}
          tone="emerald"
          hint="Visibles en la app móvil"
          loading={loading}
        />
        <ManagementStatCard
          label="Verificación pendiente"
          value={(m?.pendingVerifications ?? 0).toLocaleString('es-PE')}
          icon={Briefcase}
          tone="amber"
          hint="Esperando revisión del admin"
          loading={loading}
        />
      </div>
    </header>
  );
}
