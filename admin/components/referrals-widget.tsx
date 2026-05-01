'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Coins, ArrowUpRight, Users, Award, TrendingUp } from 'lucide-react';
import { getReferralStats, type ReferralStats } from '@/lib/api';

export function ReferralsWidget() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getReferralStats()
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { /* widget no rompe el dashboard */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-default)',
        borderRadius: '18px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(245,158,11,0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Coins size={18} color="#F59E0B" />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Referidos y monedas
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
              Resumen del programa de invitaciones.
            </p>
          </div>
        </div>
        <Link
          href="/referrals"
          style={{
            background: 'rgba(224,123,57,0.12)',
            color: '#E07B39',
            border: '1px solid rgba(224,123,57,0.4)',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Ver detalles
          <ArrowUpRight size={13} />
        </Link>
      </div>

      <div
        style={{
          padding: '20px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
        }}
      >
        <Mini icon={Users} label="Invitaciones" value={loading ? '—' : String(stats?.totalInvitations ?? 0)} color="#3B82F6" />
        <Mini icon={Award} label="Aprobadas" value={loading ? '—' : String(stats?.totalApproved ?? 0)} color="#10B981" />
        <Mini
          icon={TrendingUp}
          label="Conversión"
          value={loading ? '—' : `${(stats?.conversionRate ?? 0).toFixed(1)}%`}
          color="#E07B39"
        />
        <Mini
          icon={Coins}
          label="Monedas entregadas"
          value={loading ? '—' : (stats?.totalCoinsDistributed ?? 0).toLocaleString('es-PE')}
          color="#F59E0B"
        />
      </div>
    </div>
  );
}

function Mini({
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
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
          {value}
        </div>
      </div>
    </div>
  );
}
