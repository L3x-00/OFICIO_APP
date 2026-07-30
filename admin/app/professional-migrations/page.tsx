'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Clock, CheckCircle, XCircle, RefreshCw, FileText, type LucideIcon } from 'lucide-react';
import {
  getProfessionalMigrations,
  ProfessionalMigrationListItem,
  ProfessionalMigrationStatus,
} from '@/lib/api';

const STATUS_TABS: { value: ProfessionalMigrationStatus; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'PENDING',  label: 'Pendientes', icon: Clock,       color: '#F59E0B' },
  { value: 'APPROVED', label: 'Aprobadas',  icon: CheckCircle, color: '#10B981' },
  { value: 'REJECTED', label: 'Rechazadas', icon: XCircle,     color: '#EF4444' },
];

const LIMIT = 20;

export default function ProfessionalMigrationsPage() {
  const router = useRouter();
  const [tab, setTab]           = useState<ProfessionalMigrationStatus>('PENDING');
  const [page, setPage]         = useState(1);
  const [items, setItems]       = useState<ProfessionalMigrationListItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await getProfessionalMigrations({ status: tab, page, limit: LIMIT });
      setItems(res.data);
      setTotal(res.total);
      setLastPage(res.lastPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar migraciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab, page]);

  const handleTabChange = (value: ProfessionalMigrationStatus) => {
    setTab(value);
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GraduationCap size={22} color="#3B82F6" /> Migraciones a Servicio Profesional
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '4px' }}>
            Revisa solicitudes de proveedores de Oficios para pasar a Servicios profesionales
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{total} resultados</span>
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
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {STATUS_TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => handleTabChange(t.value)}
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
            <GraduationCap size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>No hay solicitudes {tab === 'PENDING' ? 'pendientes' : tab === 'APPROVED' ? 'aprobadas' : 'rechazadas'}</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {['Solicitante', 'Negocio/Perfil', 'Especialidad', 'Documentos', 'Fecha', 'Estado', ''].map(h => (
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
                    onClick={() => router.push(`/professional-migrations/${item.id}`)}
                    style={{
                      borderBottom: '1px solid var(--border-default)',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px' }}>
                        {item.provider.user.firstName} {item.provider.user.lastName}
                      </p>
                      <p style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{item.provider.user.email}</p>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontSize: '13px' }}>
                      {item.provider.businessName}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontSize: '13px' }}>
                      {item.specialty}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        <FileText size={12} /> {item._count.documents}
                      </span>
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

            {/* Paginación */}
            {lastPage > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'center', gap: '8px',
                padding: '16px', borderTop: '1px solid var(--border-default)',
              }}>
                {Array.from({ length: lastPage }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    onClick={() => setPage(num)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 600,
                      border: num === page ? '1.5px solid var(--brand)' : '1px solid var(--border-default)',
                      background: num === page ? 'var(--brand-glow)' : 'var(--surface-2)',
                      color: num === page ? 'var(--brand-light)' : 'var(--text-secondary)',
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    PENDING:  { color: '#F59E0B', label: 'Pendiente' },
    APPROVED: { color: '#10B981', label: 'Aprobada'  },
    REJECTED: { color: '#EF4444', label: 'Rechazada' },
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
