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

// Layout del collage - valores responsivos (más pequeños en móvil)
const getStackLayout = (isMobile: boolean) => [
  { rotate: 2,   x: isMobile ? -6 : -12,  y: isMobile ? -4 : -8,  zIndex: 1 },
  { rotate: -2.5, x: isMobile ? 8 : 14,   y: isMobile ? -2 : -4,  zIndex: 2 },
  { rotate: 3.5,  x: isMobile ? -4 : -8,  y: isMobile ? 1 : 2,    zIndex: 3 },
  { rotate: -3,   x: isMobile ? 6 : 10,   y: isMobile ? 3 : 6,    zIndex: 4 },
  { rotate: 4,    x: isMobile ? 0 : 0,    y: isMobile ? 6 : 12,   zIndex: 5 },
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
    <section className="relative py-16 sm:py-24 md:py-32 bg-dark-premium overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 right-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div 
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 sm:mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <div className="max-w-xl">
            <span className="eyebrow text-xs sm:text-sm">Servicios destacados</span>
            <h2 className="mt-2 sm:mt-3 font-display font-bold tracking-tightest text-white text-[28px] sm:text-[34px] md:text-[44px] leading-[1.1]">
              Algunos de los más <span className="text-gradient">buscados</span>.
            </h2>
            <p className="mt-3 sm:mt-4 text-white/60 text-[14px] sm:text-[16px] leading-relaxed">
              Profesionales y negocios reales, listos para ayudarte hoy mismo.
            </p>
          </div>
        </motion.div>

        {loading && <SkeletonGrid />}

        {!loading && error && (
          <div className="glass p-6 sm:p-8 text-center max-w-md mx-auto border-rose/20">
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 rounded-xl bg-rose/10 border border-rose/20 flex items-center justify-center">
              <AlertTriangle size={18} className="sm:size-[22] text-rose" />
            </div>
            <p className="text-white/60 text-xs sm:text-sm">{error}</p>
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

/* ── Stack collage CORREGIDO (responsivo) ───────────────────────── */

function CollageStack({
  providers,
  onExpand,
  totalCount,
}: {
  providers: PublicProvider[];
  onExpand: () => void;
  totalCount: number;
}) {
  // Detectar móvil por ancho de ventana (solo visual, no afecta lógica)
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const stackLayout = getStackLayout(isMobile);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-6 sm:gap-8"
    >
      {/* Contenedor del collage - altura dinámica responsiva */}
      <div className="relative w-full max-w-[320px] sm:max-w-[380px] md:max-w-[420px] mx-auto min-h-[320px] sm:min-h-[380px] md:min-h-[420px] flex items-center justify-center">
        <div className="relative w-[260px] sm:w-[300px] md:w-[340px] h-[280px] sm:h-[340px] md:h-[380px]">
          {providers.map((provider, idx) => {
            const layout = stackLayout[idx % stackLayout.length];
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
                className="absolute left-1/2 top-0 w-[240px] sm:w-[280px] md:w-[300px] -translate-x-1/2"
                style={{ 
                  zIndex: layout.zIndex,
                  transformOrigin: 'center center',
                }}
              >
                <ProviderCard provider={provider} variant="stack" />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Botón - perfectamente centrado debajo */}
      <button
        type="button"
        onClick={onExpand}
        className="btn btn-primary press-effect group px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base"
      >
        Descubrir profesionales
        <ArrowRight
          size={16}
          className="sm:size-[18] transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </button>

      <p className="text-white/40 text-[11px] sm:text-xs -mt-1 sm:-mt-2">
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-7"
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

      <div className="flex justify-center mt-8 sm:mt-10 md:mt-12">
        <button
          type="button"
          onClick={onCollapse}
          className="inline-flex items-center gap-2 text-white/50 hover:text-white text-xs sm:text-[13px] font-display font-semibold transition-colors group"
        >
          <Layers
            size={13}
            className="sm:size-[14] transition-transform duration-200 group-hover:-translate-y-0.5"
          />
          Vista collage
        </button>
      </div>
    </motion.div>
  );
}

/* ── Provider Card (responsiva) ─────────────────────────────────────────── */

function ProviderCard({
  provider,
  variant,
}: {
  provider: PublicProvider;
  variant: 'stack' | 'grid';
}) {
  const cover = pickCover(provider);
  const description = truncate(provider.description, variant === 'stack' ? 60 : 80);
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
        <CoverImage src={cover} alt={provider.businessName} category={provider.category?.name} rating={rating} compact />
        <CardBody
          businessName={provider.businessName}
          rating={rating}
          reviews={reviews}
          location={location}
          phoneShown={phoneShown}
          isWhats={isWhats}
          description={description}
          compact
        />
      </article>
    );
  }

  return (
    <article className="glass glass-hover overflow-hidden group cursor-pointer transition-all duration-300 h-full">
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
  compact,
}: {
  src: string;
  alt: string;
  category?: string;
  rating: number;
  interactive?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`relative bg-dark-card overflow-hidden ${compact ? 'aspect-[4/3]' : 'aspect-[5/3]'}`}>
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
        <span className={`absolute top-2 sm:top-3 left-2 sm:left-3 inline-flex items-center gap-1 bg-accent/10 border border-accent/20 text-accent text-[9px] sm:text-[11px] font-display font-semibold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full backdrop-blur-md`}>
          <Briefcase size={9} className="sm:size-[11]" />
          <span className="hidden xs:inline">{category}</span>
        </span>
      )}

      {rating > 0 && (
        <span className={`absolute top-2 sm:top-3 right-2 sm:right-3 inline-flex items-center gap-0.5 sm:gap-1 bg-amber/10 border border-amber/20 text-amber text-[9px] sm:text-[11px] font-display font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full tabular-nums backdrop-blur-md`}>
          <Star size={9} className="sm:size-[11] fill-amber" />
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
  compact,
}: {
  businessName: string;
  rating: number;
  reviews: number;
  location: string;
  phoneShown?: string;
  isWhats: boolean;
  description: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="p-2.5 sm:p-3 md:p-4">
        <h3 className="font-display font-semibold text-white text-[12px] sm:text-[14px] md:text-[15px] leading-snug truncate">
          {businessName}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          <StarRow value={rating} size="small" />
          <span className="text-white/40 text-[9px] sm:text-[10px]">
            {reviews > 0 ? (reviews > 99 ? '99+' : reviews) : '0'}
          </span>
        </div>
        {description && (
          <p className="text-white/40 text-[10px] sm:text-[11px] leading-relaxed mt-1.5 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5">
      <h3 className="font-display font-semibold text-white text-[14px] sm:text-[16px] leading-snug truncate">
        {businessName}
      </h3>

      <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
        <StarRow value={rating} />
        <span className="text-white/40 text-[10px] sm:text-xs">
          {reviews > 0
            ? `(${reviews} ${reviews === 1 ? 'reseña' : 'reseñas'})`
            : 'Sin reseñas'}
        </span>
      </div>

      {location && (
        <div className="flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3 text-white/50 text-[10px] sm:text-xs">
          <MapPin size={11} className="sm:size-[12] text-accent flex-shrink-0" />
          <span className="truncate text-[10px] sm:text-xs">{location}</span>
        </div>
      )}

      {phoneShown && (
        <div className="flex items-center gap-1 sm:gap-1.5 mt-1 text-white/50 text-[10px] sm:text-xs">
          {isWhats ? (
            <MessageCircle size={11} className="sm:size-[12] text-accent flex-shrink-0" />
          ) : (
            <Phone size={11} className="sm:size-[12] text-white/40 flex-shrink-0" />
          )}
          <span className="truncate text-[10px] sm:text-xs">{phoneShown}</span>
        </div>
      )}

      {description && (
        <p className="text-white/40 text-xs sm:text-[13px] leading-relaxed mt-2 sm:mt-3 line-clamp-2">
          {description}
        </p>
      )}
    </div>
  );
}

function StarRow({ value, size = 'normal' }: { value: number; size?: 'small' | 'normal' }) {
  const full = Math.floor(value);
  const starSize = size === 'small' ? 9 : 11;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={starSize}
          className={i < full ? 'text-amber fill-amber' : 'text-white/20'}
        />
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-7">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass overflow-hidden">
          <div className="skeleton aspect-[5/3]" />
          <div className="p-4 sm:p-5 space-y-2">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass p-8 sm:p-12 text-center max-w-md mx-auto">
      <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Briefcase size={22} className="sm:size-[26] text-white/40" />
      </div>
      <h3 className="font-display font-semibold text-white text-[15px] sm:text-[17px] mb-2">
        Estamos preparando los mejores profesionales
      </h3>
      <p className="text-white/40 text-xs sm:text-sm">¡Vuelve pronto!</p>
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