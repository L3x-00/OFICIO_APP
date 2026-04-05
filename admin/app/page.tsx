'use client';

import { useEffect, useState } from 'react';
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
import { PendingApprovalsTable } from '@/components/pending-approvals-table';
import { DashboardRefreshButton } from '@/components/dashboard-refresh';
import { getDashboardMetrics, getGraceProviders } from '@/lib/api';
import type { DashboardMetrics, GraceProvider } from '@/lib/api';

export default function DashboardPage() {
  const [metrics, setMetrics]           = useState<DashboardMetrics | null>(null);
  const [graceProviders, setGraceProviders] = useState<GraceProvider[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Decrementa el badge de pendientes cuando el admin aprueba/rechaza desde el dashboard
  function handlePendingAction() {
    setMetrics(m => m ? { ...m, pendingVerifications: Math.max(0, m.pendingVerifications - 1) } : m);
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [m, gp] = await Promise.all([
        getDashboardMetrics(),
        getGraceProviders(),
      ]);
      setMetrics(m);
      setGraceProviders(gp);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-sm mb-4">{error || 'Error desconocido'}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

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
        <DashboardRefreshButton onRefresh={loadData} />
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

      {/* ── Proveedores pendientes de aprobación ───────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Proveedores Pendientes de Aprobación
              {metrics.pendingVerifications > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold animate-pulse">
                  {metrics.pendingVerifications}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Aprobar o rechazar directamente sin salir del dashboard
            </p>
          </div>
        </div>
        <PendingApprovalsTable onAction={handlePendingAction} />
      </div>

      {/* ── Tabla de proveedores en gracia ─────────────────── */}
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
