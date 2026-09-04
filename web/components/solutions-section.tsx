'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiChevronRight, FiMapPin, FiLoader } from 'react-icons/fi';
import { Star, ShieldCheck, SearchX } from 'lucide-react';
import { api, type FeaturedGroup, type PublicProvider } from '@/lib/api';

/* Fallback cuando el visitante no da permiso de ubicación: provincia de
   Huancayo (incluye los distritos Huancayo y El Tambo). */
const FALLBACK_PROVINCE = 'Huancayo';
const NEARBY_RADIUS_KM = 10;

/** Tope de tarjetas en el carrusel — más allá el track pesa y nadie lo ve. */
const MAX_CARDS = 16;
/** Mínimo de tarjetas antes de duplicar: con 2-3 proveedores el loop se ve vacío. */
const MIN_TRACK = 8;
/** Velocidad del marquee: segundos que tarda en pasar UNA tarjeta. */
const SECONDS_PER_CARD = 6;

/* Estado de disponibilidad → punto de color + etiqueta. Mismo criterio que
   la tarjeta de /buscar (señal de confianza al elegir). */
const AVAIL_META: Record<
  NonNullable<PublicProvider['availability']>,
  { dot: string; label: string }
> = {
  DISPONIBLE: { dot: 'bg-emerald-400', label: 'Disponible' },
  OCUPADO: { dot: 'bg-amber-400', label: 'Ocupado' },
  CON_DEMORA: { dot: 'bg-rose-400', label: 'Con demora' },
};

/**
 * Nombre de la categoría a mostrar en la tarjeta. `featured-grouped` no
 * aplana `category`: manda `providerCategories` con la insignia primero.
 */
function categoryNameOf(p: PublicProvider): string | null {
  if (p.category?.name) return p.category.name;
  const primary =
    p.providerCategories?.find((pc) => pc.isPrimary)?.category ??
    p.providerCategories?.[0]?.category;
  return primary?.name ?? null;
}

/** Portada primero, luego el resto de fotos del proveedor. */
function imageUrlsOf(p: PublicProvider): string[] {
  const imgs = p.images ?? [];
  return [
    ...imgs.filter((i) => i.isCover).map((i) => i.url),
    ...imgs.filter((i) => !i.isCover).map((i) => i.url),
  ].filter(Boolean);
}

/**
 * Crossfade automático entre las fotos reales del proveedor. `startDelay`
 * (derivado del id) escalona el arranque para que no todas las tarjetas
 * cambien a la vez. Con una sola foto no monta timers.
 */
function CardMedia({
  images,
  alt,
  startDelay,
}: {
  images: string[];
  alt: string;
  startDelay: number;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    let interval: ReturnType<typeof setInterval>;
    const kickoff = setTimeout(() => {
      interval = setInterval(() => setIdx((i) => (i + 1) % images.length), 4200);
    }, startDelay);
    return () => {
      clearTimeout(kickoff);
      if (interval) clearInterval(interval);
    };
  }, [images.length, startDelay]);

  return (
    <>
      <AnimatePresence initial={false}>
        <motion.img
          key={idx}
          src={images[idx]}
          alt={alt}
          loading="lazy"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.8, ease: 'easeInOut' }, scale: { duration: 5 } }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      {images.length > 1 && (
        <div className="absolute top-3 right-3 flex gap-1 z-10">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === idx ? 'w-3.5 bg-white' : 'w-1 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}

/** Tarjeta de proveedor REAL: foto, nombre, descripción y datos de su ficha. */
function ProviderTile({ provider, muted }: { provider: PublicProvider; muted: boolean }) {
  const images = imageUrlsOf(provider);
  const categoryName = categoryNameOf(provider);
  const avail = provider.availability ? AVAIL_META[provider.availability] : null;
  const rating = provider.averageRating ?? 0;
  const reviews = provider.totalReviews ?? 0;
  const location = [provider.locality?.district, provider.locality?.province]
    .filter(Boolean)
    .join(', ');

  return (
    <Link
      href={`/${provider.slug ?? provider.id}`}
      aria-hidden={muted}
      tabIndex={muted ? -1 : 0}
      className="group relative w-[17rem] h-[21rem] rounded-2xl overflow-hidden flex-shrink-0
                 shadow-lg hover:shadow-2xl ring-1 ring-black/5 dark:ring-white/10
                 transition-all duration-300 hover:-translate-y-2 focus-visible:-translate-y-2"
    >
      {/* Foto real (o rotación de fotos) */}
      <div className="absolute inset-0 bg-gray-200 dark:bg-dark-card transition-transform duration-700 group-hover:scale-[1.06]">
        <CardMedia images={images} alt={provider.businessName} startDelay={(provider.id % 7) * 450} />
      </div>

      {/* Velo inferior: mantiene legible el texto sobre cualquier foto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5" />

      {/* Categoría real del proveedor */}
      {categoryName && (
        <span className="absolute top-3 left-3 text-[11px] font-medium text-white/90 bg-black/45 backdrop-blur-sm px-2.5 py-1 rounded-full max-w-[60%] truncate">
          {categoryName}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        {avail && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full mb-2">
            <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
            {avail.label}
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <h3 className="font-display font-bold text-[17px] leading-tight truncate">
            {provider.businessName}
          </h3>
          {provider.credentialVerified && (
            <ShieldCheck size={15} className="shrink-0 text-emerald-300" aria-label="Credenciales verificadas" />
          )}
        </div>

        <div className="flex items-center gap-2.5 mt-1 text-[12px] text-white/75">
          {reviews > 0 && (
            <span className="inline-flex items-center gap-1 text-amber">
              <Star size={12} className="fill-amber" /> {rating.toFixed(1)}
              <span className="text-white/50">({reviews})</span>
            </span>
          )}
          {location && (
            <span className="inline-flex items-center gap-1 truncate">
              <FiMapPin className="shrink-0 text-white/50" /> {location}
            </span>
          )}
        </div>

        {/* Descripción real del proveedor — siempre visible (legible sobre el velo) */}
        {provider.description && (
          <p className="text-[12px] leading-snug text-white/70 mt-2 line-clamp-2">
            {provider.description}
          </p>
        )}

        {/* El CTA se despliega al pasar el cursor / al enfocar con teclado */}
        <span
          className="mt-0 max-h-0 opacity-0 overflow-hidden inline-flex items-center gap-1.5
                     text-[13px] font-semibold text-white
                     transition-all duration-300
                     group-hover:mt-3 group-hover:max-h-12 group-hover:opacity-100
                     group-focus-visible:mt-3 group-focus-visible:max-h-12 group-focus-visible:opacity-100"
        >
          <span className="bg-primary group-hover:bg-primary/90 px-4 py-1.5 rounded-full shadow-lg inline-flex items-center gap-1.5">
            Ver perfil <FiChevronRight className="text-xs" />
          </span>
        </span>
      </div>
    </Link>
  );
}

function TileSkeleton() {
  return (
    <div className="w-[17rem] h-[21rem] rounded-2xl flex-shrink-0 bg-gray-200 dark:bg-white/5 animate-pulse" />
  );
}

export default function SolutionsSection() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [groups, setGroups] = useState<FeaturedGroup[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState<string | null>(null);

  /* Categorías padre reales × sus proveedores destacados, todo de BD
     (mismo endpoint que alimenta los carruseles de /buscar, cache 60s). */
  useEffect(() => {
    let alive = true;
    api
      .getFeaturedGrouped()
      .then((g) => {
        if (alive) setGroups(g);
      })
      .catch(() => {
        if (alive) setGroups([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* Conteo real por categoría: `featured-grouped` trae como máximo 8
     proveedores por grupo, así que su length NO es el total. */
  useEffect(() => {
    if (groups.length === 0) return;
    let alive = true;
    void Promise.all(
      groups.map((g) =>
        api
          .countProviders({ parentCategorySlug: g.category.slug, province: FALLBACK_PROVINCE })
          .then((n) => [g.category.slug, n] as const)
          .catch(() => [g.category.slug, -1] as const),
      ),
    ).then((pairs) => {
      if (alive) setCounts(Object.fromEntries(pairs.filter(([, n]) => n >= 0)));
    });
    return () => {
      alive = false;
    };
  }, [groups]);

  /* Round-robin entre categorías para que el carrusel no arranque con seis
     gasfiteros seguidos. Solo entran proveedores CON foto (decisión de
     producto: una tarjeta sin imagen rompe la sección). */
  const cards = useMemo(() => {
    const queues = groups.map((g) => g.providers.filter((p) => imageUrlsOf(p).length > 0));
    const out: PublicProvider[] = [];
    const seen = new Set<number>();
    const depth = Math.max(0, ...queues.map((q) => q.length));
    for (let row = 0; row < depth && out.length < MAX_CARDS; row++) {
      for (const q of queues) {
        const p = q[row];
        if (!p || seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
        if (out.length >= MAX_CARDS) break;
      }
    }
    return out;
  }, [groups]);

  /* El track se duplica para el loop infinito; con pocas tarjetas se repite
     antes para que no queden huecos. La segunda mitad es decorativa
     (aria-hidden + fuera del orden de tabulación). */
  const track = useMemo(() => {
    if (cards.length === 0) return [];
    const padded = [...cards];
    while (padded.length < MIN_TRACK) padded.push(...cards);
    return [...padded, ...padded];
  }, [cards]);

  const half = track.length / 2;
  /* Velocidad constante en px/s: sin esto, pocas tarjetas = movimiento lento. */
  const marqueeDuration = `${Math.max(20, half * SECONDS_PER_CARD)}s`;

  /* Clic en una categoría: intenta geolocalizar para listar proveedores
     cercanos; si no da permiso (o falla), cae a la provincia de Huancayo. */
  const goToCategory = (slug: string, title: string) => {
    if (locating) return;
    const fallback = () =>
      router.push(
        `/buscar?categoria=${slug}&provincia=${FALLBACK_PROVINCE}&titulo=${encodeURIComponent(title)}`,
      );

    if (!('geolocation' in navigator)) {
      fallback();
      return;
    }
    setLocating(slug);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(null);
        router.push(
          `/buscar?categoria=${slug}&lat=${pos.coords.latitude.toFixed(6)}&lng=${pos.coords.longitude.toFixed(6)}&km=${NEARBY_RADIUS_KM}&titulo=${encodeURIComponent(title)}`,
        );
      },
      () => {
        setLocating(null);
        fallback();
      },
      { timeout: 6000, maximumAge: 300000 },
    );
  };

  return (
    <section className="py-16 sm:py-20 bg-white dark:bg-dark-premium transition-colors duration-300 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-gray-900 dark:text-white flex items-center gap-3">
            Soluciones para todo
          </h2>
          <p className="text-gray-600 dark:text-white/60 mt-2 text-base sm:text-lg">
            Proveedores reales, verificados y cerca de ti.
          </p>
          <div className="inline-flex items-center gap-2 mt-3 text-primary dark:text-primary-light bg-primary/10 px-4 py-1.5 rounded-full text-sm font-medium">
            <FiMapPin />
            Según tu ubicación
          </div>
        </div>

        {/* Categorías reales del catálogo → /buscar prefiltrado */}
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8" aria-label="Categorías de servicios">
            {groups.map((g, i) => {
              const count = counts[g.category.slug];
              const isLocating = locating === g.category.slug;
              return (
                <motion.button
                  key={g.category.id}
                  type="button"
                  onClick={() => goToCategory(g.category.slug, g.category.name)}
                  disabled={isLocating}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : i * 0.04 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                             bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/75
                             border border-gray-200 dark:border-white/10
                             hover:border-primary/40 hover:text-primary dark:hover:text-primary-light
                             hover:-translate-y-0.5 transition-all disabled:opacity-60"
                >
                  {isLocating ? <FiLoader className="animate-spin" /> : null}
                  {g.category.name}
                  {typeof count === 'number' && count > 0 && (
                    <span className="text-xs text-gray-500 dark:text-white/40">{count}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Carrusel infinito de proveedores reales (pausa al hover / al enfocar) */}
      {loading ? (
        <div className="flex gap-6 px-5 sm:px-8 overflow-hidden" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <TileSkeleton key={i} />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/15 p-10 text-center">
            <SearchX className="mx-auto mb-3 text-gray-400 dark:text-white/30" size={28} />
            <p className="text-gray-700 dark:text-white/70 font-medium">
              Aún no hay servicios con fotos publicadas en tu zona
            </p>
            <p className="text-gray-500 dark:text-white/45 text-sm mt-1">
              Explora el directorio completo o registra tu servicio para aparecer aquí.
            </p>
            <Link
              href="/buscar"
              className="inline-flex items-center gap-2 mt-4 bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all"
            >
              Ver todos los servicios <FiChevronRight />
            </Link>
          </div>
        </div>
      ) : (
        /* `overflow-x-auto`: con `prefers-reduced-motion` el CSS apaga la
           animación del track — sin scroll manual las tarjetas de la derecha
           quedarían inalcanzables. También da arrastre táctil en móvil,
           donde no existe el hover que pausa el marquee. */
        <div
          className="marquee-mask relative overflow-x-auto"
          aria-label="Servicios destacados"
          style={{
            scrollbarWidth: 'none',
            maskImage:
              'linear-gradient(to right, transparent, #000 3%, #000 97%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent, #000 3%, #000 97%, transparent)',
          }}
        >
          <div
            className="marquee-track gap-6 px-5 sm:px-8 py-2"
            style={{ animationDuration: marqueeDuration }}
          >
            {track.map((p, i) => (
              <ProviderTile key={`${p.id}-${i}`} provider={p} muted={i >= half} />
            ))}
          </div>
        </div>
      )}

      {/* Enlace al directorio completo */}
      {cards.length > 0 && (
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 flex justify-end mt-6">
          <Link
            href="/buscar"
            className="inline-flex items-center gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10
                       hover:border-primary/40 hover:bg-gray-50 dark:hover:bg-white/10 px-6 py-2.5 rounded-full
                       font-semibold text-gray-800 dark:text-white/80 transition-all hover:translate-x-1"
          >
            Ver todos los servicios <FiChevronRight className="text-primary dark:text-primary-light" />
          </Link>
        </div>
      )}
    </section>
  );
}
