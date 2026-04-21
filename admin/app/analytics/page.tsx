"use client";

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  MessageCircle, Phone, Eye, TrendingUp, TrendingDown, Minus,
  Users, ShieldCheck, Clock, MapPin, RefreshCw, Loader2, AlertTriangle,
} from 'lucide-react';
import { getAnalytics, AnalyticsResponse } from '@/lib/api';

// ── Colores constantes ─────────────────────────────────────
const C = {
  whatsapp: '#25D366',
  calls:    '#3B82F6',
  views:    '#A78BFA',
  premium:  '#F59E0B',
  estandar: '#6366F1',
  basico:   '#10B981',
  gratis:   '#6B7280',
  approved: '#10B981',
  pending:  '#F97316',
  rejected: '#EF4444',
  active:   '#3B82F6',
};

const PLAN_COLORS: Record<string, string> = {
  PREMIUM:  C.premium,
  ESTANDAR: C.estandar,
  BASICO:   C.basico,
  GRATIS:   C.gratis,
};

const PLAN_LABELS: Record<string, string> = {
  PREMIUM:  'Premium',
  ESTANDAR: 'Estándar',
  BASICO:   'Básico',
  GRATIS:   'Gratis',
};

const AVAIL_COLORS: Record<string, string> = {
  DISPONIBLE:  '#10B981',
  OCUPADO:     '#EF4444',
  CON_DEMORA:  '#F97316',
};
const AVAIL_LABELS: Record<string, string> = {
  DISPONIBLE:  'Disponible',
  OCUPADO:     'Ocupado',
  CON_DEMORA:  'Con demora',
};

// ── Helper: formatear fecha eje X ─────────────────────────
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

// ── Delta badge ────────────────────────────────────────────
function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0)  return <span style={{ color: '#10B981', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}><TrendingUp size={11} />+{delta}%</span>;
  if (delta < 0)  return <span style={{ color: '#EF4444', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}><TrendingDown size={11} />{delta}%</span>;
  return <span style={{ color: '#6B7280', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}><Minus size={11} />0%</span>;
}

// ── KPI Card ───────────────────────────────────────────────
function KPICard({
  label, value, icon: Icon, color, delta, subtitle,
}: {
  label: string; value: number | string; icon: any; color: string; delta?: number; subtitle?: string;
}) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border-default)',
      borderRadius: 16,
      padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
        {delta !== undefined && <DeltaBadge delta={delta} />}
      </div>
      {subtitle && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{subtitle}</span>}
    </div>
  );
}

// ── Period selector ────────────────────────────────────────
const PERIODS = [
  { label: '7 días',  days: 7  },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
];

// ── Tooltip personalizado ──────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ color: '#9CA3AF', marginBottom: 6 }}>{fmtDate(label)}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 700, margin: '2px 0' }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ── Componente de sección ──────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border-default)',
      borderRadius: 18,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════

export default function AnalyticsPage() {
  const [data, setData]       = useState<AnalyticsResponse | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]       = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (d: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const result = await getAnalytics(d);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error al cargar analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <Loader2 size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Cargando analytics...</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <AlertTriangle size={32} color="#EF4444" />
        <p style={{ color: '#EF4444', fontSize: 13 }}>{error || 'Sin datos'}</p>
        <button
          onClick={() => load(days)}
          style={{ padding: '8px 18px', background: 'var(--surface-4)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { kpis, dailyClicks, planDistribution, providerFunnel, availabilityDistribution, geoDistribution, topProviders } = data;

  // Totales engagement
  const totalEngagement = kpis.whatsappTotal + kpis.callsTotal + kpis.viewsTotal;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Analytics Estratégico
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            Indicadores clave para toma de decisiones · {totalEngagement.toLocaleString()} interacciones en los últimos {days} días
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-3)', borderRadius: 10, padding: 3 }}>
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: days === p.days ? '#3B82F6' : 'transparent',
                  color:      days === p.days ? '#fff' : 'var(--text-tertiary)',
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Refresh */}
          <button
            onClick={() => load(days, true)}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px',
              background: 'var(--surface-3)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards: Engagement ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <KPICard
          label="WhatsApp clicks"
          value={kpis.whatsappTotal}
          icon={MessageCircle}
          color={C.whatsapp}
          delta={kpis.whatsappDelta}
          subtitle={`vs período anterior (${days}d)`}
        />
        <KPICard
          label="Llamadas"
          value={kpis.callsTotal}
          icon={Phone}
          color={C.calls}
          delta={kpis.callsDelta}
          subtitle={`vs período anterior (${days}d)`}
        />
        <KPICard
          label="Vistas de perfil"
          value={kpis.viewsTotal}
          icon={Eye}
          color={C.views}
          delta={kpis.viewsDelta}
          subtitle={`vs período anterior (${days}d)`}
        />
        <KPICard
          label="Proveedores activos"
          value={providerFunnel.active}
          icon={Users}
          color="#10B981"
          subtitle={`de ${providerFunnel.total} registrados`}
        />
        <KPICard
          label="Tasa de aprobación"
          value={`${providerFunnel.conversionRate}%`}
          icon={ShieldCheck}
          color="#6366F1"
          subtitle={`${providerFunnel.approved} aprobados de ${providerFunnel.total}`}
        />
        <KPICard
          label="Pendientes verificación"
          value={providerFunnel.pending}
          icon={Clock}
          color="#F97316"
          subtitle="requieren revisión"
        />
      </div>

      {/* ── Chart: Engagement diario ─────────────────────────── */}
      <Section title={`📈 Engagement diario — últimos ${days} días`}>
        {dailyClicks.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
            Sin datos de engagement en este período
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyClicks} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(dailyClicks.length / 8) - 1)}
              />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(v) => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{v}</span>}
              />
              <Line type="monotone" dataKey="whatsapp" name="WhatsApp" stroke={C.whatsapp} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="calls"    name="Llamadas" stroke={C.calls}    strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="views"    name="Vistas"   stroke={C.views}    strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* ── Grid: Planes + Disponibilidad ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Distribución de planes */}
        <Section title="💎 Distribución de planes">
          {planDistribution.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    dataKey="count"
                    nameKey="plan"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {planDistribution.map((entry) => (
                      <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [v, PLAN_LABELS[n as string] ?? n]}
                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {planDistribution
                  .sort((a, b) => b.count - a.count)
                  .map((item) => {
                    const total = planDistribution.reduce((s, i) => s + i.count, 0);
                    const pct   = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    return (
                      <div key={item.plan} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAN_COLORS[item.plan] ?? '#6B7280', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{PLAN_LABELS[item.plan] ?? item.plan}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{item.count}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 32, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </Section>

        {/* Disponibilidad */}
        <Section title="🟢 Disponibilidad de proveedores">
          {availabilityDistribution.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={availabilityDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {availabilityDistribution.map((entry) => (
                      <Cell key={entry.status} fill={AVAIL_COLORS[entry.status] ?? '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [v, AVAIL_LABELS[n as string] ?? n]}
                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {availabilityDistribution
                  .sort((a, b) => b.count - a.count)
                  .map((item) => {
                    const total = availabilityDistribution.reduce((s, i) => s + i.count, 0);
                    const pct   = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    return (
                      <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: AVAIL_COLORS[item.status] ?? '#6B7280', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{AVAIL_LABELS[item.status] ?? item.status}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{item.count}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 32, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* ── Funnel de proveedores ────────────────────────────── */}
      <Section title="🔄 Funnel de proveedores (estados)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Registrados',   value: providerFunnel.total,    color: '#6B7280', pct: 100 },
            { label: 'Pendientes',    value: providerFunnel.pending,  color: C.pending, pct: providerFunnel.total > 0 ? Math.round((providerFunnel.pending  / providerFunnel.total) * 100) : 0 },
            { label: 'Aprobados',     value: providerFunnel.approved, color: C.approved,pct: providerFunnel.total > 0 ? Math.round((providerFunnel.approved / providerFunnel.total) * 100) : 0 },
            { label: 'Rechazados',    value: providerFunnel.rejected, color: C.rejected,pct: providerFunnel.total > 0 ? Math.round((providerFunnel.rejected / providerFunnel.total) * 100) : 0 },
            { label: 'Activos (vis.)',value: providerFunnel.active,   color: C.active,  pct: providerFunnel.total > 0 ? Math.round((providerFunnel.active   / providerFunnel.total) * 100) : 0 },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: `${item.color}10`,
                border: `1px solid ${item.color}25`,
                borderRadius: 12,
                padding: '14px 16px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 24, fontWeight: 800, color: item.color, margin: 0 }}>{item.value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>{item.label}</p>
              <p style={{ fontSize: 10, color: item.color, fontWeight: 700, margin: '2px 0 0' }}>{item.pct}%</p>
            </div>
          ))}
        </div>
        {/* Barra de progreso visual */}
        <div style={{ height: 8, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${providerFunnel.total > 0 ? (providerFunnel.approved / providerFunnel.total) * 100 : 0}%`, background: C.approved, transition: 'width 0.5s' }} />
          <div style={{ width: `${providerFunnel.total > 0 ? (providerFunnel.pending  / providerFunnel.total) * 100 : 0}%`, background: C.pending,  transition: 'width 0.5s' }} />
          <div style={{ width: `${providerFunnel.total > 0 ? (providerFunnel.rejected / providerFunnel.total) * 100 : 0}%`, background: C.rejected, transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          {[['Aprobados', C.approved], ['Pendientes', C.pending], ['Rechazados', C.rejected]].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Grid: Top providers + Geografía ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Top 10 proveedores por engagement */}
        <Section title={`🏆 Top proveedores por clics (${days}d)`}>
          {topProviders.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Sin datos de clics en este período</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topProviders.map((p, i) => {
                const maxClicks = topProviders[0]?.clicks ?? 1;
                const pct = maxClicks > 0 ? (p.clicks / maxClicks) * 100 : 0;
                return (
                  <div key={p.providerId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 20, textAlign: 'right', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.businessName}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#3B82F6', flexShrink: 0, marginLeft: 8 }}>
                          {p.clicks}
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? C.premium : '#3B82F6', borderRadius: 99, transition: 'width 0.4s' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{p.categoryName} · {p.type === 'OFICIO' ? 'Profesional' : 'Negocio'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Distribución geográfica */}
        <Section title="📍 Cobertura geográfica (departamentos)">
          {geoDistribution.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Sin datos de ubicación registrados</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={geoDistribution} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="department"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                    tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 11) + '…' : v}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [v, 'Proveedores']}
                  />
                  <Bar dataKey="count" name="Proveedores" fill="#6366F1" radius={[0, 4, 4, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={12} color="var(--text-tertiary)" />
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {geoDistribution.reduce((s, g) => s + g.count, 0)} proveedores con ubicación registrada
                </span>
              </div>
            </>
          )}
        </Section>
      </div>

      {/* ── Insight rápido ───────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.08))',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        <TrendingUp size={20} color="#6366F1" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Insight del período
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {kpis.whatsappTotal + kpis.callsTotal > 0
              ? `Se generaron ${(kpis.whatsappTotal + kpis.callsTotal).toLocaleString()} contactos directos (WA + llamadas).
                 El ${providerFunnel.conversionRate}% de proveedores registrados fue aprobado.
                 ${providerFunnel.pending > 0 ? `⚠️ Hay ${providerFunnel.pending} verificaciones pendientes.` : '✅ Sin verificaciones pendientes.'}
                 ${kpis.whatsappDelta > 0 ? `📈 WhatsApp creció +${kpis.whatsappDelta}% vs período anterior.` : kpis.whatsappDelta < 0 ? `📉 WhatsApp bajó ${kpis.whatsappDelta}% vs período anterior.` : ''}`
              : `Sin actividad registrada en los últimos ${days} días. Verifica que el tracking de eventos esté activo en la app móvil.`
            }
          </p>
        </div>
      </div>

    </div>
  );
}
