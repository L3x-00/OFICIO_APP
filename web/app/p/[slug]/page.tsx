import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Star, MapPin, ShieldCheck, ExternalLink, Home, Clock, Smartphone } from 'lucide-react';
import Footer from '@/components/footer';

// SSR puro, sin caché — un cambio en el perfil debe verse al refrescar
// el preview de WhatsApp/Facebook.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://oficio-backend.onrender.com';

interface PublicProfile {
  slug: string;
  businessName: string;
  description: string | null;
  type: 'OFICIO' | 'NEGOCIO';
  averageRating: number;
  totalReviews: number;
  totalRecommendations: number;
  isVerified: boolean;
  isTrusted: boolean;
  hasHomeService: boolean;
  hasDelivery?: boolean;
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

// Días de atención en orden, con su etiqueta visible.
const SCHEDULE_DAYS: Array<[string, string]> = [
  ['lun', 'Lunes'],
  ['mar', 'Martes'],
  ['mie', 'Miércoles'],
  ['jue', 'Jueves'],
  ['vie', 'Viernes'],
  ['sab', 'Sábado'],
  ['dom', 'Domingo'],
];

// Redes a renderizar: campo de contacto → svg + prefijo de URL.
const SOCIAL_DEFS: Array<{
  key: keyof PublicProfile['contact'];
  icon: string;
  label: string;
  prefix: string;
}> = [
  { key: 'whatsapp', icon: 'whatsapp.svg', label: 'WhatsApp', prefix: 'https://wa.me/' },
  { key: 'instagram', icon: 'instagram.svg', label: 'Instagram', prefix: 'https://instagram.com/' },
  { key: 'tiktok', icon: 'tiktok.svg', label: 'TikTok', prefix: 'https://tiktok.com/@' },
  { key: 'facebook', icon: 'facebook.svg', label: 'Facebook', prefix: 'https://facebook.com/' },
  { key: 'linkedin', icon: 'linkedin.svg', label: 'LinkedIn', prefix: 'https://linkedin.com/in/' },
  { key: 'telegram', icon: 'telegram.svg', label: 'Telegram', prefix: 'https://t.me/' },
  { key: 'twitterX', icon: 'twitterx.svg', label: 'X', prefix: 'https://x.com/' },
  { key: 'website', icon: 'website.svg', label: 'Sitio web', prefix: 'https://' },
];

function buildSocialUrl(prefix: string, value: string): string {
  const v = value.trim();
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  if (prefix === 'https://wa.me/') return prefix + v.replace(/\D/g, '');
  return prefix + v.replace(/^@/, '');
}

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

// Next 15.5+: params es Promise. Resolverlo con await.
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const profile  = await fetchProfile(slug);
  if (!profile) {
    return { title: 'Perfil no encontrado — Servi' };
  }
  const label = profile.type === 'NEGOCIO' ? 'Negocio' : 'Profesional';
  const title = `${profile.businessName} · ${label} en Servi`;
  const description = (profile.description?.slice(0, 160) ?? '')
    || `${profile.businessName} ofrece servicios en Servi. Mira reseñas, contacta y descubre más.`;
  const image = profile.coverUrl ?? undefined;
  const url   = `https://oficioapp.org.pe/p/${profile.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type:        'profile',
      url,
      title,
      description,
      siteName:    'Servi',
      images:      image ? [{ url: image, alt: profile.businessName }] : undefined,
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      image ? [image] : undefined,
    },
  };
}

export default async function PublicProfilePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const profile  = await fetchProfile(slug);
  if (!profile) notFound();

  const typeLabel = profile.type === 'NEGOCIO' ? 'Negocio' : 'Profesional';
  const localityText = [profile.locality?.district, profile.locality?.province, profile.locality?.department]
    .filter(Boolean)
    .join(' · ');

  // Esquema URI ya registrado en el AndroidManifest (host `p`).
  const deepLink = `oficioapp://p/${profile.slug}`;

  const sched = profile.schedule ?? null;
  const services: ServiceItem[] = Array.isArray(
    (sched as { services?: unknown } | null)?.services,
  )
    ? ((sched as { services?: ServiceItem[] }).services ?? [])
    : [];
  const scheduleRows = SCHEDULE_DAYS.map(([k, label]) => ({
    label,
    value: typeof sched?.[k] === 'string' ? (sched[k] as string) : null,
  })).filter((r) => r.value);
  const socials = SOCIAL_DEFS.map((s) => ({
    ...s,
    value: profile.contact[s.key],
  })).filter((s) => s.value && String(s.value).trim());
  const gallery = (profile.images ?? []).filter((i) => i.url);

  const priceLabel = (s: ServiceItem) => {
    if (s.price == null) return 'Consultar precio';
    const n = s.price % 1 === 0 ? `S/ ${s.price}` : `S/ ${s.price.toFixed(2)}`;
    return s.unit ? `${n} ${s.unit}` : n;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F0F11',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header marca */}
      <header style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #F97316, #EA580C)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700,
        }}>O</div>
        <Link href="/" style={{
          color: '#F97316', textDecoration: 'none', fontWeight: 600, fontSize: 16,
        }}>
          Servi
        </Link>
        {/* Ir a Inicio (FASE 4 #4) */}
        <Link href="/" style={{
          marginLeft: 'auto',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: '#D1D5DB', textDecoration: 'none', fontSize: 13, fontWeight: 600,
          padding: '8px 14px', borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
        }}>
          <Home size={14} /> Ir a Inicio
        </Link>
      </header>

      {/* Hero card */}
      <main style={{
        maxWidth: 720,
        margin: '32px auto',
        padding: '0 16px',
      }}>
        <div style={{
          background: 'linear-gradient(180deg, #1A1A1F 0%, #131318 100%)',
          borderRadius: 24,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
        }}>
          {profile.coverUrl ? (
            <div style={{
              height: 240,
              backgroundImage: `url(${profile.coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />
          ) : (
            <div style={{
              height: 180,
              background: 'linear-gradient(135deg, #F97316, #C2410C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 56, fontWeight: 700, opacity: 0.85,
            }}>
              {profile.businessName.slice(0, 1)}
            </div>
          )}

          <div style={{ padding: '24px 28px 28px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: '4px 10px', borderRadius: 999,
                background: profile.type === 'NEGOCIO'
                  ? 'rgba(249, 115, 22, 0.15)'
                  : 'rgba(59, 130, 246, 0.15)',
                color: profile.type === 'NEGOCIO' ? '#FB923C' : '#60A5FA',
              }}>
                {typeLabel}
              </span>
              {profile.isVerified && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <ShieldCheck size={12} /> Verificado
                </span>
              )}
              {profile.plan === 'PREMIUM' && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(234, 179, 8, 0.18)', color: '#FACC15',
                }}>⭐ Premium</span>
              )}
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>
              {profile.businessName}
            </h1>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              color: '#9CA3AF', fontSize: 13, marginBottom: 16,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Star size={14} color="#FACC15" fill="#FACC15" />
                <strong style={{ color: '#fff' }}>
                  {profile.averageRating.toFixed(1)}
                </strong>
                <span>({profile.totalReviews} reseñas)</span>
              </span>
              {localityText && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={13} /> {localityText}
                </span>
              )}
            </div>

            {profile.description && (
              <p style={{ color: '#D1D5DB', fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
                {profile.description}
              </p>
            )}

            {profile.categories.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
                {profile.categories.map((c) => (
                  <span key={c.slug} style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)', color: '#D1D5DB',
                  }}>
                    {c.name}
                  </span>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {profile.contact.whatsapp && (
                <a
                  href={`https://wa.me/${profile.contact.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={ctaPrimary('#25D366')}
                >
                  WhatsApp
                </a>
              )}
              {profile.contact.phone && (
                <a href={`tel:${profile.contact.phone}`} style={ctaPrimary('#F97316')}>
                  Llamar
                </a>
              )}
              <a href={deepLink} style={ctaSecondary}>
                Abrir en la app
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>

        {/* Redes y contacto */}
        {socials.length > 0 && (
          <section style={sectionCard}>
            <h2 style={sectionTitle}>Redes y contacto</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {socials.map((s) => (
                <a
                  key={s.key as string}
                  href={buildSocialUrl(s.prefix, String(s.value))}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/images/social/${s.icon}`} alt={s.label} width={22} height={22} />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Galería */}
        {gallery.length > 1 && (
          <section style={sectionCard}>
            <h2 style={sectionTitle}>Galería</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 8,
            }}>
              {gallery.map((img, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden',
                    backgroundImage: `url(${img.url})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Servicios / Productos */}
        {services.length > 0 && (
          <section style={sectionCard}>
            <h2 style={sectionTitle}>
              {profile.type === 'NEGOCIO' ? 'Productos' : 'Servicios'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {services.map((s, i) => (
                <div
                  key={s.id ?? i}
                  style={{
                    display: 'flex', gap: 12, alignItems: 'center', padding: 10,
                    borderRadius: 12, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {s.imageUrl && (
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                      backgroundImage: `url(${s.imageUrl})`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{s.name}</p>
                    {s.description && (
                      <p style={{ margin: '2px 0 0', color: '#9CA3AF', fontSize: 12.5 }}>
                        {s.description}
                      </p>
                    )}
                  </div>
                  <span style={{ color: '#FB923C', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {priceLabel(s)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Horarios de atención */}
        {scheduleRows.length > 0 && (
          <section style={sectionCard}>
            <h2 style={{ ...sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} /> Horarios de atención
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scheduleRows.map((r) => {
                const closed = r.value!.toLowerCase().includes('cerrado');
                return (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#D1D5DB' }}>
                    <span>{r.label}</span>
                    <span style={{ color: closed ? '#9CA3AF' : '#fff', fontWeight: 600 }}>{r.value}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Abrir en la App (CTA prominente, útil en móvil) */}
        <a
          href={deepLink}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 16, padding: '13px', borderRadius: 14,
            background: '#F97316', color: '#000', fontWeight: 700, fontSize: 14,
            textDecoration: 'none',
          }}
        >
          <Smartphone size={16} /> Abrir en la App
        </a>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#6B7280' }}>
          ¿Quieres aparecer aquí?{' '}
          <Link href="https://play.google.com/store/apps/details?id=com.oficioapp.mobile" style={{ color: '#F97316' }}>
            Regístrate gratis en Servi
          </Link>
        </p>
      </main>

      {/* Footer profesional reutilizado del sitio */}
      <Footer />
    </div>
  );
}

const sectionCard = {
  background: 'linear-gradient(180deg, #1A1A1F 0%, #131318 100%)',
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '20px 22px',
  marginTop: 16,
} as const;

const sectionTitle = {
  fontSize: 16,
  fontWeight: 700,
  margin: '0 0 14px',
  color: '#fff',
} as const;

function ctaPrimary(color: string) {
  return {
    background: color,
    color: '#000',
    padding: '10px 18px',
    borderRadius: 12,
    fontWeight: 700,
    textDecoration: 'none',
    fontSize: 14,
  } as const;
}

const ctaSecondary = {
  background: 'transparent',
  color: '#F97316',
  border: '1px solid rgba(249, 115, 22, 0.4)',
  padding: '10px 18px',
  borderRadius: 12,
  fontWeight: 600,
  textDecoration: 'none',
  fontSize: 14,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
} as const;
