import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star,
  MapPin,
  ShieldCheck,
  ExternalLink,
  Home,
  Clock,
  Smartphone,
  Phone,
  GraduationCap,
  Crown,
  Truck,
  CalendarCheck,
  ThumbsUp,
} from 'lucide-react';
import { SOCIAL_DEFS, SCHEDULE_DAYS, buildSocialUrl } from '@/lib/social-utils';
import { PROFILE_TYPE_META, type ProfileType } from '@/lib/types';
import type { PublicProvider } from '@/lib/api';
import ThemeToggle from '@/components/theme/theme-toggle';
import ProfileActions from '@/components/profile/profile-actions';
import RelatedProviders from '@/components/profile/related-providers';

type RelatedProvider = PublicProvider;

/** Cuántos similares se cargan en total (se reparten entre ambas columnas). */
const RELATED_TOTAL = 10;

// ── Tipos locales (contrato real de /profiles/{slug}) ─────
interface PublicProfile {
  /** Id del provider — lo usan las acciones autenticadas (favorito, chat). */
  id: number;
  slug: string;
  businessName: string;
  description: string | null;
  type: ProfileType;
  // El backend de /profiles/:slug solo devuelve la especialidad — nunca
  // institución, título, colegiatura ni entidad emisora (PII). No ampliar
  // este tipo sin ampliar también el select del backend a propósito.
  professionalProfile?: { specialty: string } | null;
  credentialVerified?: boolean;
  averageRating: number;
  totalReviews: number;
  totalRecommendations: number;
  isVerified: boolean;
  isTrusted: boolean;
  hasHomeService: boolean;
  hasDelivery?: boolean;
  plenaCoordinacion?: boolean;
  coverUrl: string | null;
  images?: Array<{ url: string; isCover?: boolean; order?: number }>;
  categories: Array<{ name: string; slug: string }>;
  locality?: {
    name?: string;
    department?: string;
    province?: string;
    district?: string;
  } | null;
  plan: string;
  schedule?: Record<string, unknown> | null;
  contact: {
    phone?: string | null;
    whatsapp?: string | null;
    website?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    facebook?: string | null;
    linkedin?: string | null;
    telegram?: string | null;
    twitterX?: string | null;
    whatsappBiz?: string | null;
  };
}

interface ServiceItem {
  id?: string;
  name: string;
  description?: string;
  price?: number;
  unit?: string;
  imageUrl?: string;
}

// ── Config ─────────────────────────────────────────────────
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://oficio-backend.onrender.com';

async function fetchProfile(slug: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(`${API_URL}/profiles/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicProfile;
  } catch {
    return null;
  }
}

/**
 * Proveedores de las mismas categorías, para las columnas laterales.
 *
 * Fetch en el servidor (no en cliente): la ficha ya es `force-dynamic`, así
 * evitamos un flash de carga y el listado queda indexable. Se piden las
 * categorías del propio perfil y, si aún hay hueco, se completa con los
 * mejor puntuados para que la página nunca quede coja.
 */
async function fetchRelated(profile: PublicProfile): Promise<RelatedProvider[]> {
  const out: RelatedProvider[] = [];
  const seen = new Set<number>([profile.id]);

  const pull = async (qs: string) => {
    try {
      const res = await fetch(`${API_URL}/providers?${qs}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: RelatedProvider[] } | RelatedProvider[];
      const list = Array.isArray(json) ? json : (json.data ?? []);
      for (const p of list) {
        if (!p?.id || seen.has(p.id) || p.slug === profile.slug) continue;
        seen.add(p.id);
        out.push(p);
      }
    } catch {
      /* la ficha se muestra igual sin columnas laterales */
    }
  };

  for (const c of profile.categories.slice(0, 2)) {
    if (out.length >= RELATED_TOTAL) break;
    await pull(`categorySlug=${encodeURIComponent(c.slug)}&limit=8&page=1&sortBy=rating`);
  }
  if (out.length < RELATED_TOTAL) {
    await pull(`limit=12&page=1&sortBy=rating`);
  }
  return out.slice(0, RELATED_TOTAL);
}

// ── Metadata ───────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchProfile(slug);
  if (!profile) return { title: 'Perfil no encontrado — Servi' };

  const label = PROFILE_TYPE_META[profile.type].label;
  const title = `${profile.businessName} · ${label} en Servi`;
  const description =
    profile.description?.slice(0, 160) ||
    `${profile.businessName} ofrece servicios en Servi. Mira reseñas, contacta y descubre más.`;
  const image = profile.coverUrl ?? undefined;
  const url = `https://oficioapp.org.pe/${profile.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'profile',
      url,
      title,
      description,
      siteName: 'Servi',
      images: image ? [{ url: image, alt: profile.businessName }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

// ── Componente Principal ───────────────────────────────────
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await fetchProfile(slug);
  if (!profile) notFound();

  const related = await fetchRelated(profile);
  const relatedLeft = related.slice(0, Math.ceil(related.length / 2));
  const relatedRight = related.slice(Math.ceil(related.length / 2));

  const typeLabel = PROFILE_TYPE_META[profile.type].label;
  const typeBadgeClass: Record<ProfileType, string> = {
    OFICIO: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
    // Emerald, no indigo: mismo acento que sidebar.tsx/panel/layout.tsx y
    // admin (create-provider-modal, providers-list, categories) para
    // Profesional — antes era el único sitio en indigo.
    PROFESIONAL: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    NEGOCIO: 'bg-primary/10 text-primary dark:text-primary-light',
  };
  const localityText = [
    profile.locality?.district,
    profile.locality?.province,
    profile.locality?.department,
  ]
    .filter(Boolean)
    .join(' · ');

  const deepLink = `oficioapp://p/${profile.slug}`;

  // Servicios / Productos
  const sched = profile.schedule ?? null;
  const services: ServiceItem[] = Array.isArray(
    (sched as { services?: unknown } | null)?.services
  )
    ? ((sched as { services?: ServiceItem[] }).services ?? [])
    : [];

  // Horarios (solo para NEGOCIO)
  const scheduleRows =
    profile.type === 'NEGOCIO'
      ? SCHEDULE_DAYS.map(([k, label]) => ({
          label,
          value: typeof sched?.[k] === 'string' ? (sched[k] as string) : null,
        })).filter((r) => r.value)
      : [];

  // Redes sociales (desde SOCIAL_DEFS en lib/social-utils.ts)
  const socials = SOCIAL_DEFS.map((s) => ({
    ...s,
    value: profile.contact[s.key as keyof typeof profile.contact],
  })).filter((s) => s.value && String(s.value).trim());

  // Galería (excluyendo la cover si ya se muestra)
  const gallery = (profile.images ?? []).filter((i) => i.url && !i.isCover);

  const priceLabel = (s: ServiceItem) => {
    if (s.price == null) return 'Consultar precio';
    const n = s.price % 1 === 0 ? `S/ ${s.price}` : `S/ ${s.price.toFixed(2)}`;
    return s.unit ? `${n} ${s.unit}` : n;
  };

  // ¿El backend publicó algún dato de contacto? Con plan GRATIS los deja
  // todos en null (regla de negocio del propio endpoint público).
  const hasPublicContact = Object.values(profile.contact).some(
    (v) => typeof v === 'string' && v.trim(),
  );

  // WhatsApp Business: no está en SOCIAL_DEFS, se muestra aparte.
  const whatsappBiz = profile.contact.whatsappBiz?.trim() || null;

  return (
    <div className="min-h-screen bg-white dark:bg-dark-premium text-gray-900 dark:text-white transition-colors duration-300">
      {/* ── Header Servi ── */}
      <header className="sticky top-0 z-40 glass border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 group-hover:shadow-glow-sm transition-shadow">
              <Image
                src="/images/logo/servi.png"
                alt="Servi"
                width={20}
                height={20}
                className="object-contain"
                priority
              />
            </div>
            <span className="font-display font-bold text-sm text-gray-900 dark:text-white group-hover:text-primary transition-colors">
              Servi
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* El navbar global no se monta en las vanity URLs (`/:slug`), así
                que el cambio de tema tiene que vivir en este header propio. */}
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <Home size={14} />
              <span className="hidden sm:inline">Ir a Inicio</span>
            </Link>
            <a
              href={deepLink}
              className="btn btn-primary btn-sm press-effect inline-flex items-center gap-1.5 text-xs"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Abrir en App</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── LAYOUT: ficha central + columnas de servicios similares ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_248px] xl:grid-cols-[232px_minmax(0,1fr)_248px]">
        {/* Columna izquierda (solo XL): se retira antes que la derecha al
            angostar, para que la ficha nunca quede espachurrada. */}
        <div className="hidden xl:block">
          <div className="sticky top-20">
            <RelatedProviders providers={relatedLeft} />
          </div>
        </div>

        <div className="min-w-0 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-card shadow-xl dark:shadow-glow-lg transition-colors duration-300">

          {/* ═══ PORTADA ═══ */}
          {profile.coverUrl ? (
            <div className="relative h-40 sm:h-44 overflow-hidden">
              <Image
                src={profile.coverUrl}
                alt={profile.businessName}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-dark-card via-white/20 dark:via-dark-card/20 to-transparent" />
            </div>
          ) : (
            <div className="h-28 sm:h-36 bg-gradient-to-br from-primary to-accent flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/images/logo/servi.png')] bg-center bg-no-repeat opacity-10 bg-[length:120px]" />
              <span className="text-5xl sm:text-6xl font-display font-bold text-white/20 select-none">
                {profile.businessName.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          {/* ═══ CONTENIDO PRINCIPAL ═══ */}
          <div className="px-5 sm:px-6 py-5 space-y-5">
            
            {/* ── Badges ── */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${typeBadgeClass[profile.type]}`}
              >
                {typeLabel}
              </span>

              {profile.type === 'PROFESIONAL' && profile.credentialVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                  <ShieldCheck size={12} /> Credenciales verificadas
                </span>
              )}

              {profile.isVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck size={12} /> Verificado
                </span>
              )}

              {profile.plan === 'PREMIUM' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <Crown size={12} /> Premium
                </span>
              )}

              {profile.isTrusted && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400">
                  <ShieldCheck size={12} /> Confiable
                </span>
              )}
            </div>

            {/* ── Nombre + Rating + Ubicación ── */}
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
                {profile.businessName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <Star size={15} className="text-amber-400 fill-amber-400" />
                  <strong className="text-gray-900 dark:text-white font-semibold">
                    {profile.averageRating.toFixed(1)}
                  </strong>
                  <span>({profile.totalReviews} reseñas)</span>
                </span>
                {localityText && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} className="text-primary" />
                    {localityText}
                  </span>
                )}
                {profile.type === 'PROFESIONAL' && profile.professionalProfile && (
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-primary" />
                    {profile.professionalProfile.specialty}
                  </span>
                )}
              </div>
            </div>

            {/* ── Descripción ── */}
            {profile.description && (
              <p className="text-sm sm:text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed">
                {profile.description}
              </p>
            )}

            {/* ── Categorías ── */}
            {profile.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.categories.map((c) => (
                  <span
                    key={c.slug}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            )}

            {/* ── Atributos del servicio (los declara el proveedor) ── */}
            {(profile.hasHomeService ||
              profile.hasDelivery ||
              profile.plenaCoordinacion ||
              profile.totalRecommendations > 0) && (
              <div className="flex flex-wrap gap-2">
                {profile.hasHomeService && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/70 border border-gray-200 dark:border-white/10">
                    <Home size={13} className="text-primary" /> Atiende a domicilio
                  </span>
                )}
                {profile.hasDelivery && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/70 border border-gray-200 dark:border-white/10">
                    <Truck size={13} className="text-primary" /> Delivery
                  </span>
                )}
                {profile.plenaCoordinacion && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/70 border border-gray-200 dark:border-white/10">
                    <CalendarCheck size={13} className="text-primary" /> Coordina previa cita
                  </span>
                )}
                {profile.totalRecommendations > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary dark:text-primary-light border border-primary/20">
                    <ThumbsUp size={13} /> {profile.totalRecommendations} recomendaciones
                  </span>
                )}
              </div>
            )}

            {/* ── Acciones: llamar (despliega el número), WhatsApp, chat y favorito ── */}
            <ProfileActions
              providerId={profile.id}
              slug={profile.slug}
              businessName={profile.businessName}
              phone={profile.contact.phone ?? null}
              whatsapp={profile.contact.whatsapp ?? null}
            />

            {/* Plan GRATIS: el backend no publica teléfono, WhatsApp ni redes
                (regla anti-burla del plan). Se explica en vez de dejar el
                bloque vacío — el chat interno sigue siendo vía de contacto. */}
            {!hasPublicContact && (
              <p className="text-xs text-gray-500 dark:text-white/45 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5">
                Este proveedor aún no publica sus datos de contacto directo.
                Escríbele por el chat de Servi y te responderá por aquí.
              </p>
            )}

            {/* ── Separador ── */}
            <hr className="border-gray-200 dark:border-white/5" />

            {/* ═══ LAYOUT 2 COLUMNAS: SERVICIOS | GALERÍA ═══ */}
            {(services.length > 0 || gallery.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ── COLUMNA IZQUIERDA: Servicios / Productos ── */}
                {services.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 rounded-full bg-primary" />
                      {profile.type === 'NEGOCIO' ? 'Productos' : 'Servicios'}
                    </h2>
                    <div className="space-y-1.5">
                      {services.map((s, i) => (
                        <div
                          key={s.id ?? i}
                          className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group"
                        >
                          {s.imageUrl ? (
                            <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-white/5 overflow-hidden flex-shrink-0">
                              <Image
                                src={s.imageUrl}
                                alt={s.name}
                                width={28}
                                height={28}
                                className="object-cover w-full h-full"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0 flex items-baseline justify-between gap-3">
                            <span className="text-sm text-gray-800 dark:text-gray-200 truncate group-hover:text-primary dark:group-hover:text-primary-light transition-colors">
                              {s.name}
                            </span>
                            <span className="text-xs font-semibold text-primary dark:text-primary-light whitespace-nowrap tabular-nums">
                              {priceLabel(s)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── COLUMNA DERECHA: Galería ── */}
                {gallery.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 rounded-full bg-accent" />
                      Galería
                    </h2>
                    <div className="grid grid-cols-2 gap-1.5">
                      {gallery.map((img, i) => (
                        <a
                          key={i}
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-200 hover:shadow-md group"
                        >
                          <Image
                            src={img.url}
                            alt={`Galería ${i + 1}`}
                            width={150}
                            height={150}
                            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                            unoptimized
                          />
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* ═══ SECCIÓN: HORARIOS (SOLO NEGOCIO) ═══ */}
            {scheduleRows.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  Horarios de atención
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                  <table className="w-full text-sm">
                    <tbody>
                      {scheduleRows.map((r, idx) => {
                        const closed = r.value!.toLowerCase().includes('cerrado');
                        return (
                          <tr
                            key={r.label}
                            className={`${
                              idx % 2 === 0
                                ? 'bg-gray-50/50 dark:bg-white/[0.02]'
                                : 'bg-transparent'
                            }`}
                          >
                            <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400 font-medium">
                              {r.label}
                            </td>
                            <td
                              className={`py-2.5 px-4 text-right font-semibold ${
                                closed
                                  ? 'text-gray-400 dark:text-gray-500'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {r.value}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ═══ SECCIÓN: REDES SOCIALES ═══ */}
            {(socials.length > 0 || whatsappBiz || profile.contact.phone) && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ExternalLink size={14} className="text-primary" />
                  Redes y contacto
                </h2>
                {/* Cada canal con su etiqueta y el usuario/número visible —
                    antes solo se veía el icono y no se sabía a qué cuenta iba. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {profile.contact.phone && (
                    <a
                      href={`tel:${profile.contact.phone}`}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-primary/40 transition-all group"
                    >
                      <span className="w-7 h-7 shrink-0 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center">
                        <Phone size={14} className="text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] text-gray-500 dark:text-white/45">Teléfono</span>
                        <span className="block text-[13px] font-medium text-gray-800 dark:text-white/85 truncate">
                          {profile.contact.phone}
                        </span>
                      </span>
                    </a>
                  )}
                  {socials.map((s) => (
                    <a
                      key={s.key}
                      href={buildSocialUrl(s.prefix, String(s.value))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-primary/40 hover:shadow-glow-sm transition-all group"
                    >
                      <span className="w-7 h-7 shrink-0 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center">
                        <Image
                          src={`/images/social/${s.icon}`}
                          alt=""
                          width={16}
                          height={16}
                          className="opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] text-gray-500 dark:text-white/45">{s.label}</span>
                        <span className="block text-[13px] font-medium text-gray-800 dark:text-white/85 truncate">
                          {String(s.value).replace(/^https?:\/\//, '')}
                        </span>
                      </span>
                    </a>
                  ))}
                  {whatsappBiz && (
                    <a
                      href={buildSocialUrl('https://wa.me/', whatsappBiz)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-primary/40 transition-all group"
                    >
                      <span className="w-7 h-7 shrink-0 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center">
                        <Image
                          src="/images/social/whatsapp.svg"
                          alt=""
                          width={16}
                          height={16}
                          className="opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] text-gray-500 dark:text-white/45">
                          WhatsApp Business
                        </span>
                        <span className="block text-[13px] font-medium text-gray-800 dark:text-white/85 truncate">
                          {whatsappBiz}
                        </span>
                      </span>
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* ═══ SELLO DE PERTENENCIA SERVI ═══ */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 dark:border-primary/20">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Image
                  src="/images/logo/servi.png"
                  alt="Servi"
                  width={22}
                  height={22}
                  className="object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {profile.isVerified
                    ? 'Proveedor verificado por Servi'
                    : 'Parte de la comunidad Servi'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {profile.isVerified
                    ? 'Este perfil pasó nuestro proceso de validación de identidad y documentos.'
                    : 'Descubre más profesionales y negocios verificados en Servi.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha (desde LG) */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <RelatedProviders
              providers={relatedRight}
              title="También te puede servir"
            />
          </div>
        </div>
        </div>

        {/* En móvil/tablet los similares van debajo de la ficha */}
        <div className="lg:hidden mt-8">
          <RelatedProviders providers={related} />
        </div>

        {/* ── Footer mínimo ── */}
        <div className="text-center mt-8 space-y-3">
          <a
            href={deepLink}
            className="btn btn-primary press-effect inline-flex items-center gap-2 text-sm font-semibold sm:hidden w-full justify-center"
          >
            <Smartphone size={16} />
            Abrir en la App
          </a>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            ¿Quieres aparecer aquí?{' '}
            <Link
              href="https://play.google.com/store/apps/details?id=com.oficioapp.mobile"
              className="text-primary dark:text-primary-light font-semibold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Regístrate gratis en Servi
            </Link>
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-600">
            © {new Date().getFullYear()} Servi · Marketplace de servicios locales
          </p>
        </div>
      </main>
    </div>
  );
}