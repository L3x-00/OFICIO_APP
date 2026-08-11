'use client';

import { useEffect, useState } from 'react';
import { Store, RefreshCw, CheckCircle, Users, ShieldQuestion, ImageIcon, type LucideIcon } from 'lucide-react';
import {
  getCaptacionLeads,
  convertCaptacionLeads,
  CaptacionLead,
  CaptacionStats,
} from '@/lib/api';

type Tab = 'consented' | 'all' | 'converted';

const TABS: { value: Tab; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'consented', label: 'Consentidos (listos)', icon: CheckCircle, color: '#10B981' },
  { value: 'all',       label: 'Todos',                icon: Users,       color: '#3B82F6' },
  { value: 'converted', label: 'Convertidos',          icon: Store,       color: '#8B5CF6' },
];

const PAGE_SIZE = 25;

const CONSENT_LABEL: Record<string, { label: string; color: string }> = {
  CONSENTED:     { label: 'Consiente',      color: '#10B981' },
  PENDING:       { label: 'Contacto pend.', color: '#F59E0B' },
  NOT_CONTACTED: { label: 'Sin contactar',  color: '#6B7280' },
  DECLINED:      { label: 'Rechazó',        color: '#EF4444' },
};

export default function CaptacionPage() {
  const [tab, setTab]         = useState<Tab>('consented');
  const [page, setPage]       = useState(1);
  const [items, setItems]     = useState<CaptacionLead[]>([]);
  const [pages, setPages]     = useState(1);
  const [stats, setStats]     = useState<CaptacionStats | null>(null);
  const [stagingMissing, setStagingMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [approve, setApprove] = useState(false);
  const [busy, setBusy]       = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const params =
        tab === 'consented' ? { consent: 'CONSENTED', converted: 'no' }
        : tab === 'converted' ? { converted: 'yes' }
        : {};
      const res = await getCaptacionLeads({ ...params, page, pageSize: PAGE_SIZE });
      setItems(res.items);
      setPages(res.pages);
      setStats(res.stats);
      setStagingMissing(res.stagingMissing);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab, page]);

  const convert = async (leadKeys: string[]) => {
    if (leadKeys.length === 0) return;
    if (approve && !window.confirm(
      `Vas a CREAR y PUBLICAR ${leadKeys.length} negocio(s) como proveedor visible en Servi. ¿Continuar?`,
    )) return;
    setBusy(leadKeys.length === 1 ? leadKeys[0] : 'bulk'); setMessage('');
    try {
      const res = await convertCaptacionLeads(leadKeys, approve);
      const ok = res.results.filter(r => r.ok).length;
      const fail = res.results.filter(r => !r.ok);
      setMessage(
        `${ok} convertido(s)${approve ? ' y publicados' : ' (pendientes de aprobación)'}.` +
        (fail.length ? ` ${fail.length} con error: ${fail.map(f => `${f.leadKey.slice(0, 8)}… ${f.error}`).join('; ')}` : ''),
      );
      if (res.stats) setStats(res.stats);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error al convertir');
    } finally {
      setBusy(null);
    }
  };

  const consentableInView = items.filter(i => i.consentStatus === 'CONSENTED' && i.convertedProviderId == null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Store size={22} color="#8B5CF6" /> Captación de negocios
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '4px' }}>
            Convierte los leads NEGOCIO consentidos en proveedores reales. Quedan PENDIENTES de aprobación (o publicados, si activas el toggle).
          </p>
        </div>
        <button
          onClick={load}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: 'var(--surface-3)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <StatChip label="Consentidos listos" value={stats.consented} color="#10B981" />
          <StatChip label="Ya convertidos" value={stats.converted} color="#8B5CF6" />
          <StatChip label="Total en staging" value={stats.total} color="#3B82F6" />
        </div>
      )}

      {stagingMissing && (
        <div style={{ padding: '14px 16px', borderRadius: '12px', background: '#F59E0B18', border: '1px solid #F59E0B55', color: '#B45309', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ShieldQuestion size={16} /> No se encontró el staging de leads. Aplica <code>provider_leads_staging.sql</code> y carga el <code>import.sql</code> del panel en Supabase.
        </div>
      )}

      {/* Toggle aprobar */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <input type="checkbox" checked={approve} onChange={e => setApprove(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#8B5CF6' }} />
        <span><strong style={{ color: 'var(--text-primary)' }}>Aprobar y publicar al convertir</strong> — si lo dejas apagado, el negocio queda PENDIENTE en la cola de Verificación.</span>
      </label>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const Icon = t.icon; const active = tab === t.value;
          return (
            <button key={t.value} onClick={() => { setTab(t.value); setPage(1); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', border: active ? `1.5px solid ${t.color}` : '1px solid var(--border-default)', background: active ? `${t.color}18` : 'var(--surface-2)', color: active ? t.color : 'var(--text-secondary)', fontWeight: active ? 600 : 400, fontSize: '13px' }}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Bulk + message */}
      {tab === 'consented' && consentableInView.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => convert(consentableInView.map(i => i.leadKey))}
            disabled={busy !== null}
            style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: busy ? 'var(--surface-4)' : '#10B981', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: busy ? 'wait' : 'pointer' }}
          >
            {busy === 'bulk' ? 'Convirtiendo…' : `Convertir ${consentableInView.length} consentido(s) de esta página`}
          </button>
        </div>
      )}
      {message && (
        <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--surface-3)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: '13px' }}>
          {message}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--surface-1)', borderRadius: '16px', border: '1px solid var(--border-default)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando…</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <Store size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>No hay leads en esta vista.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {['Negocio', 'Ubicación', 'Categoría', 'Consentimiento', 'Fotos', 'Estado', ''].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const consent = CONSENT_LABEL[item.consentStatus] ?? { label: item.consentStatus, color: '#6B7280' };
                    const done = item.convertedProviderId != null;
                    const canConvert = item.consentStatus === 'CONSENTED' && !done;
                    return (
                      <tr key={item.leadKey} style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px' }}>{item.businessName}</td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>{item.district}, {item.province}</td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>{item.categoryName ?? <span style={{ color: '#EF4444' }}>sin categoría</span>}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: `${consent.color}18`, color: consent.color }}>{consent.label}</span>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ImageIcon size={12} /> {item.photoCount}</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {done
                            ? <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: '#8B5CF618', color: '#8B5CF6' }}>Proveedor #{item.convertedProviderId}</span>
                            : <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{item.status}</span>}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          {done ? (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                          ) : canConvert ? (
                            <button
                              onClick={() => convert([item.leadKey])}
                              disabled={busy !== null}
                              style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: busy ? 'var(--surface-4)' : '#10B981', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: busy ? 'wait' : 'pointer' }}
                            >
                              {busy === item.leadKey ? '…' : 'Convertir'}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }} title="Solo se convierten leads con consentimiento">requiere consentir</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid var(--border-default)' }}>
                {Array.from({ length: pages }, (_, i) => i + 1).map(num => (
                  <button key={num} onClick={() => setPage(num)}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, border: num === page ? '1.5px solid var(--brand)' : '1px solid var(--border-default)', background: num === page ? 'var(--brand-glow)' : 'var(--surface-2)', color: num === page ? 'var(--brand-light)' : 'var(--text-secondary)' }}>
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

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'var(--surface-1)', border: '1px solid var(--border-default)', minWidth: '150px' }}>
      <p style={{ fontSize: '22px', fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{label}</p>
    </div>
  );
}
