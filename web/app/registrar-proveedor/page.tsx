'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Wrench, Store, Loader2, Check, X, MapPin, Image as ImageIcon,
  Briefcase, ShieldCheck, LogIn, Plus, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type RegisterProviderPayload, type FeaturedCategory } from '@/lib/api';
import { isAuthenticated, saveSession } from '@/lib/auth';
import { signInWithGoogleIdToken } from '@/lib/firebase';
import { PERU_DEPARTMENTS, provincesOf, districtsOf } from '@/lib/peru-locations';
import OnboardingPlansModal from '@/components/modals/onboarding-plans-modal';

type ProviderType = 'OFICIO' | 'NEGOCIO';

const SCHEDULE_DAYS: { key: string; label: string }[] = [
  { key: 'lun', label: 'Lunes' },
  { key: 'mar', label: 'Martes' },
  { key: 'mie', label: 'Miércoles' },
  { key: 'jue', label: 'Jueves' },
  { key: 'vie', label: 'Viernes' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

const SOCIAL_FIELDS: { key: keyof RegisterProviderPayload; label: string; placeholder: string }[] = [
  { key: 'website',     label: 'Sitio web',  placeholder: 'https://...' },
  { key: 'instagram',   label: 'Instagram',  placeholder: '@usuario' },
  { key: 'tiktok',      label: 'TikTok',     placeholder: '@usuario' },
  { key: 'facebook',    label: 'Facebook',   placeholder: 'facebook.com/...' },
  { key: 'linkedin',    label: 'LinkedIn',   placeholder: 'linkedin.com/in/...' },
  { key: 'twitterX',    label: 'X (Twitter)', placeholder: '@usuario' },
  { key: 'telegram',    label: 'Telegram',   placeholder: '@usuario' },
  { key: 'whatsappBiz', label: 'WhatsApp Business', placeholder: '+51 9...' },
];

const MAX_CATEGORIES = 6;
const MAX_PHOTOS = 4;

/** Extrae lat,lng de una URL de Google Maps (varios formatos comunes). */
function parseLatLngFromMaps(url: string): { lat: string; lng: string } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return { lat: m[1], lng: m[2] };
  }
  return null;
}

export default function RegisterProviderPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(isAuthenticated());
  }, []);

  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogleIdToken();
      const data = await api.socialLogin(idToken);
      saveSession(data);
      setAuthed(true);
      toast.success('Sesión iniciada. Completa tu perfil de proveedor.');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (!mounted) return null;

  // Gate de sesión: register/provider exige JWT.
  if (!authed) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-5 py-16 bg-dark-surface">
        <div className="w-full max-w-md glass p-8 rounded-2xl border-white/5 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl glass border-primary/20 flex items-center justify-center mb-5">
            <Briefcase className="text-primary" />
          </div>
          <h1 className="font-display font-bold text-white text-2xl">Conviértete en proveedor</h1>
          <p className="text-white/55 text-sm mt-2 leading-relaxed">
            Inicia sesión para registrar tu perfil profesional o de negocio y empezar a recibir clientes.
          </p>
          <div className="flex flex-col gap-2.5 mt-6">
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-white text-[#1f1f1f] font-semibold text-[14px] hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={17} />}
              Continuar con Google
            </button>
            <button onClick={() => router.push('/login')} className="text-white/45 hover:text-white text-[13px] py-1 transition-colors">
              Iniciar sesión con correo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <OnboardingForm onDone={() => router.push('/panel')} />;
}

/* ─── Formulario de onboarding ───────────────────────────────── */

function OnboardingForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<ProviderType | null>(null);

  // Datos básicos
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // OFICIO / NEGOCIO
  const [dni, setDni] = useState('');
  const [hasHomeService, setHasHomeService] = useState(false);
  const [ruc, setRuc] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [hasDelivery, setHasDelivery] = useState(false);
  const [plenaCoordinacion, setPlenaCoordinacion] = useState(false);

  // Ubicación
  const [department, setDepartment] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');

  // Categorías
  const [categories, setCategories] = useState<FeaturedCategory[]>([]);
  const [selected, setSelected] = useState<{ id: number; name: string }[]>([]);
  const [primaryId, setPrimaryId] = useState<number | null>(null);

  // Redes
  const [social, setSocial] = useState<Record<string, string>>({});

  // Horario (NEGOCIO)
  const [schedule, setSchedule] = useState<Record<string, { open: boolean; range: string }>>(
    () => Object.fromEntries(SCHEDULE_DAYS.map((d) => [d.key, { open: false, range: '' }])),
  );

  // Fotos
  const [photos, setPhotos] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPlans, setShowPlans] = useState(false);

  const isOficio = type === 'OFICIO';

  // Carga de categorías según el tipo (mismas que el catálogo móvil).
  const loadCategories = useCallback(async (t: ProviderType) => {
    try {
      const cats = await api.getCategories(t);
      setCategories(cats);
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    if (type) {
      setSelected([]);
      setPrimaryId(null);
      void loadCategories(type);
    }
  }, [type, loadCategories]);

  const toggleCategory = (id: number, name: string) => {
    setSelected((prev) => {
      const exists = prev.some((c) => c.id === id);
      if (exists) {
        const next = prev.filter((c) => c.id !== id);
        if (primaryId === id) setPrimaryId(next[0]?.id ?? null);
        return next;
      }
      if (prev.length >= MAX_CATEGORIES) {
        toast.error(`Máximo ${MAX_CATEGORIES} categorías`);
        return prev;
      }
      const next = [...prev, { id, name }];
      if (primaryId === null) setPrimaryId(id);
      return next;
    });
  };

  const onPickPhotos = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    setPhotos((prev) => {
      const merged = [...prev, ...incoming].slice(0, MAX_PHOTOS);
      if (prev.length + incoming.length > MAX_PHOTOS) {
        toast.error(`Máximo ${MAX_PHOTOS} fotos`);
      }
      return merged;
    });
  };

  const applyMapsUrl = () => {
    const ll = parseLatLngFromMaps(mapsUrl.trim());
    if (!ll) {
      toast.error('No se pudo leer coordenadas de ese enlace');
      return;
    }
    if (!address.trim()) setAddress(`${ll.lat}, ${ll.lng}`);
    toast.success('Ubicación detectada del enlace');
  };

  // Validación espejo del RegisterProviderDto.
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (businessName.trim().length < 2) e.businessName = 'Mínimo 2 caracteres';
    if (businessName.trim().length > 100) e.businessName = 'Máximo 100 caracteres';
    if (description.trim().length < 10) e.description = 'Mínimo 10 caracteres';
    if (description.trim().length > 1000) e.description = 'Máximo 1000 caracteres';
    if (phone.trim().length < 6) e.phone = 'Teléfono inválido';
    if (isOficio && dni.trim() && dni.trim().length > 20) e.dni = 'Máximo 20 caracteres';
    if (!isOficio && ruc.trim() && !/^\d{11}$/.test(ruc.trim())) e.ruc = 'El RUC debe tener 11 dígitos';
    if (selected.length === 0) e.categories = 'Selecciona al menos una categoría';
    if (selected.length > MAX_CATEGORIES) e.categories = `Máximo ${MAX_CATEGORIES} categorías`;
    if (!department) e.department = 'Selecciona tu departamento';
    if (!province) e.province = 'Selecciona tu provincia';
    if (!district) e.district = 'Selecciona tu distrito';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error('Revisa los campos marcados');
      return false;
    }
    return true;
  };

  const buildScheduleJson = (): Record<string, string | null> => {
    const out: Record<string, string | null> = {};
    for (const d of SCHEDULE_DAYS) {
      const s = schedule[d.key];
      out[d.key] = s.open && s.range.trim() ? s.range.trim() : null;
    }
    return out;
  };

  const handleSubmit = async () => {
    if (!type || submitting) return;
    if (!validate()) return;
    setSubmitting(true);

    const payload: RegisterProviderPayload = {
      businessName: businessName.trim(),
      phone: phone.trim(),
      type,
      description: description.trim(),
      whatsapp: whatsapp.trim() || undefined,
      dni: isOficio && dni.trim() ? dni.trim() : undefined,
      hasHomeService: isOficio ? hasHomeService : undefined,
      ruc: !isOficio && ruc.trim() ? ruc.trim() : undefined,
      nombreComercial: !isOficio && nombreComercial.trim() ? nombreComercial.trim() : undefined,
      razonSocial: !isOficio && razonSocial.trim() ? razonSocial.trim() : undefined,
      hasDelivery: !isOficio ? hasDelivery : undefined,
      plenaCoordinacion: !isOficio ? plenaCoordinacion : undefined,
      address: address.trim() || undefined,
      categoryIds: selected.map((c) => c.id),
      primaryCategoryId: primaryId ?? selected[0]?.id,
      department: department || undefined,
      province: province || undefined,
      district: district || undefined,
      scheduleJson: !isOficio ? buildScheduleJson() : undefined,
      website: social.website?.trim() || undefined,
      instagram: social.instagram?.trim() || undefined,
      tiktok: social.tiktok?.trim() || undefined,
      facebook: social.facebook?.trim() || undefined,
      linkedin: social.linkedin?.trim() || undefined,
      twitterX: social.twitterX?.trim() || undefined,
      telegram: social.telegram?.trim() || undefined,
      whatsappBiz: social.whatsappBiz?.trim() || undefined,
    };

    try {
      await api.registerProvider(payload);
      // Fotos: se suben tras crear el perfil (mismo endpoint que el panel).
      if (photos.length > 0) {
        let ok = 0;
        for (const f of photos) {
          try { await api.uploadImage(f); ok++; } catch { /* continúa */ }
        }
        if (ok < photos.length) toast.message(`${ok}/${photos.length} fotos subidas`);
      }
      toast.success('¡Perfil de proveedor creado! Elige tu plan.');
      // Punto 3: al final del registro se muestra el modal de planes/pagos.
      setShowPlans(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el perfil');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-dark-surface px-5 py-12">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display font-bold text-white text-2xl sm:text-3xl">Regístrate como proveedor</h1>
          <p className="text-white/50 text-sm mt-2">Completa tu perfil — los clientes te encontrarán por categoría y ubicación.</p>
        </motion.div>

        {/* Tipo */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <TypeCard active={type === 'OFICIO'} onClick={() => setType('OFICIO')} icon={<Wrench />} title="Profesional" desc="Ofreces un oficio o servicio" />
          <TypeCard active={type === 'NEGOCIO'} onClick={() => setType('NEGOCIO')} icon={<Store />} title="Negocio" desc="Tienes un local o marca" />
        </div>

        {type && (
          <div className="mt-8 space-y-8">
            {/* Datos básicos */}
            <Section title="Datos básicos">
              <Field label={isOficio ? 'Nombre o marca personal' : 'Nombre del negocio'} required error={errors.businessName}>
                <input className={inputCls} value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={100} placeholder={isOficio ? 'Ej. Juan Pérez · Electricista' : 'Ej. Pizzería Don Luigi'} />
              </Field>
              <Field label="Descripción" required error={errors.description}>
                <textarea className={`${inputCls} resize-none`} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder={isOficio ? 'Experiencia, especialidades, horario de trabajo...' : 'Qué ofreces, horarios, especialidades...'} />
                <p className="text-white/30 text-[11px] mt-1">{description.length}/1000</p>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Teléfono" required error={errors.phone}>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="+51 9..." />
                </Field>
                <Field label="WhatsApp">
                  <input className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={30} placeholder="+51 9..." />
                </Field>
              </div>
            </Section>

            {/* Campos por tipo */}
            <Section title={isOficio ? 'Datos del profesional' : 'Datos del negocio'}>
              {isOficio ? (
                <>
                  <Field label="DNI" error={errors.dni}>
                    <input className={inputCls} value={dni} onChange={(e) => setDni(e.target.value)} maxLength={20} placeholder="Documento de identidad" />
                  </Field>
                  <Toggle label="Ofrezco servicio a domicilio" checked={hasHomeService} onChange={setHasHomeService} />
                </>
              ) : (
                <>
                  <Field label="RUC" error={errors.ruc}>
                    <input className={inputCls} value={ruc} onChange={(e) => setRuc(e.target.value)} maxLength={11} inputMode="numeric" placeholder="11 dígitos" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nombre comercial">
                      <input className={inputCls} value={nombreComercial} onChange={(e) => setNombreComercial(e.target.value)} maxLength={100} />
                    </Field>
                    <Field label="Razón social">
                      <input className={inputCls} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} maxLength={150} />
                    </Field>
                  </div>
                  <Toggle label="Delivery disponible" checked={hasDelivery} onChange={setHasDelivery} />
                  <Toggle label="Atención con plena coordinación" checked={plenaCoordinacion} onChange={setPlenaCoordinacion} />
                </>
              )}
            </Section>

            {/* Categorías */}
            <Section title={`Categorías (máx ${MAX_CATEGORIES})`} error={errors.categories}>
              <div className="space-y-4">
                {categories.map((parent) => {
                  const children = parent.children?.length ? parent.children : [parent];
                  return (
                    <div key={parent.id}>
                      <p className="text-white/40 text-[11px] uppercase tracking-wider font-semibold mb-2">{parent.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {children.map((c) => {
                          const isSel = selected.some((s) => s.id === c.id);
                          return (
                            <button key={c.id} type="button" onClick={() => toggleCategory(c.id, c.name)}
                              className={`px-3 py-1.5 rounded-full text-[12.5px] border transition-colors ${isSel ? 'bg-primary/20 border-primary text-primary-light' : 'bg-white/[0.04] border-white/10 text-white/70 hover:border-white/30'}`}>
                              {isSel && <Check size={12} className="inline mr-1" />}{c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {categories.length === 0 && <p className="text-white/40 text-sm">Cargando categorías…</p>}
              </div>

              {selected.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-white/50 text-[12px] mb-2">Especialidad principal</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.map((s) => (
                      <button key={s.id} type="button" onClick={() => setPrimaryId(s.id)}
                        className={`px-3 py-1.5 rounded-full text-[12.5px] border inline-flex items-center gap-1 transition-colors ${primaryId === s.id ? 'bg-amber/20 border-amber text-amber' : 'bg-white/[0.04] border-white/10 text-white/70'}`}>
                        <Star size={12} className={primaryId === s.id ? 'fill-amber' : ''} />{s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* Ubicación */}
            <Section title="Ubicación">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Departamento" required error={errors.department}>
                  <select className={inputCls} value={department} onChange={(e) => { setDepartment(e.target.value); setProvince(''); setDistrict(''); }}>
                    <option value="">Selecciona</option>
                    {PERU_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Provincia" required error={errors.province}>
                  <select className={inputCls} value={province} disabled={!department} onChange={(e) => { setProvince(e.target.value); setDistrict(''); }}>
                    <option value="">Selecciona</option>
                    {provincesOf(department).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Distrito" required error={errors.district}>
                  <select className={inputCls} value={district} disabled={!province} onChange={(e) => setDistrict(e.target.value)}>
                    <option value="">Selecciona</option>
                    {districtsOf(province).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Dirección">
                <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Jr. Lima 123, Ref..." />
              </Field>
              <Field label="Enlace de Google Maps (opcional)">
                <div className="flex gap-2">
                  <input className={inputCls} value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="Pega el enlace de tu ubicación" />
                  <button type="button" onClick={applyMapsUrl} className="px-3 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 hover:text-white shrink-0 inline-flex items-center gap-1.5 text-[13px]">
                    <MapPin size={15} /> Usar
                  </button>
                </div>
              </Field>
            </Section>

            {/* Horarios (NEGOCIO) */}
            {!isOficio && (
              <Section title="Horario de atención">
                <div className="space-y-2">
                  {SCHEDULE_DAYS.map((d) => {
                    const s = schedule[d.key];
                    return (
                      <div key={d.key} className="flex items-center gap-3">
                        <button type="button" onClick={() => setSchedule((p) => ({ ...p, [d.key]: { ...p[d.key], open: !p[d.key].open } }))}
                          className={`w-24 shrink-0 px-2 py-1.5 rounded-lg text-[12px] border transition-colors ${s.open ? 'bg-primary/15 border-primary/40 text-primary-light' : 'bg-white/[0.04] border-white/10 text-white/40'}`}>
                          {d.label}
                        </button>
                        <input className={`${inputCls} ${!s.open ? 'opacity-40' : ''}`} disabled={!s.open} value={s.range}
                          onChange={(e) => setSchedule((p) => ({ ...p, [d.key]: { ...p[d.key], range: e.target.value } }))}
                          placeholder={s.open ? 'Ej. 8:00-18:00' : 'Cerrado'} />
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Redes sociales */}
            <Section title="Redes sociales (opcional)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SOCIAL_FIELDS.map((f) => (
                  <Field key={f.key as string} label={f.label}>
                    <input className={inputCls} value={social[f.key as string] ?? ''} onChange={(e) => setSocial((p) => ({ ...p, [f.key as string]: e.target.value }))} placeholder={f.placeholder} maxLength={255} />
                  </Field>
                ))}
              </div>
            </Section>

            {/* Fotos */}
            <Section title={`Fotos (máx ${MAX_PHOTOS})`}>
              <div className="flex flex-wrap gap-3">
                {photos.map((f, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10">
                    <Image src={URL.createObjectURL(f)} alt="" fill className="object-cover" unoptimized />
                    <button type="button" onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-0.5"><X size={12} /></button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-24 h-24 rounded-xl border border-dashed border-white/20 text-white/40 hover:border-primary/50 hover:text-primary flex flex-col items-center justify-center gap-1">
                    <Plus size={18} /><span className="text-[10px]">Agregar</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { onPickPhotos(e.target.files); e.target.value = ''; }} />
              </div>
              <p className="text-white/30 text-[11px] mt-2 flex items-center gap-1.5"><ImageIcon size={12} /> JPG/PNG, hasta 5 MB cada una.</p>
            </Section>

            {/* Submit */}
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="btn btn-primary btn-lg w-full h-12 disabled:opacity-50">
              {submitting ? <><Loader2 size={17} className="animate-spin" /> Creando perfil…</> : <><ShieldCheck size={17} /> Crear perfil de proveedor</>}
            </button>
            <p className="text-white/30 text-[11px] text-center pb-8">
              Tu perfil pasará por verificación del equipo de Servi antes de ser visible.
            </p>
          </div>
        )}
      </div>

      {showPlans && type && (
        <OnboardingPlansModal
          isOpen
          providerType={type}
          onClose={onDone}
          onComplete={onDone}
        />
      )}
    </div>
  );
}

/* ─── Subcomponentes ─────────────────────────────────────────── */

const inputCls =
  'w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-3 text-white text-[14px] placeholder:text-white/25 focus:outline-none focus:border-primary/50 transition-colors';

function TypeCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`p-4 rounded-2xl border text-left transition-all ${active ? 'bg-primary/15 border-primary shadow-glow-sm' : 'bg-white/[0.03] border-white/10 hover:border-white/30'}`}>
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${active ? 'bg-primary/20 text-primary-light' : 'bg-white/[0.05] text-white/60'}`}>{icon}</span>
      <p className="text-white font-semibold text-[15px]">{title}</p>
      <p className="text-white/45 text-[12px] mt-0.5">{desc}</p>
    </button>
  );
}

function Section({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl border-white/5 p-5">
      <h2 className="text-white font-display font-semibold text-[15px] mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
      {error && <p className="text-rose-400 text-xs mt-3">{error}</p>}
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white/50 text-[12px] font-semibold mb-1.5">
        {label}{required && <span className="text-rose-400"> *</span>}
      </label>
      {children}
      {error && <p className="text-rose-400 text-[11px] mt-1">{error}</p>}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center justify-between w-full py-1">
      <span className="text-white/80 text-[14px]">{label}</span>
      <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${checked ? 'bg-primary' : 'bg-white/15'}`}>
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}
