'use client';

import { X, Phone, MapPin, Star, ShieldCheck, Eye, EyeOff, Edit,
  Briefcase, Building2, Mail, Calendar, BarChart2, Image as ImageIcon,
  CheckCircle, Clock, XCircle, MessageCircle, CreditCard, Shield, Hash,
  Truck, Package, Crown } from 'lucide-react';
import { Provider, VerificationProvider } from '@/lib/api';

type AnyProvider = Provider | VerificationProvider;

interface Props {
  provider: AnyProvider | null;
  onClose: () => void;
  onEdit?: () => void;
}

const TYPE_MAP: Record<string, { label: string; color: string; icon: any }> = {
  NEGOCIO:      { label: 'Negocio',      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: Building2 },
  BUSINESS:     { label: 'Negocio',      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: Building2 },
  OFICIO:       { label: 'Profesional',  color: 'text-blue-400   bg-blue-500/10   border-blue-500/20',   icon: Briefcase },
  PROFESSIONAL: { label: 'Profesional',  color: 'text-blue-400   bg-blue-500/10   border-blue-500/20',   icon: Briefcase },
};

const VERIF_MAP: Record<string, { label: string; color: string; icon: any }> = {
  APROBADO:  { label: 'Aprobado',  color: 'text-green-400  bg-green-500/10  border-green-500/20',  icon: CheckCircle },
  PENDIENTE: { label: 'Pendiente', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: Clock },
  RECHAZADO: { label: 'Rechazado', color: 'text-red-400    bg-red-500/10    border-red-500/20',    icon: XCircle },
};

const AVAIL_MAP: Record<string, { label: string; dot: string }> = {
  DISPONIBLE: { label: 'Disponible',    dot: 'bg-green-400' },
  OCUPADO:    { label: 'Ocupado',       dot: 'bg-red-400' },
  CON_DEMORA: { label: 'Con demora',    dot: 'bg-orange-400' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
}

function isVerificationProvider(p: AnyProvider): p is VerificationProvider {
  return 'verificationDocs' in p;
}

export function ProviderDetailModal({ provider, onClose, onEdit }: Props) {
  if (!provider) return null;

  const typeInfo = TYPE_MAP[provider.type] ?? { label: provider.type, color: 'text-gray-400 bg-white/5 border-white/10', icon: Briefcase };
  const TypeIcon = typeInfo.icon;
  const verifInfo = VERIF_MAP[provider.verificationStatus] ?? VERIF_MAP['PENDIENTE'];
  const VerifIcon = verifInfo.icon;
  const availability = (provider as any).availability as string | undefined;
  const availInfo = availability ? (AVAIL_MAP[availability] ?? { label: availability, dot: 'bg-gray-500' }) : { label: '—', dot: 'bg-gray-500' };

  const verificationDocs = isVerificationProvider(provider)
    ? provider.verificationDocs
    : ((provider as any).verificationDocs ?? []);
  const images = isVerificationProvider(provider)
    ? provider.images
    : ((provider as any).images ?? []);

  const user = isVerificationProvider(provider)
    ? provider.user
    : (provider as any).user;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#111] border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${typeInfo.color}`}>
              <TypeIcon size={16} />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">{provider.businessName}</h2>
              <p className="text-gray-500 text-xs">{provider.category?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-all border border-blue-500/20"
              >
                <Edit size={13} /> Editar
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Badges de estado */}
          <div className="flex flex-wrap gap-2">
            <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${typeInfo.color}`}>
              <TypeIcon size={12} /> {typeInfo.label}
            </span>
            <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${verifInfo.color}`}>
              <VerifIcon size={12} /> {verifInfo.label}
            </span>
            {provider.verificationStatus === 'APROBADO' && availability && (
              <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-white/10 text-gray-400">
                <span className={`w-2 h-2 rounded-full ${availInfo.dot}`} />
                {availInfo.label}
              </span>
            )}
            {provider.isVerified && (
              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
                <ShieldCheck size={12} /> Verificado
              </span>
            )}
            <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border ${
              (provider as any).isVisible !== false
                ? 'border-green-500/20 bg-green-500/10 text-green-400'
                : 'border-white/10 bg-white/5 text-gray-500'
            }`}>
              {(provider as any).isVisible !== false ? <><Eye size={12}/> Público</> : <><EyeOff size={12}/> Privado</>}
            </span>
          </div>

          {/* Contacto */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Información de contacto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={<Phone size={14} className="text-green-400"/>} label="Teléfono" value={provider.phone} />
              {user?.email && <InfoRow icon={<Mail size={14} className="text-blue-400"/>} label="Correo" value={user.email} />}
              {(provider as any).address && <InfoRow icon={<MapPin size={14} className="text-orange-400"/>} label="Dirección" value={(provider as any).address} className="sm:col-span-2" />}
            </div>
          </section>

          {/* Propietario */}
          {user && (
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Propietario</h3>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-white font-bold text-sm border border-white/10">
                  {user.firstName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{user.firstName} {user.lastName}</p>
                  <p className="text-gray-500 text-xs">{user.email}</p>
                  {user.createdAt && <p className="text-gray-600 text-xs mt-0.5">Registrado el {fmt(user.createdAt)}</p>}
                </div>
              </div>
            </section>
          )}

          {/* Descripción */}
          {provider.description && (
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Descripción</h3>
              <p className="text-gray-300 text-sm leading-relaxed bg-white/[0.02] rounded-xl p-4 border border-white/5">
                {provider.description}
              </p>
            </section>
          )}

          {/* Contacto adicional */}
          {((provider as any).whatsapp) && (
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">WhatsApp</h3>
              <div className="grid grid-cols-1 gap-3">
                <InfoRow icon={<MessageCircle size={14} className="text-green-400"/>} label="WhatsApp" value={(provider as any).whatsapp} />
              </div>
            </section>
          )}

          {/* Datos legales (solo OFICIO) */}
          {provider.type === 'OFICIO' && (provider as any).dni && (
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Datos del profesional</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(provider as any).dni && <InfoRow icon={<Hash size={14} className="text-gray-400"/>} label="DNI" value={(provider as any).dni} />}
              </div>
            </section>
          )}

          {/* Datos legales (solo NEGOCIO) */}
          {provider.type === 'NEGOCIO' && ((provider as any).ruc || (provider as any).nombreComercial) && (
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Datos del negocio</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(provider as any).ruc && <InfoRow icon={<Hash size={14} className="text-gray-400"/>} label="RUC" value={(provider as any).ruc} />}
                {(provider as any).nombreComercial && <InfoRow icon={<Building2 size={14} className="text-purple-400"/>} label="Nombre comercial" value={(provider as any).nombreComercial} />}
                {(provider as any).razonSocial && <InfoRow icon={<Building2 size={14} className="text-purple-400"/>} label="Razón social" value={(provider as any).razonSocial} className="sm:col-span-2" />}
                {(provider as any).hasDelivery !== undefined && (
                  <InfoRow
                    icon={(provider as any).hasDelivery ? <Truck size={14} className="text-cyan-400"/> : <Package size={14} className="text-gray-500"/>}
                    label="Delivery"
                    value={(provider as any).hasDelivery ? 'Sí ofrece' : 'No ofrece'}
                  />
                )}
              </div>
            </section>
          )}

          {/* Suscripción y Trust */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Plan y confianza</h3>
            <div className="grid grid-cols-2 gap-3">
              <MetricBox
                icon={<Crown size={14} className={(provider as any).subscription?.plan === 'PREMIUM' ? 'text-yellow-400' : (provider as any).subscription?.plan === 'ESTANDAR' ? 'text-cyan-400' : 'text-gray-500'}/>}
                label="Plan"
                value={(provider as any).subscription?.plan ?? 'GRATIS'}
                sub={(provider as any).subscription?.status ?? '—'}
              />
              <MetricBox
                icon={<Shield size={14} className={(provider as any).isTrusted ? 'text-green-400' : 'text-gray-500'}/>}
                label="Validación"
                value={(provider as any).isTrusted ? 'Confiable' : ((provider as any).trustStatus ?? 'NONE')}
                sub={(provider as any).isTrusted ? 'Badge activo' : ''}
              />
            </div>
          </section>

          {/* Localidad */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Ubicación</h3>
            <div className="grid grid-cols-2 gap-3">
              <MetricBox
                icon={<Calendar size={14} className="text-purple-400"/>}
                label="Localidad"
                value={provider.locality?.name ?? '—'}
                sub={(provider.locality as any)?.department ?? ''}
              />
              {((provider as any).department || (provider as any).district) && (
                <MetricBox
                  icon={<MapPin size={14} className="text-orange-400"/>}
                  label="Zona registrada"
                  value={(provider as any).district ?? (provider as any).province ?? '—'}
                  sub={(provider as any).department ?? ''}
                />
              )}
            </div>
            {((provider as any).address) && (
              <div className="mt-3">
                <InfoRow icon={<MapPin size={14} className="text-orange-400"/>} label="Dirección" value={(provider as any).address} />
              </div>
            )}
          </section>

          {/* Fecha de registro */}
          {(provider as any).createdAt && (
            <div className="text-xs text-gray-600 text-right">
              Registrado el {fmt((provider as any).createdAt)}
            </div>
          )}

          {/* Métricas de reseñas — solo cuando el proveedor está aprobado */}
          {provider.verificationStatus === 'APROBADO' && (
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Métricas de reseñas</h3>
              <div className="grid grid-cols-1 gap-3">
                <MetricBox
                  icon={<Star size={14} className="text-yellow-400 fill-yellow-400"/>}
                  label="Calificación promedio"
                  value={(provider as any).averageRating?.toFixed?.(1) ?? '—'}
                  sub="sobre 5 estrellas"
                />
              </div>
            </section>
          )}

          {/* Documentos de verificación */}
          {verificationDocs.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Documentos de verificación</h3>
              <div className="space-y-2">
                {verificationDocs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between bg-white/[0.02] rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <ImageIcon size={14} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-white text-xs font-medium">{doc.docType}</p>
                        <p className={`text-xs ${doc.status === 'PENDIENTE' ? 'text-orange-400' : doc.status === 'APROBADO' ? 'text-green-400' : 'text-gray-500'}`}>
                          {doc.status}
                        </p>
                      </div>
                    </div>
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                      >
                        Ver archivo
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Imágenes del perfil */}
          {images.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Imágenes del perfil</h3>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img: any, idx: number) => (
                  <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="relative group">
                    <img
                      src={img.url}
                      alt=""
                      className="w-full aspect-square object-cover rounded-xl border border-white/10 group-hover:border-white/30 transition-all"
                      onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                    />
                    {img.isCover && (
                      <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 bg-black/70 text-yellow-400 rounded-md">
                        Portada
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, className = '' }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-start gap-3 bg-white/[0.02] rounded-xl p-3 border border-white/5 ${className}`}>
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-gray-600 text-[10px] uppercase font-bold tracking-wider">{label}</p>
        <p className="text-white text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function MetricBox({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 text-center">
      <div className="flex justify-center mb-1.5">{icon}</div>
      <p className="text-white font-bold text-lg leading-tight">{value}</p>
      <p className="text-gray-600 text-[10px] uppercase tracking-wider mt-0.5">{label}</p>
      {sub && <p className="text-gray-700 text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}
