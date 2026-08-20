'use client';

/**
 * Formulario de onboarding de proveedor — componente COMPARTIDO.
 *
 * Dos variantes con el mismo estado, validación y submit (espejo del móvil):
 *  - `full`   → todas las secciones visibles (página /registrar-proveedor).
 *  - `wizard` → paso a paso, embebible en la landing (providers-section).
 *
 * Flujo invitado (solo wizard): completa los pasos sin sesión y al FINAL
 * se registra con Google → se crea el perfil → se suben las fotos → se
 * aplica el código de referido (si hay) → modal de planes. Igual que móvil.
 *
 * Borrador: los campos de texto se guardan en localStorage para no perder
 * el avance (las fotos viven solo en memoria). Se limpia al crear el perfil.
 */

import {
  useState, useEffect, useCallback, useRef,
  cloneElement, isValidElement, Children, type ReactElement,
} from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Wrench, Store, Briefcase, Loader2, Check, X, MapPin, Image as ImageIcon,
  ShieldCheck, Plus, Star, ChevronLeft, ChevronRight, LogIn, Gift,
  ChevronDown, AlertCircle, Crosshair,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type RegisterProviderPayload, type FeaturedCategory } from '@/lib/api';
import { isAuthenticated, saveSession } from '@/lib/auth';
import { signInWithGoogleIdToken } from '@/lib/firebase';
import { PERU_DEPARTMENTS, provincesOf, districtsOf } from '@/lib/peru-locations';
import { PROFILE_TYPE_META, normalizeProfileType, type ProfileType } from '@/lib/types';
import OnboardingPlansModal from '@/components/modals/onboarding-plans-modal';

type Variant = 'full' | 'wizard';
type FieldState = 'idle' | 'valid' | 'invalid';

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
const DRAFT_KEY = 'servi_onboarding_draft_web';
const REFERRALS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_REFERIDOS === 'true';

/** Extrae lat,lng de una URL de Google Maps (varios formatos comunes). */
function parseLatLngFromMaps(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

/* Pasos del wizard — consolidados para un registro más corto.
   "Detalles" junta Categorías + Ubicación + Extras (redes/fotos) en un solo
   paso con secciones colapsables, para reducir la cantidad de pasos. */
const WIZARD_STEPS = ['Tipo', 'Datos', 'Detalles', 'Confirmar'] as const;

/* Orden de los campos para llevar el foco al PRIMER error tras un submit. */
const ERROR_FIELD_ORDER = [
  'businessName', 'description', 'phone', 'dni', 'ruc',
  'professionalSpecialty', 'professionalInstitution', 'professionalTitle',
  'professionalRegistrationNumber', 'professionalRegistrationIssuer',
  'professionalYearsExperience', 'categories', 'department', 'province', 'district',
] as const;

/** Grupos de error que viven dentro del acordeón "Datos del oficio/…". */
const MORE_DATA_ERROR_KEYS = [
  'dni', 'ruc', 'professionalSpecialty', 'professionalInstitution', 'professionalTitle',
  'professionalRegistrationNumber', 'professionalRegistrationIssuer', 'professionalYearsExperience',
];

export default function ProviderOnboardingForm({
  variant = 'full',
  onDone,
}: {
  variant?: Variant;
  onDone: () => void;
}) {
  const isWizard = variant === 'wizard';
  const [step, setStep] = useState(0);

  const [type, setType] = useState<ProfileType | null>(null);

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

  // PROFESIONAL
  const [professionalSpecialty, setProfessionalSpecialty] = useState('');
  const [professionalInstitution, setProfessionalInstitution] = useState('');
  const [professionalYearsExperience, setProfessionalYearsExperience] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [professionalRegistrationNumber, setProfessionalRegistrationNumber] = useState('');
  const [professionalRegistrationIssuer, setProfessionalRegistrationIssuer] = useState('');

  // Ubicación
  const [department, setDepartment] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

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

  // Referido (mismo flujo que móvil: POST /referrals/apply tras registrar)
  const [referralCode, setReferralCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPlans, setShowPlans] = useState(false);

  // UX: dirección de transición del wizard, acordeón de datos extra, GPS.
  const [dir, setDir] = useState(1);
  const [openMore, setOpenMore] = useState(false);
  const [openExtras, setOpenExtras] = useState(false);
  const [locating, setLocating] = useState(false);
  const reduceMotion = useReducedMotion();

  /** Lleva el foco (y hace scroll suave) al primer campo con error. */
  const focusFirstError = useCallback((e: Record<string, string>) => {
    const firstKey = ERROR_FIELD_ORDER.find((k) => e[k]);
    if (!firstKey) return;
    // Si el error vive en el acordeón de datos extra, ábrelo antes de enfocar.
    if (MORE_DATA_ERROR_KEYS.includes(firstKey)) setOpenMore(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(`ferr-${firstKey}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
      }, 60);
    });
  }, []);

  /** GPS del navegador → coordenadas (aparece en búsquedas por radio). */
  const useMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Tu navegador no permite geolocalización');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        if (!address.trim()) setAddress(`${lat}, ${lng}`);
        setLocating(false);
        toast.success('Ubicación detectada');
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === err.PERMISSION_DENIED
          ? 'Permiso de ubicación denegado'
          : 'No se pudo obtener tu ubicación');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  // En estado (no en render): localStorage no existe en SSR y el texto del
  // botón cambiaría entre server y client (hydration mismatch).
  const [guest, setGuest] = useState(true);
  useEffect(() => setGuest(!isAuthenticated()), []);

  const isOficio = type === 'OFICIO';
  const isProfessional = type === 'PROFESIONAL';
  const isNegocio = type === 'NEGOCIO';

  /* ── Borrador en localStorage ─────────────────────────────── */
  const draftRestored = useRef(false);
  useEffect(() => {
    if (draftRestored.current) return;
    draftRestored.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Record<string, unknown>;
      const restoredType = normalizeProfileType(d.type);
      if (restoredType) setType(restoredType);
      if (typeof d.businessName === 'string') setBusinessName(d.businessName);
      if (typeof d.description === 'string') setDescription(d.description);
      if (typeof d.phone === 'string') setPhone(d.phone);
      if (typeof d.whatsapp === 'string') setWhatsapp(d.whatsapp);
      if (typeof d.dni === 'string') setDni(d.dni);
      if (typeof d.hasHomeService === 'boolean') setHasHomeService(d.hasHomeService);
      if (typeof d.ruc === 'string') setRuc(d.ruc);
      if (typeof d.nombreComercial === 'string') setNombreComercial(d.nombreComercial);
      if (typeof d.razonSocial === 'string') setRazonSocial(d.razonSocial);
      if (typeof d.hasDelivery === 'boolean') setHasDelivery(d.hasDelivery);
      if (typeof d.plenaCoordinacion === 'boolean') setPlenaCoordinacion(d.plenaCoordinacion);
      if (typeof d.professionalSpecialty === 'string') setProfessionalSpecialty(d.professionalSpecialty);
      if (typeof d.professionalInstitution === 'string') setProfessionalInstitution(d.professionalInstitution);
      if (typeof d.professionalYearsExperience === 'string') setProfessionalYearsExperience(d.professionalYearsExperience);
      if (typeof d.professionalTitle === 'string') setProfessionalTitle(d.professionalTitle);
      if (typeof d.professionalRegistrationNumber === 'string') setProfessionalRegistrationNumber(d.professionalRegistrationNumber);
      if (typeof d.professionalRegistrationIssuer === 'string') setProfessionalRegistrationIssuer(d.professionalRegistrationIssuer);
      if (typeof d.department === 'string') setDepartment(d.department);
      if (typeof d.province === 'string') setProvince(d.province);
      if (typeof d.district === 'string') setDistrict(d.district);
      if (typeof d.address === 'string') setAddress(d.address);
      if (typeof d.mapsUrl === 'string') setMapsUrl(d.mapsUrl);
      if (typeof d.referralCode === 'string') setReferralCode(d.referralCode);
      if (d.social && typeof d.social === 'object') setSocial(d.social as Record<string, string>);
      if (Array.isArray(d.selected)) setSelected(d.selected as { id: number; name: string }[]);
      if (typeof d.primaryId === 'number') setPrimaryId(d.primaryId);
      if (d.schedule && typeof d.schedule === 'object') {
        setSchedule((prev) => ({ ...prev, ...(d.schedule as typeof prev) }));
      }
    } catch {
      /* borrador corrupto → ignorar */
    }
  }, []);

  useEffect(() => {
    if (!draftRestored.current) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          type, businessName, description, phone, whatsapp, dni, hasHomeService,
          ruc, nombreComercial, razonSocial, hasDelivery, plenaCoordinacion,
          professionalSpecialty, professionalInstitution, professionalYearsExperience,
          professionalTitle, professionalRegistrationNumber, professionalRegistrationIssuer,
          department, province, district, address, mapsUrl, referralCode,
          social, selected, primaryId, schedule,
        }),
      );
    } catch {
      /* storage lleno/bloqueado → seguir sin borrador */
    }
  }, [type, businessName, description, phone, whatsapp, dni, hasHomeService,
      ruc, nombreComercial, razonSocial, hasDelivery, plenaCoordinacion,
      professionalSpecialty, professionalInstitution, professionalYearsExperience,
      professionalTitle, professionalRegistrationNumber, professionalRegistrationIssuer,
      department, province, district, address, mapsUrl, referralCode,
      social, selected, primaryId, schedule]);

  /* ── Categorías según tipo ────────────────────────────────── */
  const loadCategories = useCallback(async (t: ProfileType) => {
    try {
      const cats = await api.getCategories(t);
      setCategories(cats);
    } catch {
      setCategories([]);
    }
  }, []);

  const prevType = useRef<ProfileType | null>(null);
  useEffect(() => {
    if (!type) return;
    // Solo resetea la selección si el usuario CAMBIÓ de tipo (no al restaurar borrador).
    if (prevType.current && prevType.current !== type) {
      setSelected([]);
      setPrimaryId(null);
    }
    prevType.current = type;
    void loadCategories(type);
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
    setCoords(ll);
    if (!address.trim()) setAddress(`${ll.lat}, ${ll.lng}`);
    toast.success('Ubicación detectada del enlace');
  };

  /* ── Validación (espejo del RegisterProviderDto) ──────────── */
  const validate = (fields?: 'basics' | 'categoriesLocation'): boolean => {
    const e: Record<string, string> = {};
    const wantAll = !fields;
    const wantCats = wantAll || fields === 'categoriesLocation';
    const wantLoc = wantAll || fields === 'categoriesLocation';
    if (wantAll || fields === 'basics') {
      if (businessName.trim().length < 2) e.businessName = 'Mínimo 2 caracteres';
      if (businessName.trim().length > 100) e.businessName = 'Máximo 100 caracteres';
      if (description.trim().length < 10) e.description = 'Mínimo 10 caracteres';
      if (description.trim().length > 1000) e.description = 'Máximo 1000 caracteres';
      if (phone.trim().length < 6) e.phone = 'Teléfono inválido';
      if (isOficio && dni.trim() && dni.trim().length > 20) e.dni = 'Máximo 20 caracteres';
      if (isNegocio && ruc.trim() && !/^\d{11}$/.test(ruc.trim())) e.ruc = 'El RUC debe tener 11 dígitos';
      if (isProfessional) {
        const specialty = professionalSpecialty.trim();
        if (specialty.length < 2 || specialty.length > 120) {
          e.professionalSpecialty = 'Entre 2 y 120 caracteres';
        }
        if (professionalInstitution.trim().length > 160) e.professionalInstitution = 'Máximo 160 caracteres';
        if (professionalTitle.trim().length > 160) e.professionalTitle = 'Máximo 160 caracteres';
        if (professionalRegistrationNumber.trim().length > 100) e.professionalRegistrationNumber = 'Máximo 100 caracteres';
        if (professionalRegistrationIssuer.trim().length > 160) e.professionalRegistrationIssuer = 'Máximo 160 caracteres';
        if (professionalYearsExperience.trim()) {
          const years = Number(professionalYearsExperience);
          if (!Number.isInteger(years) || years < 0 || years > 80) {
            e.professionalYearsExperience = 'Debe ser un entero entre 0 y 80';
          }
        }
      }
    }
    if (wantCats) {
      if (selected.length === 0) e.categories = 'Selecciona al menos una categoría';
      if (selected.length > MAX_CATEGORIES) e.categories = `Máximo ${MAX_CATEGORIES} categorías`;
    }
    if (wantLoc) {
      if (!department) e.department = 'Selecciona tu departamento';
      if (!province) e.province = 'Selecciona tu provincia';
      if (!district) e.district = 'Selecciona tu distrito';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error('Revisa los campos marcados');
      focusFirstError(e);
      return false;
    }
    return true;
  };

  /* ── Validez EN VIVO por campo (check verde mientras escribes) ──── */
  const okLen = (v: string, min: number, max: number) => {
    const t = v.trim();
    return t.length >= min && t.length <= max;
  };
  /** Estado visual de un campo: 'invalid' si ya falló, 'valid' si cumple, 'idle' si vacío. */
  const stateOf = (key: string, ok: boolean): FieldState =>
    errors[key] ? 'invalid' : ok ? 'valid' : 'idle';

  const valid = {
    businessName: okLen(businessName, 2, 100),
    description: okLen(description, 10, 1000),
    phone: phone.trim().length >= 6,
    dni: !dni.trim() || dni.trim().length <= 20,
    ruc: !ruc.trim() || /^\d{11}$/.test(ruc.trim()),
    professionalSpecialty: okLen(professionalSpecialty, 2, 120),
    professionalYearsExperience:
      !professionalYearsExperience.trim() ||
      (Number.isInteger(Number(professionalYearsExperience)) &&
        Number(professionalYearsExperience) >= 0 &&
        Number(professionalYearsExperience) <= 80),
    department: !!department,
    province: !!province,
    district: !!district,
  };

  const buildScheduleJson = (): Record<string, string | null> => {
    const out: Record<string, string | null> = {};
    for (const d of SCHEDULE_DAYS) {
      const s = schedule[d.key];
      out[d.key] = s.open && s.range.trim() ? s.range.trim() : null;
    }
    return out;
  };

  /* ── Submit (con Google al final si es invitado) ──────────── */
  const handleSubmit = async () => {
    if (!type || submitting) return;
    if (!validate()) return;
    setSubmitting(true);

    try {
      // Invitado → primero sesión con Google (mismo socialLogin del móvil).
      if (!isAuthenticated()) {
        const idToken = await signInWithGoogleIdToken();
        const data = await api.socialLogin(idToken);
        saveSession(data);
      }

      const payload: RegisterProviderPayload = {
        businessName: businessName.trim(),
        phone: phone.trim(),
        type,
        description: description.trim(),
        whatsapp: whatsapp.trim() || undefined,
        dni: isOficio && dni.trim() ? dni.trim() : undefined,
        hasHomeService: isOficio ? hasHomeService : undefined,
        professionalSpecialty: isProfessional ? professionalSpecialty.trim() : undefined,
        professionalInstitution: isProfessional && professionalInstitution.trim() ? professionalInstitution.trim() : undefined,
        professionalYearsExperience: isProfessional && professionalYearsExperience.trim() ? Number(professionalYearsExperience) : undefined,
        professionalTitle: isProfessional && professionalTitle.trim() ? professionalTitle.trim() : undefined,
        professionalRegistrationNumber: isProfessional && professionalRegistrationNumber.trim() ? professionalRegistrationNumber.trim() : undefined,
        professionalRegistrationIssuer: isProfessional && professionalRegistrationIssuer.trim() ? professionalRegistrationIssuer.trim() : undefined,
        ruc: isNegocio && ruc.trim() ? ruc.trim() : undefined,
        nombreComercial: isNegocio && nombreComercial.trim() ? nombreComercial.trim() : undefined,
        razonSocial: isNegocio && razonSocial.trim() ? razonSocial.trim() : undefined,
        hasDelivery: isNegocio ? hasDelivery : undefined,
        plenaCoordinacion: isNegocio ? plenaCoordinacion : undefined,
        address: address.trim() || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
        categoryIds: selected.map((c) => c.id),
        primaryCategoryId: primaryId ?? selected[0]?.id,
        department: department || undefined,
        province: province || undefined,
        district: district || undefined,
        scheduleJson: isNegocio ? buildScheduleJson() : undefined,
        website: social.website?.trim() || undefined,
        instagram: social.instagram?.trim() || undefined,
        tiktok: social.tiktok?.trim() || undefined,
        facebook: social.facebook?.trim() || undefined,
        linkedin: social.linkedin?.trim() || undefined,
        twitterX: social.twitterX?.trim() || undefined,
        telegram: social.telegram?.trim() || undefined,
        whatsappBiz: social.whatsappBiz?.trim() || undefined,
      };

      await api.registerProvider(payload);

      // Fotos: se suben tras crear el perfil (mismo endpoint que el panel).
      if (photos.length > 0) {
        let ok = 0;
        for (const f of photos) {
          try { await api.uploadImage(f); ok++; } catch { /* continúa */ }
        }
        if (ok < photos.length) toast.message(`${ok}/${photos.length} fotos subidas`);
      }

      // Código de referido — no bloquea el registro si falla (igual que móvil).
      if (REFERRALS_ENABLED && referralCode.trim()) {
        try {
          await api.applyReferralCode(referralCode.trim().toUpperCase());
          toast.success('Código de referido aplicado');
        } catch {
          toast.message('El código de referido no pudo aplicarse');
        }
      }

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      toast.success('¡Perfil de proveedor creado! Elige tu plan.');
      setShowPlans(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setSubmitting(false);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el perfil');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Navegación del wizard ────────────────────────────────── */
  const stepValid = (s: number): boolean => {
    switch (s) {
      case 0:
        if (!type) { toast.error('Elige un tipo de perfil'); return false; }
        return true;
      case 1: return validate('basics');
      // Paso "Detalles" = categorías + ubicación juntas.
      case 2: return validate('categoriesLocation');
      default: return true;
    }
  };

  const next = () => { if (stepValid(step)) { setDir(1); setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1)); } };
  const back = () => { setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  /* ── Bloques de contenido (compartidos entre variantes) ───── */

  const typeBlock = (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <TypeCard active={type === 'OFICIO'} onClick={() => setType('OFICIO')} icon={<Wrench />} title={PROFILE_TYPE_META.OFICIO.label} desc="Ofreces un oficio o servicio" />
      <TypeCard active={type === 'PROFESIONAL'} onClick={() => setType('PROFESIONAL')} icon={<Briefcase />} title={PROFILE_TYPE_META.PROFESIONAL.label} desc="Abogado, ingeniero, contador y similares" />
      <TypeCard active={type === 'NEGOCIO'} onClick={() => setType('NEGOCIO')} icon={<Store />} title={PROFILE_TYPE_META.NEGOCIO.label} desc="Tienes un local o marca" />
    </div>
  );

  const moreDataTitle = isOficio ? 'Datos del oficio' : isProfessional ? 'Datos profesionales' : 'Datos del negocio';
  const moreDataSubtitle = isProfessional
    ? 'Especialidad, colegiatura y experiencia'
    : isNegocio ? 'RUC, razón social y atención' : 'DNI y servicio a domicilio (opcional)';

  const basicsBlock = (
    <>
      <Section title="Datos básicos">
        <Field label={isNegocio ? 'Nombre del negocio' : 'Nombre o marca personal'} required name="businessName" error={errors.businessName} state={stateOf('businessName', valid.businessName)}>
          <input className={inputCls} value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={100} placeholder={isNegocio ? 'Ej. Pizzería Don Luigi' : isProfessional ? 'Ej. Mónica Ruiz · Abogada' : 'Ej. Juan Pérez · Electricista'} />
        </Field>
        <Field label="Descripción" required name="description" error={errors.description} state={stateOf('description', valid.description)} hint={`${description.length}/1000`}>
          <textarea className={`${inputCls} resize-none`} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder={isNegocio ? 'Qué ofreces, horarios, especialidades...' : isProfessional ? 'Especialidad, formación, años de experiencia...' : 'Experiencia, especialidades, horario de trabajo...'} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Teléfono" required name="phone" error={errors.phone} state={stateOf('phone', valid.phone)}>
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} inputMode="tel" placeholder="+51 9..." />
          </Field>
          <Field label="WhatsApp" state={whatsapp.trim() ? 'valid' : 'idle'}>
            <input className={inputCls} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={30} inputMode="tel" placeholder="+51 9..." />
          </Field>
        </div>
      </Section>

      <CollapsibleSection title={moreDataTitle} subtitle={moreDataSubtitle} open={openMore} onToggle={() => setOpenMore((v) => !v)} reduce={!!reduceMotion}>
        {isOficio && (
          <>
            <Field label="DNI" name="dni" error={errors.dni} state={stateOf('dni', !!dni.trim() && valid.dni)}>
              <input className={inputCls} value={dni} onChange={(e) => setDni(e.target.value)} maxLength={20} inputMode="numeric" placeholder="Documento de identidad" />
            </Field>
            <Toggle label="Ofrezco servicio a domicilio" checked={hasHomeService} onChange={setHasHomeService} />
          </>
        )}
        {isProfessional && (
          <>
            <Field label="Especialidad" required name="professionalSpecialty" error={errors.professionalSpecialty} state={stateOf('professionalSpecialty', valid.professionalSpecialty)}>
              <input className={inputCls} value={professionalSpecialty} onChange={(e) => setProfessionalSpecialty(e.target.value)} maxLength={120} placeholder="Ej. Derecho civil, Ingeniería estructural..." />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Institución / universidad" name="professionalInstitution" error={errors.professionalInstitution} state={stateOf('professionalInstitution', !!professionalInstitution.trim())}>
                <input className={inputCls} value={professionalInstitution} onChange={(e) => setProfessionalInstitution(e.target.value)} maxLength={160} placeholder="Ej. UNCP" />
              </Field>
              <Field label="Años de experiencia" name="professionalYearsExperience" error={errors.professionalYearsExperience} state={stateOf('professionalYearsExperience', !!professionalYearsExperience.trim() && valid.professionalYearsExperience)}>
                <input className={inputCls} type="number" min={0} max={80} value={professionalYearsExperience} onChange={(e) => setProfessionalYearsExperience(e.target.value)} placeholder="Ej. 5" />
              </Field>
            </div>
            <Field label="Título o certificado" name="professionalTitle" error={errors.professionalTitle} state={stateOf('professionalTitle', !!professionalTitle.trim())}>
              <input className={inputCls} value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} maxLength={160} placeholder="Ej. Abogado colegiado" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Número de colegiatura / registro" name="professionalRegistrationNumber" error={errors.professionalRegistrationNumber} state={stateOf('professionalRegistrationNumber', !!professionalRegistrationNumber.trim())}>
                <input className={inputCls} value={professionalRegistrationNumber} onChange={(e) => setProfessionalRegistrationNumber(e.target.value)} maxLength={100} placeholder="Ej. CAL 12345" />
              </Field>
              <Field label="Entidad emisora" name="professionalRegistrationIssuer" error={errors.professionalRegistrationIssuer} state={stateOf('professionalRegistrationIssuer', !!professionalRegistrationIssuer.trim())}>
                <input className={inputCls} value={professionalRegistrationIssuer} onChange={(e) => setProfessionalRegistrationIssuer(e.target.value)} maxLength={160} placeholder="Ej. Colegio de Abogados de Lima" />
              </Field>
            </div>
          </>
        )}
        {isNegocio && (
          <>
            <Field label="RUC" name="ruc" error={errors.ruc} state={stateOf('ruc', !!ruc.trim() && valid.ruc)}>
              <input className={inputCls} value={ruc} onChange={(e) => setRuc(e.target.value)} maxLength={11} inputMode="numeric" placeholder="11 dígitos" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nombre comercial" state={nombreComercial.trim() ? 'valid' : 'idle'}>
                <input className={inputCls} value={nombreComercial} onChange={(e) => setNombreComercial(e.target.value)} maxLength={100} />
              </Field>
              <Field label="Razón social" state={razonSocial.trim() ? 'valid' : 'idle'}>
                <input className={inputCls} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} maxLength={150} />
              </Field>
            </div>
            <Toggle label="Delivery disponible" checked={hasDelivery} onChange={setHasDelivery} />
            <Toggle label="Atención con plena coordinación" checked={plenaCoordinacion} onChange={setPlenaCoordinacion} />
          </>
        )}
      </CollapsibleSection>
    </>
  );

  const categoriesBlock = (
    <Section title={`Categorías (máx ${MAX_CATEGORIES})`} name="categories" error={errors.categories}>
      <div className={`space-y-4 ${isWizard ? 'max-h-72 overflow-y-auto pr-1' : ''}`}>
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
  );

  const locationBlock = (
    <>
      <Section title="Ubicación">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Departamento" required name="department" error={errors.department} state={stateOf('department', valid.department)}>
            <select className={inputCls} value={department} onChange={(e) => { setDepartment(e.target.value); setProvince(''); setDistrict(''); }}>
              <option value="">Selecciona</option>
              {PERU_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Provincia" required name="province" error={errors.province} state={stateOf('province', valid.province)}>
            <select className={inputCls} value={province} disabled={!department} onChange={(e) => { setProvince(e.target.value); setDistrict(''); }}>
              <option value="">Selecciona</option>
              {provincesOf(department).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Distrito" required name="district" error={errors.district} state={stateOf('district', valid.district)}>
            <select className={inputCls} value={district} disabled={!province} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">Selecciona</option>
              {districtsOf(province).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Dirección" state={address.trim() ? 'valid' : 'idle'}>
          <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Jr. Lima 123, Ref..." />
        </Field>

        {/* Ubicación exacta → aparecer en búsquedas por radio.
            Botón GPS primero (lo más fácil); enlace de Maps como alternativa. */}
        <div>
          <label className="block text-white/50 text-[12px] font-semibold mb-1.5">Ubicación exacta (opcional)</label>
          <button type="button" onClick={useMyLocation} disabled={locating}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary/15 border border-primary/30 text-primary-light py-2.5 text-[13px] font-medium hover:bg-primary/25 transition-colors disabled:opacity-60">
            {locating ? <Loader2 size={15} className="animate-spin" /> : <Crosshair size={15} />}
            {locating ? 'Obteniendo tu ubicación…' : 'Usar mi ubicación actual'}
          </button>

          <div className="flex items-center gap-3 my-2.5">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-white/30 text-[11px]">o pega un enlace de Google Maps</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex gap-2">
            <input className={inputCls} value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." />
            <button type="button" onClick={applyMapsUrl} className="px-3 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 hover:text-white shrink-0 inline-flex items-center gap-1.5 text-[13px]">
              <MapPin size={15} /> Usar
            </button>
          </div>
          {coords && (
            <p className="text-emerald-400 text-[11px] mt-2 inline-flex items-center gap-1">
              <Check size={11} /> Coordenadas listas — aparecerás en búsquedas por radio.
            </p>
          )}
        </div>
      </Section>

      {isNegocio && (
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
    </>
  );

  const extrasCount = photos.length + Object.values(social).filter((v) => v?.trim()).length;
  const extrasBlock = (
    <CollapsibleSection
      title="Fotos y redes"
      subtitle="Opcional — súmalas para destacar tu perfil"
      badge={extrasCount > 0 ? `${extrasCount}` : undefined}
      open={openExtras}
      onToggle={() => setOpenExtras((v) => !v)}
      reduce={!!reduceMotion}
    >
      <div>
        <p className="text-white/40 text-[11px] uppercase tracking-wider font-semibold mb-2">Fotos de tus servicios (máx {MAX_PHOTOS})</p>
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
      </div>

      <div className="pt-4 mt-4 border-t border-white/5">
        <p className="text-white/40 text-[11px] uppercase tracking-wider font-semibold mb-3">Redes sociales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOCIAL_FIELDS.map((f) => (
            <Field key={f.key as string} label={f.label} state={social[f.key as string]?.trim() ? 'valid' : 'idle'}>
              <input className={inputCls} value={social[f.key as string] ?? ''} onChange={(e) => setSocial((p) => ({ ...p, [f.key as string]: e.target.value }))} placeholder={f.placeholder} maxLength={255} />
            </Field>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );

  /* Paso "Detalles" — categorías + ubicación + extras juntos (registro más corto). */
  const detailsBlock = (
    <>
      {categoriesBlock}
      {locationBlock}
      {extrasBlock}
    </>
  );

  const referralBlock = REFERRALS_ENABLED ? (
    <Section title="Código de referido (opcional)">
      <Field label="¿Alguien te invitó a Servi?">
        <div className="relative">
          <Gift size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input className={`${inputCls} pl-10 uppercase`} value={referralCode} onChange={(e) => setReferralCode(e.target.value)} maxLength={12} placeholder="Ej. SERVI123" />
        </div>
      </Field>
    </Section>
  ) : null;

  const submitButton = (
    <button type="button" onClick={handleSubmit} disabled={submitting}
      className="btn btn-primary btn-lg w-full h-12 disabled:opacity-50">
      {submitting ? (
        <><Loader2 size={17} className="animate-spin" /> Creando perfil…</>
      ) : guest ? (
        <><LogIn size={17} /> Registrarme con Google y crear perfil</>
      ) : (
        <><ShieldCheck size={17} /> Crear perfil de proveedor</>
      )}
    </button>
  );

  const disclaimer = (
    <p className="text-white/30 text-[11px] text-center">
      Tu perfil pasará por verificación del equipo de Servi antes de ser visible.
    </p>
  );

  /* ── Render ───────────────────────────────────────────────── */

  if (isWizard) {
    return (
      <div className="w-full">
        {/* Progreso */}
        <div className="flex items-center gap-1.5 mb-5" aria-label={`Paso ${step + 1} de ${WIZARD_STEPS.length}`}>
          {WIZARD_STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-white/10'}`} />
              <p className={`text-[10px] mt-1 text-center hidden sm:block ${i === step ? 'text-primary-light font-semibold' : 'text-white/35'}`}>{label}</p>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: reduceMotion ? 0 : d > 0 ? 28 : -28 }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: reduceMotion ? 0 : d > 0 ? -28 : 28 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {step === 0 && (
                <>
                  <p className="text-white/60 text-sm">¿Cómo quieres aparecer en Servi?</p>
                  {typeBlock}
                </>
              )}
              {step === 1 && basicsBlock}
              {step === 2 && detailsBlock}
              {step === 3 && (
                <>
                  <Section title="Resumen">
                    <ul className="text-white/70 text-[13px] space-y-1.5">
                      <li><span className="text-white/40">Tipo:</span> {type ? PROFILE_TYPE_META[type].label : '—'}</li>
                      <li><span className="text-white/40">Nombre:</span> {businessName || '—'}</li>
                      <li><span className="text-white/40">Categorías:</span> {selected.map((s) => s.name).join(', ') || '—'}</li>
                      <li><span className="text-white/40">Ubicación:</span> {[district, province, department].filter(Boolean).join(', ') || '—'}</li>
                      <li><span className="text-white/40">Fotos:</span> {photos.length}</li>
                    </ul>
                  </Section>
                  {referralBlock}
                  {submitButton}
                  {disclaimer}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navegación */}
        {step < WIZARD_STEPS.length - 1 && (
          <div className="flex items-center justify-between mt-6">
            <button type="button" onClick={back} disabled={step === 0}
              className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-[13px] disabled:opacity-30 transition-colors">
              <ChevronLeft size={15} /> Anterior
            </button>
            <button type="button" onClick={next}
              className="btn btn-primary press-effect inline-flex items-center gap-1.5 h-10 px-5 text-[14px]">
              Siguiente <ChevronRight size={15} />
            </button>
          </div>
        )}
        {step === WIZARD_STEPS.length - 1 && (
          <button type="button" onClick={back}
            className="mt-4 inline-flex items-center gap-1.5 text-white/50 hover:text-white text-[13px] transition-colors">
            <ChevronLeft size={15} /> Volver
          </button>
        )}

        {showPlans && type && (
          <OnboardingPlansModal isOpen providerType={type} onClose={onDone} onComplete={onDone} />
        )}
      </div>
    );
  }

  // Variante 'full' — página /registrar-proveedor (mismo layout de siempre).
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-dark-surface px-5 py-12">
      <div className="max-w-2xl mx-auto">
        <div>
          <h1 className="font-display font-bold text-white text-2xl sm:text-3xl">Regístrate como proveedor</h1>
          <p className="text-white/50 text-sm mt-2">Completa tu perfil — los clientes te encontrarán por categoría y ubicación.</p>
        </div>

        <div className="mt-8">{typeBlock}</div>

        {type && (
          <div className="mt-8 space-y-8">
            {basicsBlock}
            {categoriesBlock}
            {locationBlock}
            {extrasBlock}
            {referralBlock}
            {submitButton}
            <div className="pb-8">{disclaimer}</div>
          </div>
        )}
      </div>

      {showPlans && type && (
        <OnboardingPlansModal isOpen providerType={type} onClose={onDone} onComplete={onDone} />
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

function Section({ title, name, error, children }: { title: string; name?: string; error?: string; children: React.ReactNode }) {
  return (
    <div id={name ? `ferr-${name}` : undefined} className="glass rounded-2xl border-white/5 p-5 scroll-mt-24">
      <h2 className="text-white font-display font-semibold text-[15px] mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
      {error && <p className="text-rose-400 text-xs mt-3 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
    </div>
  );
}

/**
 * Sección colapsable animada (acordeón). Cabecera con flecha; el cuerpo se
 * despliega/oculta con transición de altura suave. Respeta reduced-motion.
 */
function CollapsibleSection({
  title, subtitle, badge, open, onToggle, reduce, children,
}: {
  title: string; subtitle?: string; badge?: string;
  open: boolean; onToggle: () => void; reduce: boolean; children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl border-white/5 overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-5 text-left group">
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-white font-display font-semibold text-[15px]">{title}</span>
            {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary-light">{badge}</span>}
          </span>
          {subtitle && <span className="block text-white/40 text-[12px] mt-0.5 truncate">{subtitle}</span>}
        </span>
        <ChevronDown size={18} className={`text-white/50 shrink-0 transition-transform duration-300 group-hover:text-white/80 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label, required, error, state = 'idle', name, hint, children,
}: {
  label: string; required?: boolean; error?: string; state?: FieldState;
  name?: string; hint?: React.ReactNode; children: React.ReactNode;
}) {
  const invalid = state === 'invalid' || !!error;
  const showValid = state === 'valid' && !error;

  // Un único control → le inyectamos borde de estado (verde/rojo) y padding
  // para el icono. Campos con varios hijos se dejan tal cual.
  const only = Children.count(children) === 1 && isValidElement(children)
    ? (children as ReactElement<Record<string, unknown>>)
    : null;
  const tag = only && typeof only.type === 'string' ? only.type : '';
  const isSelect = tag === 'select';
  const isTextarea = tag === 'textarea';
  const showOverlay = !!only && !isSelect && (showValid || invalid);

  const control = only
    ? cloneElement(only, {
        className: [
          (only.props.className as string) ?? '',
          invalid ? 'border-rose-400/70 focus:border-rose-400/70' : '',
          showValid ? 'border-emerald-500/45 focus:border-emerald-500/45' : '',
          showOverlay ? 'pr-9' : '',
        ].filter(Boolean).join(' '),
        ...(invalid ? { 'aria-invalid': true } : {}),
      })
    : children;

  return (
    <div id={name ? `ferr-${name}` : undefined} className="scroll-mt-24">
      <label className="flex items-center gap-1.5 text-white/50 text-[12px] font-semibold mb-1.5">
        <span>{label}{required && <span className="text-rose-400"> *</span>}</span>
        {showValid && <Check size={12} className="text-emerald-400" aria-hidden />}
      </label>
      <div className="relative">
        {control}
        {showOverlay && (
          <span className={`absolute right-3 ${isTextarea ? 'top-3' : 'top-1/2 -translate-y-1/2'} pointer-events-none`}>
            {showValid ? <Check size={15} className="text-emerald-400" /> : <AlertCircle size={15} className="text-rose-400" />}
          </span>
        )}
      </div>
      {error
        ? <p className="text-rose-400 text-[11px] mt-1 flex items-center gap-1" role="alert"><AlertCircle size={11} /> {error}</p>
        : hint ? <p className="text-white/30 text-[11px] mt-1">{hint}</p> : null}
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
