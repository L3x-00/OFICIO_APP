'use client';

import { useEffect, useState } from 'react';
import { Coins, Users, TrendingUp, Award, Gift } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { getReferralStats, type ReferralStats } from '@/lib/api';

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReferralStats()
      .then((s) => { if (!cancelled) setStats(s); })
      .catch((e) => { if (!cancelled) setError(String(e?.message ?? e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Referidos
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Cargando…</p>
      </div>
    );
  }
  if (error || !stats) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Referidos
        </h1>
        <p style={{ color: 'var(--danger)', marginTop: '8px' }}>{error ?? 'Sin datos.'}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Referidos y monedas
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          Estadísticas globales del sistema de invitaciones.
        </p>
      </header>

      {/* KPIs */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <Kpi
          icon={Users}
          label="Invitaciones totales"
          value={stats.totalInvitations.toString()}
          color="#3B82F6"
        />
        <Kpi
          icon={Award}
          label="Aprobadas"
          value={stats.totalApproved.toString()}
          color="#10B981"
        />
        <Kpi
          icon={TrendingUp}
          label="Conversión"
          value={`${stats.conversionRate.toFixed(1)}%`}
          color="#E07B39"
        />
        <Kpi
          icon={Coins}
          label="Monedas entregadas"
          value={stats.totalCoinsDistributed.toLocaleString('es-PE')}
          color="#F59E0B"
        />
      </section>

      {/* Chart de invitaciones por mes */}
      <section
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Invitaciones por mes
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
          Últimos 12 meses.
        </p>
        {stats.monthlyInvites.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Aún no hay datos.</p>
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={stats.monthlyInvites}>
                <defs>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E07B39" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#E07B39" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(21,25,43,0.95)',
                    border: '1px solid rgba(224,123,57,0.3)',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                  cursor={{ stroke: '#E07B39', strokeOpacity: 0.3 }}
                />
                <Area type="monotone" dataKey="count" stroke="#E07B39" strokeWidth={2.5} fill="url(#invGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Top 10 inviters */}
      <section
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Top 10 referidores
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
          Usuarios con más invitaciones aprobadas.
        </p>
        {stats.topInviters.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Aún no hay referidores.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  <th style={th}>#</th>
                  <th style={th}>Usuario</th>
                  <th style={th}>Email</th>
                  <th style={th}>Código</th>
                  <th style={{ ...th, textAlign: 'right' }}>Invitaciones</th>
                  <th style={{ ...th, textAlign: 'right' }}>Aprobadas</th>
                  <th style={{ ...th, textAlign: 'right' }}>Monedas</th>
                </tr>
              </thead>
              <tbody>
                {stats.topInviters.map((u, i) => (
                  <tr key={u.userId} style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                    <td style={td}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: 12,
                        background: i < 3 ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.05)',
                        color: i < 3 ? '#F59E0B' : 'var(--text-muted)',
                        fontWeight: 700, fontSize: 11,
                      }}>{i + 1}</span>
                    </td>
                    <td style={td}>{u.firstName} {u.lastName}</td>
                    <td style={{ ...td, color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ ...td, color: '#E07B39', fontWeight: 700, letterSpacing: '1px' }}>{u.code}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{u.totalInvites}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#10B981', fontWeight: 700 }}>{u.successfulInvites}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#F59E0B', fontWeight: 700 }}>{u.coinsBalance.toLocaleString('es-PE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 700 };
const td: React.CSSProperties = { padding: '10px' };

function Kpi({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: 800, color, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      </div>
    </div>
  );
}
