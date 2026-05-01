'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users, Star, ShieldCheck, MessageCircle,
  Phone, AlertTriangle, TrendingUp, UserCheck,
  RefreshCw, Clock, Wifi, WifiOff,
} from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { GraceProvidersTable } from '@/components/grace-providers-table';
import { PendingApprovalsTable } from '@/components/pending-approvals-table';
import { ReferralsWidget } from '@/components/referrals-widget';
import { getDashboardMetrics, getGraceProviders } from '@/lib/api';
import type { DashboardMetrics, GraceProvider } from '@/lib/api';
import { useAdminRealtime } from '@/lib/use-admin-realtime';

function SectionHeader({
  title,
  subtitle,
  count,
  countAlert,
  action,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  countAlert?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h2>
          {count !== undefined && count > 0 && (
            <span style={{
              padding: '2px 8px',
              borderRadius: '99px',
              fontSize: '11px',
              fontWeight: 700,
              background: countAlert ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
              border: `1px solid ${countAlert ? 'rgba(239,68,68,0.25)' : 'rgba(249,115,22,0.25)'}`,
              color: countAlert ? '#F87171' : '#FB923C',
            }}>
              {count}
            </span>
          )}
        </div>
        {subtitle && (
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics]           = useState<DashboardMetrics | null>(null);
  const [graceProviders, setGraceProviders] = useState<GraceProvider[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [refreshing, setRefreshing]     = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [liveAlert, setLiveAlert]       = useState<string | null>(null);

  function handlePendingAction() {
    setMetrics(m => m ? { ...m, pendingVerifications: Math.max(0, m.pendingVerifications - 1) } : m);
  }

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [m, gp] = await Promise.all([getDashboardMetrics(), getGraceProviders()]);
      setMetrics(m);
      setGraceProviders(gp);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Real-time via WebSocket ────────────────────────────
  const { connected, pendingCount, clearPending } = useAdminRealtime({
    autoRefresh: true,
    onRefresh: () => loadData(true),
    onEvent: (ev) => {
      const ALERT_MSGS: Record<string, string> = {
        NEW_PROVIDER:      '🆕 Nuevo proveedor registrado — revisión pendiente',
        PROVIDER_APPROVED: '✅ Proveedor aprobado',
        PROVIDER_REJECTED: '❌ Proveedor rechazado',
        NEW_PLAN_REQUEST:  '📋 Nueva solicitud de plan',
        PLAN_APPROVED:     '💎 Plan aprobado a un proveedor',
        USER_PENDING:      '⏳ Nuevo usuario en proceso de validación de email',
        NEW_USER_VERIFIED: '✅ Usuario registrado correctamente — email verificado',
      };
      const msg = ALERT_MSGS[ev.event];
      if (msg) {
        setLiveAlert(msg);
        setTimeout(() => setLiveAlert(null), 4000);
      }
    },
  });

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div>
        {/* Header skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <div className="skeleton" style={{ width: '180px', height: '28px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ width: '260px', height: '16px' }} />
          </div>
        </div>
        {/* Cards skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: '132px', borderRadius: '16px' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: '132px', borderRadius: '16px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px',
      }}>
        <div style={{
          width: '52px', height: '52px',
          borderRadius: '14px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertTriangle size={22} color="#EF4444" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Error al cargar el dashboard
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{error}</p>
        </div>
        <button
          onClick={() => loadData()}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 18px',
            background: 'var(--surface-4)',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          <RefreshCw size={14} />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Live alert banner */}
      {liveAlert && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: '10px',
          fontSize: '13px',
          color: '#93C5FD',
          fontWeight: 500,
          marginBottom: '16px',
          animation: 'fadeIn 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', flexShrink: 0, animation: 'pulse 1s ease infinite' }} />
          {liveAlert}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Dashboard
            </h1>
            {/* Indicador de conexión en tiempo real */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '3px 9px',
              borderRadius: '99px',
              background: connected ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              {connected
                ? <Wifi size={11} color="#10B981" />
                : <WifiOff size={11} color="#EF4444" />}
              <span style={{ fontSize: '10px', fontWeight: 700, color: connected ? '#10B981' : '#EF4444' }}>
                {connected ? 'EN VIVO' : 'SIN CONEXIÓN'}
              </span>
              {pendingCount > 0 && (
                <span
                  onClick={clearPending}
                  style={{
                    marginLeft: '3px', padding: '1px 6px',
                    borderRadius: '99px',
                    background: '#F97316',
                    color: '#fff',
                    fontSize: '10px', fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  title="Nuevos eventos — clic para limpiar"
                >
                  +{pendingCount}
                </span>
              )}
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            Resumen operacional de OficioApp
            {lastUpdated && (
              <span style={{ marginLeft: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={11} />
                Actualizado {lastUpdated.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 16px',
            background: 'var(--surface-3)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.6 : 1,
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => !refreshing && ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)')}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Primary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', marginBottom: '16px' }}>
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

      {/* Secondary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', marginBottom: '32px' }}>
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

      {/* Pending approvals */}
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-default)',
        borderRadius: '18px',
        overflow: 'hidden',
        marginBottom: '24px',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '8px', height: '8px',
                borderRadius: '50%',
                background: metrics.pendingVerifications > 0 ? '#F97316' : '#10B981',
                boxShadow: metrics.pendingVerifications > 0
                  ? '0 0 8px rgba(249,115,22,0.5)'
                  : '0 0 8px rgba(16,185,129,0.5)',
              }} />
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Proveedores Pendientes de Aprobación
              </h2>
              {metrics.pendingVerifications > 0 && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '99px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'rgba(249,115,22,0.12)',
                  border: '1px solid rgba(249,115,22,0.25)',
                  color: '#FB923C',
                }}>
                  {metrics.pendingVerifications}
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
              Aprobar o rechazar directamente desde aquí
            </p>
          </div>
          <ShieldCheck size={18} color="var(--text-tertiary)" />
        </div>
        <div style={{ padding: '8px 0' }}>
          <PendingApprovalsTable onAction={handlePendingAction} />
        </div>
      </div>

      {/* Referidos: KPIs rápidos */}
      <ReferralsWidget />

      {/* Grace providers */}
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-default)',
        borderRadius: '18px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Proveedores en periodo de gracia
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
              {graceProviders.length} proveedor(es) monitoreados
            </p>
          </div>
          <span style={{
            padding: '4px 12px',
            borderRadius: '99px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.2)',
            color: '#A78BFA',
          }}>
            {graceProviders.length} activos
          </span>
        </div>
        <div>
          <GraceProvidersTable providers={graceProviders} />
        </div>
      </div>

      {/* Componente visual de alerta en tiempo real */}
      {liveAlert && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '16px 24px',
          background: 'var(--surface-3)',
          border: '1px solid var(--primary-light)',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <span style={{ fontSize: '18px' }}>{liveAlert.split(' ')[0]}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{liveAlert}</span>
        </div>
      )}

      {/* Definición de animaciones CSS */}
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}