'use client';

import { useEffect, useState } from 'react';
import { Star, MapPin, Phone, MessageCircle, Briefcase, AlertTriangle } from 'lucide-react';
import { api, type PublicProvider } from '@/lib/api';

const MAX_VISIBLE = 12;
const FALLBACK_IMG = '/images/portada.jpeg';

export default function ProvidersShowcase() {
  const [providers, setProviders] = useState<PublicProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.getPublicProviders(MAX_VISIBLE);
        if (cancelled) return;
        setProviders(data.slice(0, MAX_VISIBLE));
      } catch {
        if (!cancelled) setError('No pudimos cargar los proveedores en este momento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="relative py-20 sm:py-28 bg-bg-dark overflow-hidden">
      <div className="blob bg-primary/15 w-[420px] h-[420px] -top-20 left-1/3 animate-float-slow" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14" data-reveal>
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 mb-4">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">
              Servicios destacados
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-text-primary leading-tight">
            Algunos de los <span className="text-gradient">más buscados</span>
          </h2>
          <p className="text-text-secondary mt-4 max-w-xl mx-auto text-lg">
            Profesionales y negocios reales, listos para ayudarte hoy mismo.
          </p>
        </div>

        {loading && <SkeletonGrid />}

        {!loading && error && (
          <div className="bg-bg-card border border-white/5 rounded-2xl p-8 text-center max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber/10 flex items-center justify-center">
              <AlertTriangle size={26} className="text-amber" />
            </div>
            <p className="text-text-secondary text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && providers.length === 0 && <EmptyState />}

        {!loading && !error && providers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8 px-2 sm:px-0 py-4">
            {providers.map((p, i) => (
              <ProviderCard key={p.id} provider={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Tarjeta proveedor ────────────────────────────────────── */

function ProviderCard({ provider, index }: { provider: PublicProvider; index: number }) {
  const cover = pickCover(provider);
  const description = truncate(provider.description, 80);
  const tilt = index % 2 === 0 ? '-1.2deg' : '1.2deg';
  const animationDelay = `${(index % 6) * 0.4}s`;
  const phoneShown = provider.whatsapp || provider.phone;
  const isWhats = !!provider.whatsapp;
  const rating = provider.averageRating ?? 0;
  const reviews = provider.totalReviews ?? 0;
  const location = [provider.locality?.department, provider.locality?.province]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="showcase-card group relative bg-bg-card border border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-black/20 transition-all duration-300 ease-smooth"
      style={{
        transform: `rotate(${tilt})`,
        animationDelay,
      }}
      data-reveal
    >
      {/* Cover */}
      <div className="relative aspect-[5/3] bg-bg-input overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={provider.businessName}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 ease-smooth group-hover:scale-110"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
          }}
        />
        {/* gradient overlay para legibilidad del badge */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-card/95 via-bg-card/30 to-transparent pointer-events-none" />

        {/* Badge categoría */}
        {provider.category?.name && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-black/55 backdrop-blur-md border border-white/15 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
            <Briefcase size={11} />
            {provider.category.name}
          </span>
        )}

        {/* Rating overlay (si hay) */}
        {rating > 0 && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/15 text-amber text-xs font-bold px-2.5 py-1 rounded-full shadow-lg tabular-nums">
            <Star size={11} className="fill-amber" />
            {rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Contenido */}
      <div className="p-5">
        <h3 className="text-text-primary font-bold text-base leading-tight truncate">
          {provider.businessName}
        </h3>

        {/* Estrellas + reseñas */}
        <div className="flex items-center gap-1.5 mt-2">
          <StarRow value={rating} />
          <span className="text-text-muted text-xs">
            {reviews > 0 ? `(${reviews} ${reviews === 1 ? 'reseña' : 'reseñas'})` : 'Sin reseñas aún'}
          </span>
        </div>

        {/* Ubicación */}
        {location && (
          <div className="flex items-center gap-1.5 mt-2.5 text-text-muted text-xs">
            <MapPin size={12} className="text-primary/70 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}

        {/* Teléfono / WhatsApp (solo texto, sin acción) */}
        {phoneShown && (
          <div className="flex items-center gap-1.5 mt-1.5 text-text-secondary text-xs">
            {isWhats ? (
              <MessageCircle size={12} className="text-green flex-shrink-0" />
            ) : (
              <Phone size={12} className="text-primary flex-shrink-0" />
            )}
            <span className="truncate">{phoneShown}</span>
          </div>
        )}

        {/* Descripción */}
        {description && (
          <p className="text-text-secondary text-sm leading-relaxed mt-3">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Estrellas (renderiza 5 con fill parcial) ──────────────── */

function StarRow({ value }: { value: number }) {
  const full = Math.floor(value);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < full ? 'text-amber fill-amber' : 'text-amber/25'}
        />
      ))}
    </div>
  );
}

/* ── Skeleton & empty ─────────────────────────────────────── */

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8 px-2 sm:px-0 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-bg-card border border-white/5 rounded-2xl overflow-hidden"
          style={{ transform: `rotate(${i % 2 === 0 ? '-1.2deg' : '1.2deg'})` }}
        >
          <div className="skeleton aspect-[5/3]" />
          <div className="p-5 space-y-2.5">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-3 w-full rounded mt-2" />
            <div className="skeleton h-3 w-5/6 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-bg-card border border-white/5 rounded-2xl p-12 text-center max-w-md mx-auto">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center animate-float-slow">
        <Briefcase size={32} className="text-primary/60" />
      </div>
      <h3 className="text-text-primary font-semibold text-lg mb-2">
        Estamos preparando los mejores profesionales de tu zona
      </h3>
      <p className="text-text-muted text-sm">¡Vuelve pronto!</p>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function pickCover(p: PublicProvider): string {
  const imgs = p.images ?? [];
  const cover = imgs.find((i) => i.isCover) ?? imgs[0];
  return cover?.url || FALLBACK_IMG;
}

function truncate(value: string | undefined, max: number): string {
  if (!value) return '';
  if (value.length <= max) return value;
  return value.slice(0, max).trimEnd() + '…';
}
