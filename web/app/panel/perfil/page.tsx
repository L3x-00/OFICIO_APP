'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { profileSchema } from '@/lib/validators';
import { useProfileType } from '@/lib/profile-type-context';
import {
  Camera, Upload, Trash2, ChevronDown, ChevronUp, Plus,
  Shield, CheckCircle, XCircle, Clock, Star, Loader2, Save,
  Crown, Package, Check,
} from 'lucide-react';
import YapePaymentModal from '@/components/modals/yape-payment-modal';
import type { Provider } from '@/lib/types';

const SOCIAL_FIELDS = [
  { key: 'website', label: 'Página web', svg: '/images/social/website.svg' },
  { key: 'instagram', label: 'Instagram', svg: '/images/social/instagram.svg' },
  { key: 'tiktok', label: 'TikTok', svg: '/images/social/tiktok.svg' },
  { key: 'facebook', label: 'Facebook', svg: '/images/social/facebook.svg' },
  { key: 'linkedin', label: 'LinkedIn', svg: '/images/social/linkedin.svg' },
  { key: 'twitterX', label: 'Twitter (X)', svg: '/images/social/twitterx.svg' },
  { key: 'telegram', label: 'Telegram', svg: '/images/social/telegram.svg' },
  { key: 'whatsappBiz', label: 'WhatsApp Business', svg: '/images/social/whatsapp.svg' },
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
  return (
    <Suspense fallback={null}>
      <PanelPerfilContent />
    </Suspense>
  );
}

function PanelPerfilContent() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [yapeModal, setYapeModal] = useState<{
    plan: 'ESTANDAR' | 'PREMIUM';
    label: string;
    amount: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const planesRef = useRef<HTMLDivElement>(null);

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
        // Fallback al teléfono de la cuenta (registro) si el proveedor no fijó
        // uno propio — antes el campo salía vacío aunque el usuario tuviera
        // teléfono. Al guardar, se persiste en el proveedor.
        setPhone(prov.phone || prov.user?.phone || '');
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

  // Deep-link desde el banner de "Inicio": /panel/perfil?section=planes
  // hace scroll directo a la sección de planes en vez del tope de la página.
  useEffect(() => {
    if (loading) return;
    if (searchParams.get('section') === 'planes') {
      setShowPlans(true);
      planesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, searchParams]);

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
      const img = await api.uploadImage(file, activeType ?? undefined);
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
      await api.deleteImage(imageId, activeType ?? undefined);
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

  const handleSetCover = async (imageId: number) => {
    try {
      await api.setCoverImage(imageId, activeType ?? undefined);
      setProvider((prev) =>
        prev
          ? {
              ...prev,
              images: prev.images.map((i) => ({ ...i, isCover: i.id === imageId })),
            }
          : prev
      );
      toast.success('Portada actualizada');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar portada');
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

  const currentPlan = provider?.subscription?.plan || 'GRATIS';
  const currentStatus = provider?.subscription?.status || 'ACTIVA';
  // Límite de fotos por plan (espejo del backend PHOTO_LIMITS).
  const photoLimit = currentPlan === 'PREMIUM' ? 10 : currentPlan === 'ESTANDAR' ? 6 : 2;
  const imageCount = provider?.images?.length ?? 0;
  const imageProgress = Math.min((imageCount / photoLimit) * 100, 100);
  // Portada real: la imagen marcada isCover; si ninguna, la primera.
  const coverImageId = provider?.images?.find((i) => i.isCover)?.id ?? provider?.images?.[0]?.id;
  const coverImageUrl = provider?.images?.find((i) => i.isCover)?.url ?? provider?.images?.[0]?.url;
  const plans = [
    {
      name: 'GRATIS' as const,
      label: 'Gratis',
      price: 0,
      icon: Package,
      iconColor: 'text-white/50',
      iconBg: 'bg-white/5',
      benefits: ['2 fotos en la galería', '1 servicio/producto', 'Perfil básico'],
      isCurrent: currentPlan === 'GRATIS',
    },
    {
      name: 'ESTANDAR' as const,
      label: 'Estándar',
      price: 19.9,
      icon: Star,
      iconColor: 'text-accent',
      iconBg: 'bg-accent/10',
      popular: true,
      benefits: [
        '6 fotos en la galería',
        '6 servicios/productos',
        'Estadísticas de visitas',
        'Mayor visibilidad en búsquedas',
      ],
      isCurrent: currentPlan === 'ESTANDAR',
    },
    {
      name: 'PREMIUM' as const,
      label: 'Premium',
      price: 39.9,
      icon: Crown,
      iconColor: 'text-primary-light',
      iconBg: 'bg-primary/10',
      benefits: [
        '10 fotos en la galería',
        'Servicios/productos ilimitados',
        'Estadísticas avanzadas',
        'Máxima visibilidad',
        'Insignia destacada',
      ],
      isCurrent: currentPlan === 'PREMIUM',
    },
  ];
  const currentPlanData = plans.find((p) => p.name === currentPlan);

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

      {/* Plan y suscripción */}
      <div ref={planesRef}>
        <motion.div variants={itemVariants} className="relative glass rounded-xl p-6 overflow-hidden border-primary/20 shadow-glow-md">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className={`w-14 h-14 ${currentPlanData?.iconBg} rounded-2xl flex items-center justify-center ring-1 ring-white/10`}>
              {currentPlanData?.icon && <currentPlanData.icon className={currentPlanData.iconColor} size={26} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-white font-bold text-lg font-display">
                  Plan {currentPlanData?.label || 'Gratis'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    currentStatus === 'ACTIVA'
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : currentStatus === 'VENCIDA'
                      ? 'bg-rose/10 text-rose-400 border border-rose/20'
                      : 'bg-amber/10 text-amber border border-amber/20'
                  }`}
                >
                  {currentStatus}
                </span>
              </div>
              {provider?.subscription?.startDate && (
                <p className="text-white/40 text-xs mt-0.5">
                  Activo desde{' '}
                  {new Date(provider.subscription.startDate).toLocaleDateString('es-PE', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-6">
          <CollapsibleSection
            title="Planes disponibles"
            open={showPlans}
            onToggle={() => setShowPlans(!showPlans)}
          >
            <div className="grid sm:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative border rounded-2xl p-5 transition-all duration-300 ${
                    plan.isCurrent
                      ? 'glass border-primary/30 shadow-glow-sm'
                      : 'glass glass-hover border-white/5'
                  }`}
                >
                  {plan.popular && !plan.isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-glow-sm">
                      Más popular
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${plan.iconBg} rounded-xl flex items-center justify-center`}>
                      <plan.icon className={plan.iconColor} size={20} />
                    </div>
                    {plan.isCurrent && (
                      <span className="flex items-center gap-1 text-primary-light text-[10px] font-bold uppercase tracking-wider bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                        <Check size={11} /> Actual
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-lg font-display">{plan.label}</h3>
                  <p className="text-white font-extrabold text-2xl mt-1 mb-4">
                    {plan.price === 0 ? 'Gratis' : (
                      <>
                        <span className="text-gradient">S/. {plan.price}</span>
                        <span className="text-sm font-normal text-white/40">/mes</span>
                      </>
                    )}
                  </p>
                  <ul className="space-y-2 mb-5">
                    {plan.benefits.map((b) => (
                      <li key={b} className="text-white/50 text-xs flex items-start gap-1.5">
                        <Check size={13} className="text-accent mt-0.5 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  {!plan.isCurrent && plan.name !== 'GRATIS' && (
                    <button
                      onClick={() =>
                        setYapeModal({
                          plan: plan.name as 'ESTANDAR' | 'PREMIUM',
                          label: plan.label,
                          amount: plan.price,
                        })
                      }
                      className="btn btn-primary press-effect w-full py-2 text-sm"
                    >
                      Adquirir
                    </button>
                  )}
                  {plan.isCurrent && (
                    <button
                      disabled
                      className="w-full py-2 text-sm font-semibold bg-white/5 text-white/30 cursor-not-allowed rounded-xl"
                    >
                      Plan actual
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </motion.div>
      </div>

      {/* Avatar y galería */}
      <SectionCard title="Foto de perfil y galería" subtitle={`Sube hasta ${photoLimit} imágenes (JPG, PNG, WebP, máx. 5MB)`}>
        <div className="flex items-center gap-5 mb-6">
          <div className="relative group">
            <div className="w-24 h-24 bg-gradient-primary rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold shadow-glow-md ring-2 ring-primary/30">
              {provider?.businessName?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            {coverImageUrl && (
              <img
                src={coverImageUrl}
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
                <span className="text-white/40">Galería ({imageCount}/{photoLimit})</span>
                <span className={imageCount >= photoLimit - 1 ? 'text-amber font-semibold' : 'text-white/40'}>
                  {imageCount >= photoLimit ? 'Completo' : `${photoLimit - imageCount} restantes`}
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-smooth ${
                    imageCount >= photoLimit ? 'bg-amber' : 'bg-gradient-primary'
                  }`}
                  style={{ width: `${imageProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {provider?.images?.map((img) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden ring-1 ring-white/5 hover:ring-primary/30 transition-all duration-200">
              <img
                src={img.url}
                alt=""
                className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-110"
              />
              {img.id === coverImageId ? (
                <span className="absolute bottom-1 left-1 bg-primary/95 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-lg">
                  <Star size={8} className="fill-white" /> Portada
                </span>
              ) : (
                <button
                  onClick={() => handleSetCover(img.id)}
                  className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm text-white/90 text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/90"
                  aria-label="Marcar como portada"
                >
                  <Star size={8} /> Portada
                </button>
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
          {imageCount < photoLimit && (
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
                    await api.setAvailability(status, activeType ?? undefined);
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

      {yapeModal && (
        <YapePaymentModal
          isOpen={!!yapeModal}
          onClose={() => setYapeModal(null)}
          plan={yapeModal.plan}
          planLabel={yapeModal.label}
          amount={yapeModal.amount}
          providerType={activeType ?? undefined}
        />
      )}
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