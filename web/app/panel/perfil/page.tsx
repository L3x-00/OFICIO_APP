'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { profileSchema } from '@/lib/validators';
import { useProfileType } from '@/lib/profile-type-context';
import {
  Camera, Upload, Trash2, ChevronDown, ChevronUp, Plus,
  Shield, CheckCircle, XCircle, Clock, Star, Loader2, Save,
} from 'lucide-react';
import type { Provider } from '@/lib/types';

const SOCIAL_FIELDS = [
  { key: 'website', label: 'Página web', svg: '/images/social/website.svg' },
  { key: 'instagram', label: 'Instagram', svg: '/images/social/instagram.svg' },
  { key: 'tiktok', label: 'TikTok', svg: '/images/social/tiktok.svg' },
  { key: 'facebook', label: 'Facebook', svg: '/images/social/facebook.svg' },
  { key: 'linkedin', label: 'LinkedIn', svg: '/images/social/linkedin.svg' },
  { key: 'twitterX', label: 'Twitter (X)', svg: '/images/social/X.svg' },
  { key: 'telegram', label: 'Telegram', svg: '/images/social/telegram.svg' },
  { key: 'whatsappBiz', label: 'WhatsApp Business', svg: '/images/social/whatsapp-3.svg' },
];

const DAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const DAY_LABELS: Record<string, string> = {
  lun: 'Lunes', mar: 'Martes', mié: 'Miércoles', jue: 'Jueves',
  vie: 'Viernes', sáb: 'Sábado', dom: 'Domingo',
};

const AVAIL_STYLES = {
  DISPONIBLE:  { bg: 'bg-accent/10',  text: 'text-accent',  border: 'border-accent/20',  label: 'Disponible' },
  OCUPADO:     { bg: 'bg-amber/10',  text: 'text-amber',  border: 'border-amber/20',  label: 'Ocupado' },
  CON_DEMORA:  { bg: 'bg-rose/10',    text: 'text-rose-400',    border: 'border-rose/20',    label: 'Con demora' },
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
  }
};

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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-20 md:pb-0 max-w-4xl"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-extrabold text-white font-display tracking-tightest">Editar perfil</h1>
        <p className="text-white/50 text-sm mt-1">
          Actualiza tu información para que los clientes te encuentren mejor.
        </p>
      </motion.div>

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
            <p className="text-white/60 text-sm font-medium">
              Tu foto principal aparecerá en tu perfil público
            </p>
            <p className="text-white/30 text-xs mt-1">
              Una buena foto aumenta hasta un 60% las visitas a tu perfil.
            </p>
            {/* Progress galería */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-white/40">Galería ({imageCount}/5)</span>
                <span className={imageCount >= 4 ? 'text-amber font-semibold' : 'text-white/40'}>
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
            <div key={img.id} className="relative group rounded-xl overflow-hidden ring-1 ring-white/5 hover:ring-primary/30 transition-all duration-200">
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
                className="absolute top-1.5 right-1.5 w-7 h-7 bg-rose/90 hover:bg-rose rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
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
              className="w-full aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 flex flex-col items-center justify-center text-white/30 hover:text-primary-light transition-all duration-200 group disabled:opacity-50"
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
                    : 'glass border-white/10 text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
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
            <Shield className="text-accent" size={20} />
            Verificación de confianza
          </span>
        }
      >
        {provider?.verificationStatus === 'APROBADO' && (
          <div className="flex items-center gap-3 bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
            <CheckCircle size={20} className="text-accent flex-shrink-0" />
            <div>
              <p className="text-accent text-sm font-semibold">Perfil verificado</p>
              <p className="text-white/40 text-xs">Tu identidad ha sido validada.</p>
            </div>
          </div>
        )}
        {provider?.verificationStatus === 'PENDIENTE' && (
          <div className="flex items-center gap-3 bg-amber/10 border border-amber/20 rounded-xl px-4 py-3">
            <Clock size={20} className="text-amber flex-shrink-0 animate-pulse-soft" />
            <div>
              <p className="text-amber text-sm font-semibold">Verificación en revisión</p>
              <p className="text-white/40 text-xs">Te notificaremos en 24-48 horas.</p>
            </div>
          </div>
        )}
        {provider?.verificationStatus === 'RECHAZADO' && (
          <div className="flex items-start gap-3 bg-rose/10 border border-rose/20 rounded-xl px-4 py-3">
            <XCircle size={20} className="text-rose-400 flex-shrink-0" />
            <div>
              <p className="text-rose-400 text-sm font-semibold">Verificación rechazada</p>
              <p className="text-white/40 text-xs mt-0.5">
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
          <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
            placeholder="Describe tu servicio o negocio..."
          />
          <div className="flex justify-end mt-1">
            <p className={`text-xs tabular-nums ${description.length > 450 ? 'text-amber' : 'text-white/30'}`}>
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
          {SOCIAL_FIELDS.map(({ key, label, svg }) => (
            <InputField
              key={key}
              label={label}
              value={socialFields[key] || ''}
              onChange={(v) => setSocialFields((prev) => ({ ...prev, [key]: v }))}
              icon={svg}
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
              <span className="text-white/50 text-sm w-24 font-medium">
                {DAY_LABELS[day]}
              </span>
              <input
                type="text"
                value={scheduleJson[day] || ''}
                onChange={(e) => handleScheduleChange(day, e.target.value)}
                placeholder="Ej: 8:00-18:00"
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Botón guardar */}
      <div className="sticky bottom-20 md:bottom-4 z-30">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary btn-lg press-effect w-full sm:w-auto px-8 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </motion.div>
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
    <motion.div 
      variants={itemVariants}
      className="glass rounded-xl p-6 hover:border-white/10 transition-colors"
    >
      <h2 className="text-lg font-semibold text-white font-display mb-1">{title}</h2>
      {subtitle && <p className="text-white/30 text-xs mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </motion.div>
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
    <motion.div variants={itemVariants} className="glass rounded-xl overflow-hidden hover:border-white/10 transition-colors">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left p-6 hover:bg-white/[0.02] transition-colors"
      >
        <h2 className="text-lg font-semibold text-white font-display">{title}</h2>
        <ChevronDown
          size={20}
          className={`text-white/30 transition-transform duration-300 ${open ? 'rotate-180 text-primary-light' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
  icon?: string;  // ← ahora es string (ruta del SVG)
}) {
  return (
    <div>
      <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative group">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
              <img
                src={icon}
                alt=""
                className="w-5 h-5 object-contain opacity-70"
              />
            </div>
          )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 hover:border-white/20 transition-all ${
            icon ? 'pl-10 pr-4' : 'px-4'
          }`}
        />
      </div>
    </div>
  );
}