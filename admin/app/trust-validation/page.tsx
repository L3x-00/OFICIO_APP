'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { getTrustValidationList, TrustValidationItem } from '@/lib/api';

const STATUS_TABS = [
  { value: 'PENDING',  label: 'Pendientes',  icon: Clock,        color: '#F59E0B' },
  { value: 'APPROVED', label: 'Aprobados',   icon: CheckCircle,  color: '#10B981' },
  { value: 'REJECTED', label: 'Rechazados',  icon: XCircle,      color: '#EF4444' },
];

export default function TrustValidationPage() {
  const router = useRouter();
  const [tab, setTab]         = useState('PENDING');
  const [items, setItems]     = useState<TrustValidationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      setItems(await getTrustValidationList(tab));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={22} color="#10B981" /> Validación de Confianza
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '4px' }}>
            Revisa y valida la identidad de profesionales y negocios
          </p>
        </div>
        <button
          onClick={load}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px',
            background: 'var(--surface-3)', border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px',
          }}
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {STATUS_TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                border: active ? `1.5px solid ${t.color}` : '1px solid var(--border-default)',
                background: active ? `${t.color}18` : 'var(--surface-2)',
                color: active ? t.color : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400, fontSize: '13px',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--surface-1)', borderRadius: '16px',
        border: '1px solid var(--border-default)', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Cargando...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <Shield size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>No hay solicitudes {tab === 'PENDING' ? 'pendientes' : tab === 'APPROVED' ? 'aprobadas' : 'rechazadas'}</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Solicitante', 'Tipo', 'Negocio/Perfil', 'Fecha', 'Estado', ''].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
                    color: 'var(--text-tertiary)', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.id}
                  onClick={() => router.push(`/trust-validation/${item.id}`)}
                  style={{
                    borderBottom: '1px solid var(--border-default)',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px' }}>{item.ownerName}</p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{item.email}</p>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                      background: item.providerType === 'NEGOCIO' ? '#8E2DE218' : '#0072FF18',
                      color: item.providerType === 'NEGOCIO' ? '#8E2DE2' : '#0072FF',
                    }}>
                      {item.providerType === 'NEGOCIO' ? 'Negocio' : 'Profesional'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontSize: '13px' }}>
                    {item.businessName}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    {new Date(item.createdAt).toLocaleDateString('es-PE')}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ color: 'var(--brand)', fontSize: '12px', fontWeight: 500 }}>Ver →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    PENDING:  { color: '#F59E0B', label: 'Pendiente' },
    APPROVED: { color: '#10B981', label: 'Aprobado'  },
    REJECTED: { color: '#EF4444', label: 'Rechazado' },
  };
  const s = map[status] ?? { color: '#6B7280', label: status };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
      background: `${s.color}18`, color: s.color,
    }}>
      {s.label}
    </span>
  );
}
