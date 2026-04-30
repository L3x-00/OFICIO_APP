'use client';

import { useEffect, useState } from 'react';
import {
  Star,
  MapPin,
  Phone,
  MessageCircle,
  Briefcase,
  AlertTriangle,
  Sparkles,
  Layers,
} from 'lucide-react';
import { api, type PublicProvider } from '@/lib/api';

const MAX_VISIBLE = 12;
const STACK_COUNT = 5;
const FALLBACK_IMG = '/images/portada.jpeg';
const STORAGE_KEY = 'oficio_showcase_expanded';

/**
 * Pre-baked transforms para las 5 cartas del montón.
 * Index 0 = carta superior (casi recta). Index 4 = carta del fondo (más inclinada).
 * Se aplican en orden inverso al renderizar para que la carta 0 quede arriba.
 */
const STACK_LAYOUT: { rotate: number; x: number; y: number }[] = [
  { rotate: 1.2,  x:  4,   y: 0 },   // top
  { rotate: -3,   x: -16,  y: 6 },
  { rotate: 5,    x:  18,  y: 12 },
  { rotate: -7,   x: -28,  y: 18 },
  { rotate: 8,    x:  30,  y: 22 },  // bottom
];

export default function ProvidersShowcase() {
  const [providers, setProviders] = useState<PublicProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Restaura preferencia del usuario
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY) === '1') setExpanded(true);
  }, []);

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

  const handleExpand = () => {
    setExpanded(true);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '1');
  };

  const handleCollapse = () => {
    setExpanded(false);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '0');
  };

  const showStack = !loading && !error && providers.length > 0 && !expanded;
  const showGrid  = !loading && !error && providers.length > 0 && expanded;

  return (
    <section className="relative py-20 sm:py-28 bg-bg-dark overflow-hidden">
      <div className="blob bg-primary/15 w-[420px] h-[420px] -top-20 left-1/3 animate-float-slow" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14" data-reveal>
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

        {/* Vista collage: montón de polaroids */}
        {showStack && (
          <CollageStack
            providers={providers.slice(0, STACK_COUNT)}
            onExpand={handleExpand}
          />
        )}

        {/* Vista cuadrícula desplegada */}
        {showGrid && (
          <ExpandedGrid providers={providers} onCollapse={handleCollapse} />
        )}
      </div>
    </section>
  );
}

/* ── Vista 1: Montón de polaroids ──────────────────────────── */

function CollageStack({
  providers,
  onExpand,
}: {
  providers: PublicProvider[];
  onExpand: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-10 sm:gap-12 animate-fade-in">
      {/* Contenedor del montón. Altura fija para que las cards absolute floten centradas */}
      <div
        className="relative w-full max-w-[300px] sm:max-w-[340px] h-[380px] sm:h-[440px]"
        aria-hidden="true"
      >
        {/* Renderizamos del fondo hacia arriba para z-index correcto */}
        {[...providers].reverse().map((p, idxFromBottom) => {
          // El último iterado (idxFromBottom = providers.length-1) corresponde al top
          const realIndex = providers.length - 1 - idxFromBottom;
          const layout = STACK_LAYOUT[realIndex] ?? STACK_LAYOUT[0];
          return (
            <div
              key={p.id}
              className="stack-card absolute left-1/2 top-1/2 w-[260px] sm:w-[300px] -translate-x-1/2 -translate-y-1/2"
              style={{
                transform: `translate(calc(-50% + ${layout.x}px), calc(-50% + ${layout.y}px)) rotate(${layout.rotate}deg)`,
                zIndex: providers.length - realIndex,
                animationDelay: `${realIndex * 0.12}s`,
              }}
            >
              <ProviderCard provider={p} variant="stack" />
            </div>
          );
        })}
      </div>

      {/* Botón llamativo */}
      <button
        type="button"
        onClick={onExpand}
        aria-label="Desplegar tarjetas y descubrir todos los profesionales"
        className="btn-primary press-effect group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-sm sm:text-base shadow-glow-md hover:shadow-glow-lg"
      >
        <Sparkles
          size={18}
          className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
        />
        Descubrir profesionales
      </button>

      <p className="text-text-muted text-xs -mt-6">
        {providers.length} de {MAX_VISIBLE} disponibles
      </p>
    </div>
  );
}

/* ── Vista 2: Cuadrícula desplegada ────────────────────────── */

function ExpandedGrid({
  providers,
  onCollapse,
}: {
  providers: PublicProvider[];
  onCollapse: () => void;
}) {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8 px-2 sm:px-0 py-4">
        {providers.map((p, i) => (
          <div
            key={p.id}
            className="grid-card-enter"
            style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
          >
            <ProviderCard provider={p} variant="grid" index={i} />
          </div>
        ))}
      </div>

      {/* Toggle discreto para volver a vista collage */}
      <div className="flex justify-center mt-10">
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Volver a la vista de collage apilado"
          className="inline-flex items-center gap-2 text-text-muted hover:text-primary text-xs font-semibold transition-colors group"
        >
          <Layers
            size={13}
            className="transition-transform duration-200 group-hover:-translate-y-0.5"
          />
          Vista collage
        </button>
      </div>
    </div>
  );
}

/* ── Tarjeta proveedor (variante stack | grid) ─────────────── */

function ProviderCard({
  provider,
  variant,
  index = 0,
}: {
  provider: PublicProvider;
  variant: 'stack' | 'grid';
  index?: number;
}) {
  const cover = pickCover(provider);
  const description = truncate(provider.description, 80);
  const phoneShown = provider.whatsapp || provider.phone;
  const isWhats = !!provider.whatsapp;
  const rating = provider.averageRating ?? 0;
  const reviews = provider.totalReviews ?? 0;
  const location = [provider.locality?.department, provider.locality?.province]
    .filter(Boolean)
    .join(' · ');

  if (variant === 'stack') {
    // Variante decorativa: sin hover, sin float, no clickable
    return (
      <article
        className="bg-bg-card border border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/5 select-none pointer-events-none"
        aria-hidden="true"
      >
        <CoverImage src={cover} alt={provider.businessName} category={provider.category?.name} rating={rating} />
        <CardBody
          businessName={provider.businessName}
          rating={rating}
          reviews={reviews}
          location={location}
          phoneShown={phoneShown}
          isWhats={isWhats}
          description={description}
        />
      </article>
    );
  }

  // Grid variant: hover + float + tilt alterno
  const tilt = index % 2 === 0 ? '-1.2deg' : '1.2deg';
  const animationDelay = `${(index % 6) * 0.4}s`;
  return (
    <article
      className="showcase-card group relative bg-bg-card border border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-black/20 transition-all duration-300 ease-smooth"
      style={{ transform: `rotate(${tilt})`, animationDelay }}
    >
      <CoverImage
        src={cover}
        alt={provider.businessName}
        category={provider.category?.name}
        rating={rating}
        interactive
      />
      <CardBody
        businessName={provider.businessName}
        rating={rating}
        reviews={reviews}
        location={location}
        phoneShown={phoneShown}
        isWhats={isWhats}
        description={description}
      />
    </article>
  );
}

function CoverImage({
  src,
  alt,
  category,
  rating,
  interactive,
}: {
  src: string;
  alt: string;
  category?: string;
  rating: number;
  interactive?: boolean;
}) {
  return (
    <div className="relative aspect-[5/3] bg-bg-input overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover transition-transform duration-500 ease-smooth ${
          interactive ? 'group-hover:scale-110' : ''
        }`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg-card/95 via-bg-card/30 to-transparent pointer-events-none" />

      {category && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-black/55 backdrop-blur-md border border-white/15 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
          <Briefcase size={11} />
          {category}
        </span>
      )}

      {rating > 0 && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/15 text-amber text-xs font-bold px-2.5 py-1 rounded-full shadow-lg tabular-nums">
          <Star size={11} className="fill-amber" />
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function CardBody({
  businessName,
  rating,
  reviews,
  location,
  phoneShown,
  isWhats,
  description,
}: {
  businessName: string;
  rating: number;
  reviews: number;
  location: string;
  phoneShown?: string;
  isWhats: boolean;
  description: string;
}) {
  return (
    <div className="p-5">
      <h3 className="text-text-primary font-bold text-base leading-tight truncate">
        {businessName}
      </h3>

      <div className="flex items-center gap-1.5 mt-2">
        <StarRow value={rating} />
        <span className="text-text-muted text-xs">
          {reviews > 0
            ? `(${reviews} ${reviews === 1 ? 'reseña' : 'reseñas'})`
            : 'Sin reseñas aún'}
        </span>
      </div>

      {location && (
        <div className="flex items-center gap-1.5 mt-2.5 text-text-muted text-xs">
          <MapPin size={12} className="text-primary/70 flex-shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      )}

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

      {description && (
        <p className="text-text-secondary text-sm leading-relaxed mt-3">
          {description}
        </p>
      )}
    </div>
  );
}

/* ── Estrellas ─────────────────────────────────────────────── */

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
