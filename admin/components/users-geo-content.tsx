'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, RefreshCw, Loader2, AlertTriangle, Users } from 'lucide-react';
import { getUsersGeoStats, UserGeoStatsRow } from '@/lib/api';
import type { MapPoint } from './maps/peru-providers-map';

// Leaflet rompe en SSR (usa `window`). Cargamos el componente solo en
// cliente con `dynamic({ ssr: false })`. Mientras tanto un placeholder
// del mismo alto evita layout shift.
const PeruProvidersMap = dynamic(() => import('./maps/peru-providers-map'), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: 480 }}
      className="rounded-2xl border border-white/5 bg-slate-900/50 flex items-center justify-center"
    >
      <Loader2 className="animate-spin text-amber-400" size={20} />
    </div>
  ),
});

// Paleta del admin — coherente con analytics-content.
const C = {
  primary:   '#F97316',  // naranja (header pill)
  accent:    '#F59E0B',  // ámbar (highlights)
  text:      '#E5E7EB',
  textMuted: '#9CA3AF',
  bgCard:    '#1F2937',
  border:    'rgba(255,255,255,0.06)',
  success:   '#10B981',
};

function fmtRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60_000);
  if (min < 1)    return 'hace segundos';
  if (min < 60)   return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24)   return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `hace ${days} d`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months === 1 ? '' : 'es'}`;
}

export default function UsersGeoContent() {
  const [rows, setRows]       = useState<UserGeoStatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  const load = async (isReload = false) => {
    if (isReload) setReloading(true); else setLoading(true);
    setError(null);
    try {
      const data = await getUsersGeoStats();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos de geolocalización.');
    } finally {
      setLoading(false);
      setReloading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const totalUsers = useMemo(
    () => rows.reduce((sum, r) => sum + r.userCount, 0),
    [rows],
  );

  // Puntos para el mapa — filtra los que tengan coords (todos los del
  // nuevo backend las traen; el filter es defensivo si vuelve algún
  // departamento sin centroide registrado).
  const mapPoints: MapPoint[] = useMemo(
    () =>
      rows
        .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
        .map((r) => ({
          department:    r.department,
          providerCount: r.userCount,
          lat:           r.lat as number,
          lng:           r.lng as number,
        })),
    [rows],
  );

  // Top 3 destacadas como cards arriba; el resto como tabla.
  const top3   = rows.slice(0, 3);
  const others = rows.slice(3);

  return (
    <div style={{ padding: 24, color: C.text }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${C.primary}22`, color: C.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MapPin size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              Mapa de proveedores
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMuted }}>
              Distribución por departamento. {totalUsers} proveedor{totalUsers === 1 ? '' : 'es'} registrado{totalUsers === 1 ? '' : 's'}.
            </p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={reloading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            background: `${C.accent}22`, color: C.accent,
            border: `1px solid ${C.accent}55`,
            fontSize: 13, fontWeight: 600, cursor: reloading ? 'wait' : 'pointer',
          }}
        >
          {reloading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {reloading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {loading && <SkeletonState />}
      {!loading && error && <ErrorState message={error} onRetry={() => load()} />}
      {!loading && !error && rows.length === 0 && <EmptyState />}

      {!loading && !error && rows.length > 0 && (
        <>
          {/* ── Mapa interactivo del Perú ─────────────────── */}
          {mapPoints.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <PeruProvidersMap points={mapPoints} height={480} />
            </div>
          )}

          {/* ── Top 3 departamentos como cards ────────────── */}
          {top3.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              marginBottom: 24,
            }}>
              {top3.map((r, i) => (
                <CityCard key={`${r.city}-${r.department}`} row={r} rank={i + 1} />
              ))}
            </div>
          )}

          {/* ── Tabla del resto ───────────────────────────── */}
          {others.length > 0 && (
            <div style={{
              background: C.bgCard,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <Th>Departamento</Th>
                    <Th align="right">Proveedores</Th>
                    <Th align="right">Último alta</Th>
                  </tr>
                </thead>
                <tbody>
                  {others.map((r) => (
                    <tr key={r.department}
                        style={{ borderTop: `1px solid ${C.border}` }}>
                      <Td>{r.department}</Td>
                      <Td align="right" bold>{r.userCount}</Td>
                      <Td align="right" muted>{fmtRelative(r.lastAccess)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Cards top 3 ───────────────────────────────────────────
function CityCard({ row, rank }: { row: UserGeoStatsRow; rank: number }) {
  const rankColor = rank === 1 ? C.accent : rank === 2 ? C.primary : C.textMuted;
  return (
    <div style={{
      background: C.bgCard,
      borderRadius: 12,
      padding: 16,
      border: `1px solid ${C.border}`,
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 12, right: 12,
        fontSize: 11, fontWeight: 700, color: rankColor,
        background: `${rankColor}22`, padding: '2px 8px', borderRadius: 12,
      }}>
        #{rank}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Users size={16} color={C.accent} />
        <span style={{ fontSize: 22, fontWeight: 700, color: C.text }}>
          {row.userCount}
        </span>
        <span style={{ fontSize: 11, color: C.textMuted }}>
          proveedor{row.userCount === 1 ? '' : 'es'}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{row.department}</div>
      <div style={{ fontSize: 12, color: C.textMuted }}>Perú</div>
      <div style={{ marginTop: 10, fontSize: 11, color: C.success }}>
        Último: {fmtRelative(row.lastAccess)}
      </div>
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────
function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{
      textAlign: align,
      padding: '10px 14px',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.5,
      color: C.textMuted,
      textTransform: 'uppercase',
    }}>
      {children}
    </th>
  );
}

function Td({ children, align = 'left', bold = false, muted = false }: {
  children: React.ReactNode; align?: 'left' | 'right'; bold?: boolean; muted?: boolean;
}) {
  return (
    <td style={{
      textAlign: align,
      padding: '12px 14px',
      fontWeight: bold ? 700 : 400,
      color: muted ? C.textMuted : C.text,
    }}>
      {children}
    </td>
  );
}

function SkeletonState() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: 24, color: C.textMuted, fontSize: 13,
    }}>
      <Loader2 size={16} className="animate-spin" />
      Cargando proveedores por departamento…
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{
      background: '#3F1D1F',
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: 16,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <AlertTriangle size={20} color="#F87171" />
      <div style={{ flex: 1, color: '#FCA5A5', fontSize: 13 }}>{message}</div>
      <button onClick={onRetry} style={{
        padding: '6px 12px', borderRadius: 6,
        background: 'rgba(255,255,255,0.05)', color: C.text,
        border: `1px solid ${C.border}`, fontSize: 12, cursor: 'pointer',
      }}>
        Reintentar
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      background: C.bgCard,
      borderRadius: 12,
      padding: 40,
      textAlign: 'center',
      color: C.textMuted,
      fontSize: 13,
      border: `1px solid ${C.border}`,
    }}>
      <MapPin size={32} style={{ margin: '0 auto 12px' }} />
      <p style={{ margin: 0 }}>
        Aún no hay proveedores con departamento asignado. Cuando se
        aprueben perfiles, aparecerán en el mapa según su localidad.
      </p>
    </div>
  );
}
