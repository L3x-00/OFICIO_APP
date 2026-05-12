'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  MapPin,
  Phone,
  MessageCircle,
  Briefcase,
  AlertTriangle,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { api, type PublicProvider } from '@/lib/api';

const MAX_VISIBLE = 12;
const STACK_COUNT = 5;
const FALLBACK_IMG = '/images/portada.jpeg';
const STORAGE_KEY = 'oficio_showcase_expanded';

// Layout del collage - desplazamientos relativos para crear el efecto de pila
const STACK_LAYOUT: { rotate: number; x: number; y: number; zIndex: number }[] = [
  { rotate: 2,   x: -12,  y: -8,  zIndex: 1 },
  { rotate: -2.5, x: 14,   y: -4,  zIndex: 2 },
  { rotate: 3.5,  x: -8,   y: 2,   zIndex: 3 },
  { rotate: -3,   x: 10,   y: 6,   zIndex: 4 },
  { rotate: 4,    x: 0,    y: 12,  zIndex: 5 },
];

// Variantes para la cascada del Grid
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { y: 30, opacity: 0, scale: 0.95 },
  visible: { 
    y: 0, 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } 
  }
};

export default function ProvidersShowcase() {
  const [providers, setProviders] = useState<PublicProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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
    <section className="relative py-24 sm:py-32 bg-dark-premium overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">

        <motion.div 
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <div className="max-w-xl">
            <span className="eyebrow">Servicios destacados</span>
            <h2 className="mt-3 font-display font-bold tracking-tightest text-white text-[34px] sm:text-[44px] leading-[1.1]">
              Algunos de los más <span className="text-gradient">buscados</span>.
            </h2>
            <p className="mt-4 text-white/60 text-[16px] leading-relaxed">
              Profesionales y negocios reales, listos para ayudarte hoy mismo.
            </p>
          </div>
        </motion.div>

        {loading && <SkeletonGrid />}

        {!loading && error && (
          <div className="glass p-8 text-center max-w-md mx-auto border-rose/20">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-rose/10 border border-rose/20 flex items-center justify-center">
              <AlertTriangle size={22} className="text-rose" />
            </div>
            <p className="text-white/60 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && providers.length === 0 && <EmptyState />}

        <AnimatePresence mode="wait">
          {showStack && (
            <CollageStack
              key="stack"
              providers={providers.slice(0, STACK_COUNT)}
              onExpand={handleExpand}
              totalCount={providers.length}
            />
          )}

          {showGrid && (
            <ExpandedGrid
              key="grid"
              providers={providers}
              onCollapse={handleCollapse}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ── Stack collage CORREGIDO (sin superposición) ───────────────────────── */

function CollageStack({
  providers,
  onExpand,
  totalCount,
}: {
  providers: PublicProvider[];
  onExpand: () => void;
  totalCount: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-8"
    >
      {/* Contenedor del collage - centrado con margen automático */}
      <div className="relative w-full max-w-[380px] mx-auto min-h-[420px] flex items-center justify-center">
        <div className="relative w-[300px] sm:w-[340px] h-[400px]">
          {providers.map((provider, idx) => {
            const layout = STACK_LAYOUT[idx % STACK_LAYOUT.length];
            // La tarjeta del fondo (índice 0) debe estar detrás
            const zIndex = layout.zIndex;
            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  rotate: layout.rotate,
                  x: layout.x,
                  y: layout.y,
                }}
                transition={{ 
                  duration: 0.5, 
                  delay: idx * 0.1, 
                  ease: [0.16, 1, 0.3, 1] as const 
                }}
                className="absolute left-1/2 top-0 w-[280px] sm:w-[300px] -translate-x-1/2"
                style={{ 
                  zIndex,
                  transformOrigin: 'center center',
                }}
              >
                <ProviderCard provider={provider} variant="stack" />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Botón y contador - ahora debajo del collage */}
      <button
        type="button"
        onClick={onExpand}
        className="btn btn-primary btn-lg press-effect group mt-4"
      >
        Descubrir profesionales
        <ArrowRight
          size={18}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </button>

      <p className="text-white/40 text-xs -mt-2">
        {totalCount} profesionales destacados
      </p>
    </motion.div>
  );
}

/* ── Grid expandido ──────────────────────────────────────────── */

function ExpandedGrid({
  providers,
  onCollapse,
}: {
  providers: PublicProvider[];
  onCollapse: () => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {providers.map((p) => (
          <motion.div key={p.id} variants={cardVariants}>
            <ProviderCard provider={p} variant="grid" />
          </motion.div>
        ))}
      </motion.div>

      <div className="flex justify-center mt-12">
        <button
          type="button"
          onClick={onCollapse}
          className="inline-flex items-center gap-2 text-white/50 hover:text-white text-[13px] font-display font-semibold transition-colors group"
        >
          <Layers
            size={14}
            className="transition-transform duration-200 group-hover:-translate-y-0.5"
          />
          Vista collage
        </button>
      </div>
    </motion.div>
  );
}

/* ── Provider Card ─────────────────────────────────────────── */

function ProviderCard({
  provider,
  variant,
}: {
  provider: PublicProvider;
  variant: 'stack' | 'grid';
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
    return (
      <article className="glass overflow-hidden border border-white/10 shadow-glow-sm" aria-hidden="true">
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

  return (
    <article className="glass glass-hover overflow-hidden group cursor-pointer transition-all duration-300">
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
    <div className="relative aspect-[5/3] bg-dark-card overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover transition-transform duration-500 ease-smooth ${
          interactive ? 'group-hover:scale-[1.04]' : ''
        }`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {category && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-accent/10 border border-accent/20 text-accent text-[11px] font-display font-semibold px-2.5 py-1 rounded-full backdrop-blur-md">
          <Briefcase size={11} />
          {category}
        </span>
      )}

      {rating > 0 && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-amber/10 border border-amber/20 text-amber text-[11px] font-display font-semibold px-2 py-1 rounded-full tabular-nums backdrop-blur-md">
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
    <div className="p-4">
      <h3 className="font-display font-semibold text-white text-[15px] leading-snug truncate">
        {businessName}
      </h3>

      <div className="flex items-center gap-2 mt-1.5">
        <StarRow value={rating} />
        <span className="text-white/40 text-[11px]">
          {reviews > 0
            ? `(${reviews} ${reviews === 1 ? 'reseña' : 'reseñas'})`
            : 'Sin reseñas'}
        </span>
      </div>

      {location && (
        <div className="flex items-center gap-1.5 mt-2 text-white/50 text-[11px]">
          <MapPin size={11} className="text-accent flex-shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      )}

      {phoneShown && (
        <div className="flex items-center gap-1.5 mt-1 text-white/50 text-[11px]">
          {isWhats ? (
            <MessageCircle size={11} className="text-accent flex-shrink-0" />
          ) : (
            <Phone size={11} className="text-white/40 flex-shrink-0" />
          )}
          <span className="truncate">{phoneShown}</span>
        </div>
      )}

      {description && (
        <p className="text-white/40 text-xs leading-relaxed mt-2 line-clamp-2">
          {description}
        </p>
      )}
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  const full = Math.floor(value);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          className={i < full ? 'text-amber fill-amber' : 'text-white/20'}
        />
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass overflow-hidden">
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
    <div className="glass p-12 text-center max-w-md mx-auto">
      <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Briefcase size={26} className="text-white/40" />
      </div>
      <h3 className="font-display font-semibold text-white text-[17px] mb-2">
        Estamos preparando los mejores profesionales
      </h3>
      <p className="text-white/40 text-sm">¡Vuelve pronto!</p>
    </div>
  );
}

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