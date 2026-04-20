'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Shield, ArrowLeft, CheckCircle, XCircle, AlertTriangle,
  User, Building2, Phone, MapPin, CreditCard, FileText,
} from 'lucide-react';
import {
  getTrustValidationDetail, approveTrustValidation, rejectTrustValidation,
  TrustValidationDetail,
} from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function TrustValidationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [detail, setDetail]         = useState<TrustValidationDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [acting, setActing]         = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason]         = useState('');

  useEffect(() => {
    getTrustValidationDetail(Number(id))
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!confirm('¿Confirmar validación? El proveedor recibirá el badge de "Confiable".')) return;
    setActing(true);
    try {
      await approveTrustValidation(Number(id));
      router.push('/trust-validation');
    } catch (e: any) { alert(e.message); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!reason.trim()) { alert('Debes indicar el motivo del rechazo.'); return; }
    setActing(true);
    try {
      await rejectTrustValidation(Number(id), reason.trim());
      router.push('/trust-validation');
    } catch (e: any) { alert(e.message); }
    finally { setActing(false); }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando...</div>;
  if (error)   return <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>{error}</div>;
  if (!detail) return null;

  const { request, provider } = detail;
  const isPending = request.status === 'PENDING';
  const isNegocio = provider.type === 'NEGOCIO';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => router.push('/trust-validation')}
          style={{
            width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer',
            background: 'var(--surface-3)', border: '1px solid var(--border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#10B981" />
            Validación #{request.id} — {provider.businessName}
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '2px' }}>
            Solicitado el {new Date(request.createdAt).toLocaleString('es-PE')}
          </p>
        </div>
      </div>

      {/* Comparative tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: Datos del formulario de validación */}
        <DataCard
          title="Datos del Formulario de Validación"
          subtitle="Información enviada por el solicitante"
          accent="#10B981"
          icon={<Shield size={16} color="#10B981" />}
          rows={[
            { label: 'Nombre en DNI', value: `${request.dniFirstName ?? ''} ${request.dniLastName ?? ''}`.trim() || '—' },
            { label: 'Número de DNI', value: request.dniNumber ?? '—' },
            { label: 'Dirección en DNI', value: request.dniAddress ?? '—' },
            ...(isNegocio ? [
              { label: 'RUC', value: request.rucNumber ?? '—' },
              { label: 'Dirección del negocio', value: request.businessAddress ?? '—' },
            ] : []),
          ]}
        />

        {/* Right: Datos del registro */}
        <DataCard
          title="Datos del Registro"
          subtitle="Información registrada al crear el perfil"
          accent="#3B82F6"
          icon={<User size={16} color="#3B82F6" />}
          rows={[
            { label: 'Titular', value: provider.ownerName },
            { label: 'DNI registrado', value: provider.dni ?? '—' },
            { label: isNegocio ? 'RUC registrado' : 'Nombre del servicio', value: isNegocio ? (provider.ruc ?? '—') : provider.businessName },
            { label: isNegocio ? 'Razón Social' : 'Descripción', value: isNegocio ? (provider.razonSocial ?? '—') : (provider.description ?? '—') },
            { label: 'Teléfono', value: provider.phone },
            { label: 'Dirección registrada', value: provider.address ?? '—' },
          ]}
        />
      </div>

      {/* Photos */}
      <div style={{
        background: 'var(--surface-1)', borderRadius: '16px',
        border: '1px solid var(--border-default)', padding: '20px',
      }}>
        <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px', marginBottom: '16px' }}>
          Fotos enviadas
        </h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { url: request.dniPhotoFrontUrl, label: 'DNI Frontal' },
            { url: request.dniPhotoBackUrl,  label: 'DNI Posterior' },
            { url: request.selfieWithDniUrl, label: 'Selfie con DNI' },
            { url: request.businessPhotoUrl, label: 'Foto del Local' },
            { url: request.ownerDniPhotoUrl, label: 'DNI del Titular' },
          ].filter(p => p.url).map(photo => (
            <div key={photo.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                {photo.label}
              </span>
              <a href={`${API_BASE}${photo.url}`} target="_blank" rel="noopener noreferrer">
                <img
                  src={`${API_BASE}${photo.url}`}
                  alt={photo.label}
                  style={{
                    width: '160px', height: '110px', objectFit: 'cover',
                    borderRadius: '10px', border: '1px solid var(--border-default)',
                    cursor: 'pointer', transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.target as HTMLImageElement).style.opacity = '0.8'}
                  onMouseLeave={e => (e.target as HTMLImageElement).style.opacity = '1'}
                />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isPending && (
        <div style={{
          background: 'var(--surface-1)', borderRadius: '16px',
          border: '1px solid var(--border-default)', padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>Decisión</h3>

          {showReject ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
                Motivo del rechazo
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe por qué se rechaza la solicitud (ej: La foto del DNI no es legible, los datos no coinciden...)"
                rows={3}
                style={{
                  background: 'var(--surface-3)', border: '1px solid var(--border-default)',
                  borderRadius: '10px', padding: '12px', color: 'var(--text-primary)',
                  fontSize: '13px', resize: 'vertical', outline: 'none',
                  width: '100%', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { setShowReject(false); setReason(''); }}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', cursor: 'pointer',
                    background: 'var(--surface-3)', border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)', fontSize: '13px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={acting || !reason.trim()}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', cursor: 'pointer',
                    background: '#EF4444', border: 'none', color: '#fff',
                    fontSize: '13px', fontWeight: 600,
                    opacity: (acting || !reason.trim()) ? 0.5 : 1,
                  }}
                >
                  {acting ? 'Rechazando...' : 'Confirmar rechazo'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleApprove}
                disabled={acting}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 24px', borderRadius: '12px', cursor: 'pointer',
                  background: '#10B981', border: 'none', color: '#fff',
                  fontSize: '14px', fontWeight: 700, opacity: acting ? 0.6 : 1,
                }}
              >
                <CheckCircle size={16} />
                {isNegocio ? 'Validar Negocio' : 'Validar Profesional'}
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={acting}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 24px', borderRadius: '12px', cursor: 'pointer',
                  background: '#EF444418', border: '1.5px solid #EF4444',
                  color: '#EF4444', fontSize: '14px', fontWeight: 600,
                  opacity: acting ? 0.6 : 1,
                }}
              >
                <XCircle size={16} /> No validar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rejection reason (already reviewed) */}
      {request.status === 'REJECTED' && request.rejectionReason && (
        <div style={{
          background: '#EF444410', borderRadius: '14px',
          border: '1px solid #EF444430', padding: '16px',
          display: 'flex', gap: '10px',
        }}>
          <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ color: '#EF4444', fontWeight: 600, fontSize: '13px' }}>Motivo del rechazo</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>{request.rejectionReason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DataCard({ title, subtitle, accent, icon, rows }: {
  title: string; subtitle: string; accent: string;
  icon: React.ReactNode;
  rows: { label: string; value: string }[];
}) {
  return (
    <div style={{
      background: 'var(--surface-1)', borderRadius: '16px',
      border: `1px solid ${accent}30`, overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px', borderBottom: `1px solid ${accent}20`,
        background: `${accent}08`,
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        {icon}
        <div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>{title}</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ padding: '4px 0' }}>
        {rows.map(row => (
          <div key={row.label} style={{
            display: 'flex', padding: '10px 18px', gap: '12px',
            borderBottom: '1px solid var(--border-default)',
          }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', minWidth: '130px', flexShrink: 0 }}>
              {row.label}
            </span>
            <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
