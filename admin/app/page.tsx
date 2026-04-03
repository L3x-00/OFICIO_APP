import {
  Users,
  Star,
  ShieldCheck,
  MessageCircle,
  Phone,
  AlertTriangle,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { GraceProvidersTable } from '@/components/grace-providers-table';
import { DashboardRefreshButton } from '@/components/dashboard-refresh';
import { getDashboardMetrics, getGraceProviders } from '@/lib/api';

export const dynamic = 'force-dynamic'; // Siempre refresca los datos

export default async function DashboardPage() {
  // Carga de datos en el servidor (SSR)
  const [metrics, graceProviders] = await Promise.all([
    getDashboardMetrics(),
    getGraceProviders(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Resumen general de OficioApp
          </p>
        </div>
        <DashboardRefreshButton />
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Proveedores activos"
          value={metrics.activeProviders}
          subtitle={`de ${metrics.totalProviders} totales`}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Periodo de gracia"
          value={metrics.providersInGrace}
          subtitle="proveedores freemium"
          icon={TrendingUp}
          color="purple"
        />
        <MetricCard
          title="Vencen en 7 días"
          value={metrics.providersExpiringSoon}
          subtitle="requieren seguimiento"
          icon={AlertTriangle}
          color="orange"
          alert={metrics.providersExpiringSoon > 0}
        />
        <MetricCard
          title="Usuarios registrados"
          value={metrics.totalUsers}
          icon={UserCheck}
          color="green"
        />
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total reseñas"
          value={metrics.totalReviews}
          icon={Star}
          color="orange"
        />
        <MetricCard
          title="Verificaciones pendientes"
          value={metrics.pendingVerifications}
          subtitle="documentos por revisar"
          icon={ShieldCheck}
          color="red"
          alert={metrics.pendingVerifications > 0}
        />
        <MetricCard
          title="Clics WhatsApp (mes)"
          value={metrics.whatsappClicks}
          icon={MessageCircle}
          color="green"
        />
        <MetricCard
          title="Clics llamadas (mes)"
          value={metrics.callClicks}
          icon={Phone}
          color="blue"
        />
      </div>

      {/* Tabla de proveedores en gracia */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Proveedores en periodo de gracia
          </h2>
          <span className="text-sm text-gray-400">
            {graceProviders.length} proveedor(es)
          </span>
        </div>
        <GraceProvidersTable providers={graceProviders} />
      </div>
    </div>
  );
}