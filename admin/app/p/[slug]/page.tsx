import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Star, MapPin, ShieldCheck, ExternalLink } from 'lucide-react';

// SSR pleno — sin caché agresivo para que cambios en el perfil se vean
// reflejados al refrescar el preview de WhatsApp/Facebook.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
  coverUrl: string | null;
  categories: Array<{ name: string; slug: string }>;
  locality?: {
    name?: string;
    department?: string;
    province?: string;
    district?: string;
  } | null;
  plan: string;
  contact: {
    phone?: string | null;
    whatsapp?: string | null;
    website?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    facebook?: string | null;
  };
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

// generateMetadata es la API canónica de Next 16 para meta tags dinámicos.
// WhatsApp / Facebook leen og:title, og:description y og:image al pegar
// el link; Google los usa para SEO + rich results.
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const profile  = await fetchProfile(slug);
  if (!profile) {
    return { title: 'Perfil no encontrado — OficioApp' };
  }
  const label = profile.type === 'NEGOCIO' ? 'Negocio' : 'Profesional';
  const title = `${profile.businessName} · ${label} en OficioApp`;
  const description = (profile.description?.slice(0, 160) ?? '')
    || `${profile.businessName} ofrece servicios en OficioApp. Mira reseñas, contacta y descubre más.`;
  const image = profile.coverUrl || `${API_URL}/og/placeholder.png`;
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
      siteName:    'OficioApp',
      images:      [{ url: image, alt: profile.businessName }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [image],
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

  const deepLink = `oficioapp://p/${profile.slug}`;

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
        <Link href="https://oficioapp.org.pe" style={{
          color: '#F97316', textDecoration: 'none', fontWeight: 600, fontSize: 16,
        }}>
          OficioApp
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

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#6B7280' }}>
          ¿Quieres aparecer aquí? <Link href="https://oficioapp.org.pe"
            style={{ color: '#F97316' }}>Regístrate gratis en OficioApp</Link>
        </p>
      </main>
    </div>
  );
}

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
