'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Loader2, Coins, ShieldCheck,
} from 'lucide-react';
import {
  getAdminRewards,
  createReward,
  updateReward,
  deleteReward,
  getProviders,
  type AdminReward,
  type Provider,
} from '@/lib/api';

export default function RewardsPage() {
  const [rewards, setRewards] = useState<AdminReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminReward | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    getAdminRewards()
      .then(setRewards)
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function toggleActive(reward: AdminReward) {
    setBusyId(reward.id);
    try {
      const updated = await updateReward(reward.id, { isActive: !reward.isActive });
      setRewards((prev) => prev.map((r) => (r.id === reward.id ? updated : r)));
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(reward: AdminReward) {
    const ok = window.confirm(
      `¿Eliminar "${reward.title}"? Los canjes ya realizados no se ven afectados.`,
    );
    if (!ok) return;
    setBusyId(reward.id);
    try {
      await deleteReward(reward.id);
      setRewards((prev) => prev.filter((r) => r.id !== reward.id));
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Recompensas canjeables
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Servicios que los proveedores ofrecen y los usuarios pueden canjear con monedas.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: '#E07B39',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 16px',
            fontWeight: 700,
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Añadir servicio
        </button>
      </header>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
          {error}
        </div>
      )}

      <section
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '32px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Cargando…
          </div>
        ) : rewards.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
              Aún no hay recompensas
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Crea la primera para que aparezca en la app móvil.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', background: 'rgba(255,255,255,0.02)' }}>
                <th style={th}>Proveedor</th>
                <th style={th}>Título</th>
                <th style={{ ...th, textAlign: 'right' }}>Costo</th>
                <th style={{ ...th, textAlign: 'center' }}>Canjes</th>
                <th style={{ ...th, textAlign: 'center' }}>Estado</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{r.provider.businessName}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      #{r.provider.id} · {r.provider.type}
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                      {r.description.length > 70 ? r.description.slice(0, 70) + '…' : r.description}
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#F59E0B' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Coins size={12} />
                      {r.coinsCost.toLocaleString('es-PE')}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>
                    {r._count?.redemptions ?? 0}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button
                      onClick={() => toggleActive(r)}
                      disabled={busyId === r.id}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        border: `1px solid ${r.isActive ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        background: r.isActive ? 'rgba(16,185,129,0.16)' : 'rgba(255,255,255,0.04)',
                        color: r.isActive ? '#10B981' : 'var(--text-muted)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: busyId === r.id ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                      }}
                    >
                      {r.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        onClick={() => setEditing(r)}
                        style={iconBtn('#3B82F6')}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(r)}
                        disabled={busyId === r.id}
                        style={iconBtn('#EF4444')}
                        title="Eliminar"
                      >
                        {busyId === r.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showCreate && (
        <RewardModal
          onClose={() => setShowCreate(false)}
          onSaved={(created) => {
            setRewards((prev) => [created, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
      {editing && (
        <RewardModal
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRewards((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '12px 14px', fontWeight: 700 };
const td: React.CSSProperties = { padding: '14px' };

function iconBtn(color: string): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: `1px solid ${color}55`,
    background: `${color}18`,
    color,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

/* ─────────────────────── modal de creación / edición ───────────────────── */

function RewardModal({
  editing,
  onClose,
  onSaved,
}: {
  editing?: AdminReward;
  onClose: () => void;
  onSaved: (r: AdminReward) => void;
}) {
  const [providerId, setProviderId] = useState<number | null>(editing?.providerId ?? null);
  const [providerLabel, setProviderLabel] = useState<string>(
    editing ? `${editing.provider.businessName} (#${editing.provider.id})` : '',
  );
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [coinsCost, setCoinsCost] = useState<number>(editing?.coinsCost ?? 100);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!providerId) { setErr('Selecciona un proveedor'); return; }
    if (!title.trim()) { setErr('El título es obligatorio'); return; }
    if (!description.trim()) { setErr('La descripción es obligatoria'); return; }
    if (!Number.isFinite(coinsCost) || coinsCost <= 0) { setErr('Costo inválido'); return; }

    setSaving(true);
    try {
      const result = editing
        ? await updateReward(editing.id, { title, description, coinsCost })
        : await createReward({ providerId, title, description, coinsCost });
      onSaved(result);
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 14,
          width: '100%',
          maxWidth: 520,
          padding: 20,
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>
            {editing ? 'Editar recompensa' : 'Añadir servicio canjeable'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ProviderPicker
            disabled={!!editing}
            initialLabel={providerLabel}
            onSelect={(p) => {
              setProviderId(p.id);
              setProviderLabel(`${p.businessName} (#${p.id})`);
            }}
          />

          <Field label="Título del servicio">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Una instalación eléctrica básica"
              style={input}
            />
          </Field>

          <Field label="Descripción">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detalles del servicio que recibirá quien canjee."
              style={{ ...input, resize: 'vertical', minHeight: 70 }}
            />
          </Field>

          <Field label="Costo en monedas">
            <input
              type="number"
              min={1}
              value={coinsCost}
              onChange={(e) => setCoinsCost(Number(e.target.value))}
              style={input}
            />
          </Field>

          {err && (
            <p style={{ color: '#ef4444', fontSize: 12 }}>{err}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)', padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
            }}>Cancelar</button>
            <button
              onClick={submit}
              disabled={saving}
              style={{
                background: '#E07B39', color: '#fff', border: 'none',
                padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {saving && <Loader2 size={14} className="spin" />}
              {editing ? 'Guardar cambios' : 'Crear servicio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const input: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-default)',
  borderRadius: 10,
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
};

/* ─────────────────────── selector de proveedor ─────────────────────── */

function ProviderPicker({
  disabled,
  initialLabel,
  onSelect,
}: {
  disabled?: boolean;
  initialLabel?: string;
  onSelect: (p: Provider) => void;
}) {
  const [query, setQuery] = useState(initialLabel ?? '');
  const [results, setResults] = useState<Provider[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (disabled) return;
    if (query.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await getProviders(1, query.trim());
        if (!cancelled) {
          // Solo APROBADOS — el backend rechaza recompensas para no aprobados.
          setResults(
            res.data.filter((p) => (p as Provider & { verificationStatus?: string }).verificationStatus === 'APROBADO'),
          );
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, disabled]);

  return (
    <Field label="Proveedor (solo aprobados)">
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }}>
          <Search size={14} />
        </span>
        <input
          value={query}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por nombre…"
          style={{ ...input, paddingLeft: 32, opacity: disabled ? 0.6 : 1 }}
        />
        {open && !disabled && results.length > 0 && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5,
              background: 'var(--surface-2)', border: '1px solid var(--border-default)',
              borderRadius: 10, marginTop: 4, maxHeight: 220, overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}
          >
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p);
                  setQuery(`${p.businessName} (#${p.id})`);
                  setOpen(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 12px', background: 'transparent', border: 'none', textAlign: 'left',
                  cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ShieldCheck size={14} color="#10B981" />
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.businessName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>#{p.id} · {p.type ?? '—'}</div>
                </span>
              </button>
            ))}
          </div>
        )}
        {searching && (
          <span style={{ position: 'absolute', right: 12, top: 12 }}>
            <Loader2 size={14} className="spin" />
          </span>
        )}
      </div>
    </Field>
  );
}
