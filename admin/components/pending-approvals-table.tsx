'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Clock, ShieldCheck, Building2, Mail } from 'lucide-react';
import {
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  type VerificationProvider,
} from '@/lib/api';
import { toast } from 'sonner';

const TYPE_STYLES: Record<string, { label: string; bg: string; border: string; color: string }> = {
  PROFESSIONAL: { label: 'Profesional', bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.2)',   color: '#60A5FA' },
  BUSINESS:     { label: 'Negocio',     bg: 'rgba(139,92,246,0.08)',   border: 'rgba(139,92,246,0.2)',   color: '#A78BFA' },
  OFICIO:       { label: 'Profesional', bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.2)',   color: '#60A5FA' },
  NEGOCIO:      { label: 'Negocio',     bg: 'rgba(139,92,246,0.08)',   border: 'rgba(139,92,246,0.2)',   color: '#A78BFA' },
};

interface Props { onAction?: () => void; }

interface RejectModal { id: number; name: string; }

export function PendingApprovalsTable({ onAction }: Props) {
  const [items, setItems]           = useState<VerificationProvider[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actionId, setActionId]     = useState<number | null>(null);
  const [modal, setModal]           = useState<RejectModal | null>(null);
  const [reason, setReason]         = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setItems(await getPendingVerifications()); }
    catch (e: any) { toast.error(e?.message || 'Error al cargar solicitudes'); }
    finally { setLoading(false); }
  }

  function removeItem(id: number) {
    setItems(prev => prev.filter(p => p.id !== id));
    onAction?.();
  }

  async function handleApprove(id: number) {
    setActionId(id);
    try {
      await approveVerification(id);
      removeItem(id);
      toast.success('Proveedor aprobado');
    } catch (e: any) { toast.error(e?.message || 'Error al aprobar'); }
    finally { setActionId(null); }
  }

  async function handleRejectSubmit() {
    if (!modal) return;
    if (!reason.trim()) { toast.error('El motivo es obligatorio'); return; }
    setModalLoading(true);
    try {
      await rejectVerification(modal.id, reason);
      removeItem(modal.id);
      toast.success('Solicitud rechazada');
      setModal(null);
      setReason('');
    } catch (e: any) { toast.error(e?.message || 'Error al rechazar'); }
    finally { setModalLoading(false); }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

  if (loading) {
    return (
      <div>
        {[1,2,3].map(i => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: '180px', height: '14px', marginBottom: '6px' }} />
              <div className="skeleton" style={{ width: '120px', height: '11px' }} />
            </div>
            <div className="skeleton" style={{ width: '140px', height: '32px', borderRadius: '8px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px', gap: '12px',
      }}>
        <div style={{
          width: '48px', height: '48px',
          borderRadius: '12px',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={22} color="#10B981" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Sin solicitudes pendientes
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Todos los proveedores están al día</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr auto auto auto',
        gap: '12px',
        padding: '10px 20px',
        borderBottom: '1px solid var(--border-default)',
        background: 'rgba(255,255,255,0.01)',
      }}>
        {['Proveedor', 'Email', 'Tipo', 'Fecha', 'Acciones'].map(h => (
          <span key={h} style={{
            fontSize: '10px', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}>
            {h}
          </span>
        ))}
      </div>

      <div>
        {items.map(p => {
          const typeInfo = TYPE_STYLES[p.type] ?? TYPE_STYLES['OFICIO'];
          const isActing = actionId === p.id;

          return (
            <div
              key={p.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr auto auto auto',
                gap: '12px',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{
                  width: '38px', height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(249,115,22,0.08)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '14px', fontWeight: 700, color: '#FB923C',
                }}>
                  {p.businessName.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.businessName}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.category.name} · {p.locality.name}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <Mail size={12} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.user.email}
                </span>
              </div>

              {/* Type */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: 600,
                background: typeInfo.bg,
                border: `1px solid ${typeInfo.border}`,
                color: typeInfo.color,
                whiteSpace: 'nowrap',
              }}>
                {typeInfo.label}
              </span>

              {/* Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                <Clock size={11} color="var(--text-tertiary)" />
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{fmt(p.createdAt)}</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => handleApprove(p.id)}
                  disabled={isActing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    color: '#34D399',
                    fontSize: '12px', fontWeight: 600,
                    cursor: isActing ? 'not-allowed' : 'pointer',
                    opacity: isActing ? 0.6 : 1,
                    transition: 'var(--transition)',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => !isActing && ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.18)')}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.1)'}
                >
                  {isActing
                    ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                    : <CheckCircle size={11} />
                  }
                  Aprobar
                </button>
                <button
                  onClick={() => setModal({ id: p.id, name: p.businessName })}
                  disabled={isActing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#F87171',
                    fontSize: '12px', fontWeight: 600,
                    cursor: isActing ? 'not-allowed' : 'pointer',
                    opacity: isActing ? 0.6 : 1,
                    transition: 'var(--transition)',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => !isActing && ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)')}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'}
                >
                  <XCircle size={11} />
                  Rechazar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reject modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: '16px',
        }}
        onClick={() => { setModal(null); setReason(''); }}
        >
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-strong)',
              borderRadius: '18px',
              padding: '24px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '40px', height: '40px',
                borderRadius: '10px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <XCircle size={18} color="#EF4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Rechazar solicitud
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {modal.name}
                </p>
              </div>
            </div>

            <label style={{
              display: 'block',
              fontSize: '12px', fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '6px',
              letterSpacing: '0.02em',
            }}>
              Motivo del rechazo <span style={{ color: '#F87171' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              placeholder="Ej: Documentos ilegibles, información incompleta, datos no verificables..."
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--surface-3)',
                border: '1px solid var(--border-default)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                resize: 'none',
                outline: 'none',
                marginBottom: '16px',
                lineHeight: 1.6,
                transition: 'var(--transition)',
                fontFamily: 'inherit',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--danger)';
                e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.1)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border-default)';
                e.target.style.boxShadow = 'none';
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setModal(null); setReason(''); }}
                style={{
                  flex: 1, padding: '10px',
                  background: 'var(--surface-4)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '9px',
                  color: 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'}
              >
                Cancelar
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={modalLoading || !reason.trim()}
                style={{
                  flex: 1, padding: '10px',
                  background: modalLoading || !reason.trim() ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '9px',
                  color: '#F87171',
                  fontSize: '13px', fontWeight: 600,
                  cursor: modalLoading || !reason.trim() ? 'not-allowed' : 'pointer',
                  opacity: !reason.trim() ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'var(--transition)',
                }}
              >
                {modalLoading && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}