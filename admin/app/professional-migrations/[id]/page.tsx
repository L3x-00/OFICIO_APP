'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  GraduationCap, ArrowLeft, CheckCircle, XCircle, AlertTriangle,
  User, Phone, Mail, FileText, Star,
} from 'lucide-react';
import {
  getProfessionalMigration, approveProfessionalMigration, rejectProfessionalMigration,
  ProfessionalMigrationDetail,
} from '@/lib/api';
import { StatusBadge } from '@/components/status-badge';

export default function ProfessionalMigrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [detail, setDetail]         = useState<ProfessionalMigrationDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [acting, setActing]         = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason]         = useState('');

  useEffect(() => {
    getProfessionalMigration(Number(id))
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!confirm('¿Confirmar la migración a Servicio Profesional? El proveedor pasará de Oficios a Servicios profesionales con las categorías solicitadas.')) return;
    setActing(true);
    try {
      await approveProfessionalMigration(Number(id));
      router.push('/professional-migrations');
    } catch (e) { alert(e instanceof Error ? e.message : 'Error al procesar la solicitud'); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!reason.trim()) { alert('Debes indicar el motivo del rechazo.'); return; }
    setActing(true);
    try {
      await rejectProfessionalMigration(Number(id), reason.trim());
      router.push('/professional-migrations');
    } catch (e) { alert(e instanceof Error ? e.message : 'Error al procesar la solicitud'); }
    finally { setActing(false); }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando...</div>;
  if (error)   return <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>{error}</div>;
  if (!detail) return null;

  const { provider } = detail;
  const isPending  = detail.status === 'PENDING';
  const coverImage = provider.images?.find(img => img.isCover) ?? provider.images?.[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={() => router.push('/professional-migrations')}
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
            <GraduationCap size={18} color="#3B82F6" />
            Migración #{detail.id} — {provider.businessName}
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '2px' }}>
            Solicitado el {new Date(detail.createdAt).toLocaleString('es-PE')}
          </p>
        </div>
      </div>

      {/* Comparative info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: Datos del solicitante */}
        <div style={{
          background: 'var(--surface-1)', borderRadius: '16px',
          border: '1px solid #3B82F630', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid #3B82F620',
            background: '#3B82F608',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <User size={16} color="#3B82F6" />
            <div>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>Datos del Solicitante</p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Perfil actual de Oficios</p>
            </div>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            {coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImage.url}
                alt={provider.businessName}
                style={{
                  width: '64px', height: '64px', objectFit: 'cover',
                  borderRadius: '12px', border: '1px solid var(--border-default)', flexShrink: 0,
                }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>
                  {provider.user.firstName} {provider.user.lastName}
                </p>
                <span title="Estado de verificación de su perfil de Oficio actual">
                  <StatusBadge
                    label={
                      provider.verificationStatus === 'APROBADO' ? 'Aprobado'
                      : provider.verificationStatus === 'RECHAZADO' ? 'Rechazado'
                      : 'Pendiente'
                    }
                    variant={
                      provider.verificationStatus === 'APROBADO' ? 'success'
                      : provider.verificationStatus === 'RECHAZADO' ? 'danger'
                      : 'warning'
                    }
                  />
                </span>
                {!provider.isVisible && (
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    background: '#EF444418', color: '#EF4444',
                  }}>
                    Oculto
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{provider.businessName}</p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={12} /> {provider.user.email}
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={12} /> {provider.phone}
              </p>
              {provider.description && (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '4px' }}>{provider.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Perfil profesional solicitado */}
        <DataCard
          title="Perfil Profesional Solicitado"
          subtitle="Datos enviados en la solicitud de migración"
          accent="#10B981"
          icon={<GraduationCap size={16} color="#10B981" />}
          rows={[
            { label: 'Especialidad', value: detail.specialty },
            { label: 'Institución', value: detail.institution ?? '—' },
            { label: 'Años de experiencia', value: detail.yearsExperience != null ? String(detail.yearsExperience) : '—' },
            { label: 'Título profesional', value: detail.professionalTitle ?? '—' },
            { label: 'N° de colegiatura', value: detail.registrationNumber ?? '—' },
            { label: 'Entidad emisora', value: detail.registrationIssuer ?? '—' },
          ]}
        />
      </div>

      {/* Categorías: previas vs solicitadas */}
      <div style={{
        background: 'var(--surface-1)', borderRadius: '16px',
        border: '1px solid var(--border-default)', padding: '20px',
      }}>
        <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px', marginBottom: '16px' }}>
          Categorías — antes vs. solicitadas
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
              Actuales (Oficios)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {detail.previousCategories.length === 0 ? (
                <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
              ) : detail.previousCategories.map(cat => (
                <CategoryChip key={cat.id} name={cat.name} isPrimary={cat.isPrimary} />
              ))}
            </div>
          </div>
          <div>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
              Solicitadas (Servicios profesionales)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {detail.requestedCategories.length === 0 ? (
                <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
              ) : detail.requestedCategories.map(cat => (
                <CategoryChip key={cat.id} name={cat.name} isPrimary={cat.isPrimary} accent="#10B981" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Documentos adjuntos */}
      {detail.documents.length > 0 && (
        <div style={{
          background: 'var(--surface-1)', borderRadius: '16px',
          border: '1px solid var(--border-default)', padding: '20px',
        }}>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px', marginBottom: '16px' }}>
            Documentos adjuntos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {detail.documents.map(doc => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '10px',
                background: 'var(--surface-3)', border: '1px solid var(--border-default)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: 'var(--surface-2)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileText size={14} color="var(--text-tertiary)" />
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>{doc.docType}</p>
                    <p style={{
                      fontSize: '11px',
                      color: doc.status === 'PENDIENTE' ? '#F59E0B' : doc.status === 'APROBADO' ? '#10B981' : doc.status === 'RECHAZADO' ? '#EF4444' : 'var(--text-tertiary)',
                    }}>
                      {doc.status}{doc.notes ? ` · ${doc.notes}` : ''}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--brand-light)', fontSize: '12px', fontWeight: 500, textDecoration: 'underline' }}
                >
                  Ver documento
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

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
                placeholder="Describe por qué se rechaza la solicitud (ej: documentos ilegibles, especialidad no coincide con la categoría solicitada...)"
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
                Aprobar migración
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
                <XCircle size={16} /> Rechazar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rejection reason (already reviewed) */}
      {detail.status === 'REJECTED' && detail.rejectionReason && (
        <div style={{
          background: '#EF444410', borderRadius: '14px',
          border: '1px solid #EF444430', padding: '16px',
          display: 'flex', gap: '10px',
        }}>
          <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ color: '#EF4444', fontWeight: 600, fontSize: '13px' }}>Motivo del rechazo</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>{detail.rejectionReason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryChip({ name, isPrimary, accent = '#3B82F6' }: { name: string; isPrimary: boolean; accent?: string }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '5px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500,
      background: isPrimary ? `${accent}18` : 'var(--surface-3)',
      color: isPrimary ? accent : 'var(--text-secondary)',
      border: `1px solid ${isPrimary ? `${accent}40` : 'var(--border-default)'}`,
    }}>
      {isPrimary && <Star size={10} fill={accent} color={accent} />}
      {name}
    </span>
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
            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', minWidth: '150px', flexShrink: 0 }}>
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
