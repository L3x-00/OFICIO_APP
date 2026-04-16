'use client';

import { GraceProvider } from '@/lib/api';
import { StatusBadge } from './status-badge';
import { formatDate } from '@/lib/utils';
import { Phone, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';

interface Props {
  providers: GraceProvider[];
}

export function GraceProvidersTable({ providers }: Props) {
  if (providers.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: '12px',
      }}>
        <div style={{
          width: '48px', height: '48px',
          borderRadius: '12px',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <CheckCircle size={22} color="#10B981" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Sin proveedores en periodo de gracia
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Todos los servicios están al día con sus suscripciones
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
            {['Proveedor', 'Categoría · Localidad', 'Vence', 'Días restantes', 'Verificado'].map(h => (
              <th key={h} style={{
                padding: '12px 20px',
                textAlign: 'left',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {providers.map((sub) => {
            const isCritical = sub.daysLeft <= 3;
            const isUrgent   = sub.daysLeft <= 7;

            return (
              <tr
                key={sub.id}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
              >
                {/* Provider */}
                <td style={{ padding: '14px 20px' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      {sub.provider.businessName}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Phone size={10} color="var(--text-tertiary)" />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                        {sub.provider.phone}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Category + locality */}
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <StatusBadge label={sub.provider.category.name} variant="info" size="sm" />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                      {sub.provider.locality.name}
                    </span>
                  </div>
                </td>

                {/* End date */}
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={12} color="var(--text-tertiary)" />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatDate(sub.endDate)}
                    </span>
                  </div>
                </td>

                {/* Days left */}
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isCritical && (
                      <AlertTriangle size={13} color="#EF4444" />
                    )}
                    <StatusBadge
                      label={`${sub.daysLeft}d`}
                      variant={isCritical ? 'danger' : isUrgent ? 'warning' : 'success'}
                      dot
                    />
                  </div>
                </td>

                {/* Verified */}
                <td style={{ padding: '14px 20px' }}>
                  {sub.provider.isVerified ? (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 9px',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: '99px',
                    }}>
                      <CheckCircle size={11} color="#10B981" />
                      <span style={{ fontSize: '11px', color: '#34D399', fontWeight: 600 }}>Sí</span>
                    </div>
                  ) : (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 9px',
                      background: 'rgba(100,116,139,0.08)',
                      border: '1px solid rgba(100,116,139,0.15)',
                      borderRadius: '99px',
                    }}>
                      <XCircle size={11} color="var(--text-tertiary)" />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>No</span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}