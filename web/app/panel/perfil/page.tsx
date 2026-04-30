'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { profileSchema } from '@/lib/validators';
import { useProfileType } from '@/lib/profile-type-context';
import {
  Camera,
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Globe,
  Music,
  Send,
  MessageCircle,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Loader2,
  Save,
} from 'lucide-react';
import type { Provider } from '@/lib/types';

const SOCIAL_FIELDS = [
  { key: 'website', label: 'Página web', icon: Globe },
  { key: 'instagram', label: 'Instagram', icon: Camera },
  { key: 'tiktok', label: 'TikTok', icon: Music },
  { key: 'facebook', label: 'Facebook', icon: MessageCircle },
  { key: 'linkedin', label: 'LinkedIn', icon: Globe },
  { key: 'twitterX', label: 'Twitter (X)', icon: Send },
  { key: 'telegram', label: 'Telegram', icon: Send },
  { key: 'whatsappBiz', label: 'WhatsApp Business', icon: MessageCircle },
];

const DAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const DAY_LABELS: Record<string, string> = {
  lun: 'Lunes', mar: 'Martes', mié: 'Miércoles', jue: 'Jueves',
  vie: 'Viernes', sáb: 'Sábado', dom: 'Domingo',
};

const AVAIL_STYLES = {
  DISPONIBLE:  { bg: 'bg-green/15',  text: 'text-green',  border: 'border-green/40',  label: 'Disponible' },
  OCUPADO:     { bg: 'bg-amber/15',  text: 'text-amber',  border: 'border-amber/40',  label: 'Ocupado' },
  CON_DEMORA:  { bg: 'bg-red/15',    text: 'text-red',    border: 'border-red/40',    label: 'Con demora' },
} as const;

export default function PanelPerfilPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [scheduleJson, setScheduleJson] = useState<Record<string, string>>({});
  const [socialFields, setSocialFields] = useState<Record<string, string>>({});
  const [availability, setAvailability] = useState<'DISPONIBLE' | 'OCUPADO' | 'CON_DEMORA'>('DISPONIBLE');
  const { activeType } = useProfileType();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const prov = await api.getMyProfile(activeType ?? undefined);
        if (cancelled) return;
        setProvider(prov);
        setBusinessName(prov.businessName || '');
        setDescription(prov.description || '');
        setPhone(prov.phone || '');
        setWhatsapp(prov.whatsapp || '');
        setAddress(prov.address || '');
        setScheduleJson((prov as unknown as { scheduleJson?: Record<string, string> }).scheduleJson || {});
        setAvailability(prov.availability ?? 'DISPONIBLE');
        const socials: Record<string, string> = {};
        SOCIAL_FIELDS.forEach(({ key }) => {
          const val = (prov as unknown as Record<string, string | undefined>)[key];
          if (val) socials[key] = val;
        });
        setSocialFields(socials);
      } catch {
        if (!cancelled) toast.error('Error al cargar el perfil');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeType]);

  const handleSave = async () => {
    const result = profileSchema.safeParse({
      businessName,
      description,
      phone,
      whatsapp,
      address,
      ...socialFields,
    });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || 'Datos inválidos');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        businessName,
        description,
        phone,
        whatsapp,
        address,
      };
      Object.entries(socialFields).forEach(([k, v]) => {
        if (v) payload[k] = v;
      });
      if (Object.keys(scheduleJson).length > 0) {
        payload.scheduleJson = scheduleJson;
      }
      const updated = await api.updateMyProfile(payload, activeType ?? undefined);
      setProvider(updated);
      toast.success('Perfil actualizado correctamente');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 5 MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Solo se permiten JPG, PNG o WebP');
      return;
    }
    setUploading(true);
    try {
      const img = await api.uploadImage(file);
      setProvider((prev) =>
        prev ? { ...prev, images: [...prev.images, img] } : prev
      );
      toast.success('Imagen subida');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await api.deleteImage(imageId);
      setProvider((prev) =>
        prev
          ? { ...prev, images: prev.images.filter((i) => i.id !== imageId) }
          : prev
      );
      toast.success('Imagen eliminada');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const handleScheduleChange = (day: string, value: string) => {
    setScheduleJson((prev) => ({ ...prev, [day]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-9 w-48 rounded" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-48 rounded-2xl" />
        ))}
      </div>
    );
  }

  const imageCount = provider?.images?.length ?? 0;
  const imageProgress = (imageCount / 5) * 100;

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-4xl">
      <div data-reveal>
        <h1 className="text-3xl font-extrabold text-text-primary">Editar perfil</h1>
        <p className="text-text-secondary text-sm mt-1">
          Actualiza tu información para que los clientes te encuentren mejor.
        </p>
      </div>

      {/* Avatar y galería */}
      <SectionCard title="Foto de perfil y galería" subtitle="Sube hasta 5 imágenes (JPG, PNG, WebP, máx. 5MB)">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative group">
            <div className="w-24 h-24 bg-gradient-primary rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold shadow-glow-md ring-2 ring-primary/30">
              {provider?.businessName?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            {provider?.images?.[0]?.url && (
              <img
                src={provider.images[0].url}
                alt="Avatar"
                className="absolute inset-0 w-24 h-24 rounded-2xl object-cover ring-2 ring-primary/30"
              />
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary hover:bg-primary-dark rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-all duration-200"
              aria-label="Cambiar foto"
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-secondary text-sm font-medium">
              Tu foto principal aparecerá en tu perfil público
            </p>
            <p className="text-text-muted text-xs mt-1">
              Una buena foto aumenta hasta un 60% las visitas a tu perfil.
            </p>
            {/* Progress galería */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-text-muted">Galería ({imageCount}/5)</span>
                <span className={imageCount >= 4 ? 'text-amber font-semibold' : 'text-text-muted'}>
                  {imageCount >= 5 ? 'Completo' : `${5 - imageCount} restantes`}
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-smooth ${
                    imageCount >= 5 ? 'bg-amber' : 'bg-gradient-primary'
                  }`}
                  style={{ width: `${imageProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {provider?.images?.map((img, idx) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden ring-1 ring-white/5 hover:ring-primary/40 transition-all duration-200">
              <img
                src={img.url}
                alt=""
                className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-110"
              />
              {(img.isCover || idx === 0) && (
                <span className="absolute bottom-1 left-1 bg-primary/95 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-lg">
                  <Star size={8} className="fill-white" /> Portada
                </span>
              )}
              <button
                onClick={() => handleDeleteImage(img.id)}
                className="absolute top-1.5 right-1.5 w-7 h-7 bg-red/90 hover:bg-red rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                aria-label="Eliminar imagen"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {imageCount < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center text-text-muted hover:text-primary transition-all duration-200 group disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={22} className="animate-spin text-primary" />
              ) : (
                <>
                  <Plus size={22} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] mt-1 font-medium">Añadir</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageUpload}
        />
      </SectionCard>

      {/* Disponibilidad */}
      <SectionCard title="Disponibilidad" subtitle="Comunica a los clientes tu estado actual">
        <div className="grid grid-cols-3 gap-3">
          {(['DISPONIBLE', 'OCUPADO', 'CON_DEMORA'] as const).map((status) => {
            const style = AVAIL_STYLES[status];
            const isActive = availability === status;
            return (
              <button
                key={status}
                onClick={async () => {
                  try {
                    await api.updateMyProfile({ availability: status }, activeType ?? undefined);
                    setAvailability(status);
                    setProvider((prev) => prev ? { ...prev, availability: status } : prev);
                    toast.success('Disponibilidad actualizada');
                  } catch {
                    toast.error('Error al actualizar disponibilidad');
                  }
                }}
                className={`relative py-3 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                  isActive
                    ? `${style.bg} ${style.text} ${style.border} shadow-glow-sm`
                    : 'bg-bg-input border-white/5 text-text-muted hover:text-text-secondary hover:border-white/15'
                }`}
              >
                {isActive && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current animate-pulse-soft" />
                )}
                {style.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Verificación */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Shield className="text-primary" size={20} />
            Verificación de confianza
          </span>
        }
      >
        {provider?.verificationStatus === 'APROBADO' && (
          <div className="flex items-center gap-3 bg-green/10 border border-green/30 rounded-xl px-4 py-3">
            <CheckCircle size={20} className="text-green flex-shrink-0" />
            <div>
              <p className="text-green text-sm font-semibold">Perfil verificado</p>
              <p className="text-text-muted text-xs">Tu identidad ha sido validada.</p>
            </div>
          </div>
        )}
        {provider?.verificationStatus === 'PENDIENTE' && (
          <div className="flex items-center gap-3 bg-amber/10 border border-amber/30 rounded-xl px-4 py-3">
            <Clock size={20} className="text-amber flex-shrink-0 animate-pulse-soft" />
            <div>
              <p className="text-amber text-sm font-semibold">Verificación en revisión</p>
              <p className="text-text-muted text-xs">Te notificaremos en 24-48 horas.</p>
            </div>
          </div>
        )}
        {provider?.verificationStatus === 'RECHAZADO' && (
          <div className="flex items-start gap-3 bg-red/10 border border-red/30 rounded-xl px-4 py-3">
            <XCircle size={20} className="text-red flex-shrink-0" />
            <div>
              <p className="text-red text-sm font-semibold">Verificación rechazada</p>
              <p className="text-text-muted text-xs mt-0.5">
                Tu solicitud fue rechazada. Contacta al soporte para más información.
              </p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Información básica */}
      <SectionCard title="Información básica">
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField
            label="Nombre del negocio / servicio"
            value={businessName}
            onChange={setBusinessName}
          />
          <InputField label="Teléfono" value={phone} onChange={setPhone} type="tel" />
          <InputField label="WhatsApp" value={whatsapp} onChange={setWhatsapp} type="tel" />
          <InputField label="Dirección" value={address} onChange={setAddress} />
        </div>
        <div className="mt-4">
          <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full bg-bg-input border border-white/8 rounded-xl p-3 text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.12)] transition-all resize-none"
            placeholder="Describe tu servicio o negocio..."
          />
          <div className="flex justify-end mt-1">
            <p className={`text-xs tabular-nums ${description.length > 450 ? 'text-amber' : 'text-text-muted'}`}>
              {description.length}/500
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Redes sociales */}
      <CollapsibleSection
        title="Redes sociales"
        open={showSocial}
        onToggle={() => setShowSocial(!showSocial)}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          {SOCIAL_FIELDS.map(({ key, label, icon: Icon }) => (
            <InputField
              key={key}
              label={label}
              value={socialFields[key] || ''}
              onChange={(v) => setSocialFields((prev) => ({ ...prev, [key]: v }))}
              icon={<Icon size={16} />}
            />
          ))}
        </div>
      </CollapsibleSection>

      {/* Horario */}
      <CollapsibleSection
        title="Horario de atención"
        open={showSchedule}
        onToggle={() => setShowSchedule(!showSchedule)}
      >
        <div className="space-y-2.5">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <span className="text-text-secondary text-sm w-24 font-medium">
                {DAY_LABELS[day]}
              </span>
              <input
                type="text"
                value={scheduleJson[day] || ''}
                onChange={(e) => handleScheduleChange(day, e.target.value)}
                placeholder="Ej: 8:00-18:00"
                className="flex-1 bg-bg-input border border-white/8 rounded-xl px-3 py-2 text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary/60 transition-colors"
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Botón guardar */}
      <div className="sticky bottom-20 md:bottom-4 z-30 bg-bg-dark/0">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary press-effect w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save size={18} />
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-reveal
      className="bg-bg-card border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors"
    >
      <h2 className="text-lg font-semibold text-text-primary mb-1">{title}</h2>
      {subtitle && <p className="text-text-muted text-xs mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left p-6 hover:bg-white/[0.02] transition-colors"
      >
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {open ? (
          <ChevronUp className="text-primary" size={20} />
        ) : (
          <ChevronDown className="text-text-muted" size={20} />
        )}
      </button>
      <div
        className={`grid transition-all duration-300 ease-smooth ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-bg-input border border-white/8 rounded-xl py-2.5 text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.12)] hover:border-white/15 transition-all ${
            icon ? 'pl-10 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  );
}
