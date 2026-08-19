'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, MapPin, Star, Radar, Loader2, X, ChevronDown, ShieldCheck, SearchX } from 'lucide-react';
import {
  api,
  type PublicProvider,
  type FeaturedCategory,
  type FeaturedGroup,
} from '@/lib/api';
import { PROFILE_TYPE_META } from '@/lib/types';

// El mapa usa Leaflet (window) → solo en cliente.
const SearchRadarMap = dynamic(() => import('@/components/search/search-radar-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-dark-card/50 flex items-center justify-center text-gray-400 dark:text-white/40">
      <Loader2 className="animate-spin" />
    </div>
  ),
});

/* useSearchParams exige un boundary de Suspense al prerender (Next 16). */
export default function BuscarPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white dark:bg-dark-premium flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" />
        </main>
      }
    >
      <BuscarPageInner />
    </Suspense>
  );
}

function BuscarPageInner() {
  const [categories, setCategories] = useState<FeaturedCategory[]>([]);
  const [groups, setGroups] = useState<FeaturedGroup[]>([]);
  const [topRated, setTopRated] = useState<PublicProvider[]>([]);
  const [topReviewed, setTopReviewed] = useState<PublicProvider[]>([]);

  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [results, setResults] = useState<PublicProvider[] | null>(null);
  const [resultsTitle, setResultsTitle] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
    api.getFeaturedGrouped().then(setGroups).catch(() => {});
    api.getPublicProviders(12).then(setTopRated).catch(() => {});
    api.searchProviders({ sortBy: 'reviews', limit: 12 }).then(setTopReviewed).catch(() => {});
  }, []);

  const clearResults = () => {
    setResults(null);
    setResultsTitle('');
    setActiveCat(null);
    setQuery('');
  };

  const runTextSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setActiveCat(null);
    try {
      const data = await api.searchProviders({ search: q, limit: 24 });
      setResults(data);
      setResultsTitle(`Resultados para "${q}"`);
    } catch {
      setResults([]);
      setResultsTitle(`Resultados para "${q}"`);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const pickCategory = useCallback(async (cat: FeaturedCategory) => {
    setSearching(true);
    setActiveCat(cat.slug);
    setQuery('');
    try {
      const data = await api.searchProviders({ categorySlug: cat.slug, limit: 24 });
      setResults(data);
      setResultsTitle(cat.name);
    } catch {
      setResults([]);
      setResultsTitle(cat.name);
    } finally {
      setSearching(false);
    }
  }, []);

  const runNearby = useCallback(async (lat: number, lng: number, km: number) => {
    setSearching(true);
    setActiveCat(null);
    try {
      const data = await api.getNearby(lat, lng, km);
      setResults(data);
      setResultsTitle(`Cerca de ti · ${km} km`);
    } catch {
      setResults([]);
      setResultsTitle(`Cerca de ti · ${km} km`);
    } finally {
      setSearching(false);
    }
  }, []);

  /* Deep-link desde la landing (solutions-section):
     /buscar?categoria=<slug-padre>&provincia=X — listado por ubicación
     /buscar?categoria=<slug-padre>&lat=..&lng=..&km=.. — radio PostGIS */
  const searchParams = useSearchParams();
  const deepLinkRan = useRef(false);
  useEffect(() => {
    if (deepLinkRan.current) return;
    const categoria = searchParams.get('categoria');
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    const km = Number(searchParams.get('km')) || 10;
    const provincia = searchParams.get('provincia');
    const titulo = searchParams.get('titulo') || categoria;
    if (!categoria && !(lat && lng)) return;
    deepLinkRan.current = true;

    setSearching(true);
    setResults([]);
    const done = (data: PublicProvider[], title: string) => {
      setResults(data);
      setResultsTitle(title);
      setSearching(false);
    };
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      api
        .getNearby(lat, lng, km, categoria ? { parentCategorySlug: categoria } : {})
        .then((data) => done(data, `${titulo} · cerca de ti (${km} km)`))
        .catch(() => done([], `${titulo} · cerca de ti (${km} km)`));
    } else if (categoria) {
      api
        .searchProviders({ parentCategorySlug: categoria, province: provincia ?? undefined, limit: 24 })
        .then((data) => done(data, provincia ? `${titulo} · ${provincia}` : String(titulo)))
        .catch(() => done([], String(titulo)));
    }
  }, [searchParams]);

  return (
    <main className="min-h-screen pb-16 bg-white dark:bg-dark-premium transition-colors duration-300">
      {/* pt compensa el navbar fijo (h-20) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28">
        {/* Header */}
        <header className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Buscar servicios
          </h1>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
            Encuentra profesionales y negocios verificados cerca de ti.
          </p>
        </header>

        {/* Barra de búsqueda */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runTextSearch();
              }}
              placeholder="¿Qué servicio necesitas? (electricista, peluquería…)"
              className="w-full bg-gray-100 dark:bg-dark-card/70 border border-gray-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <button
            onClick={runTextSearch}
            disabled={searching || !query.trim()}
            className="btn btn-primary press-effect h-[46px] px-5 text-sm font-semibold disabled:opacity-50"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
          </button>
        </div>

        {/* Chips de categorías */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1 scrollbar-none">
            {categories.map((cat) => {
              const active = activeCat === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => pickCategory(cat)}
                  className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors ${
                    active
                      ? 'bg-primary/15 border-primary/40 text-primary dark:text-primary-light'
                      : 'bg-gray-100 dark:bg-white/[0.04] border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/70 hover:border-gray-300 dark:hover:border-white/20'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Mapa radar */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Radar size={18} className="text-primary" />
            <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">Buscar por radio</h2>
          </div>
          <SearchRadarMap onSearch={runNearby} loading={searching} />
        </section>

        {/* Resultados o descubrimiento */}
        {results !== null ? (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">
                {resultsTitle}{' '}
                <span className="text-gray-400 dark:text-white/40 text-sm font-normal">({results.length})</span>
              </h2>
              <button
                onClick={clearResults}
                className="inline-flex items-center gap-1 text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white text-sm transition-colors"
              >
                <X size={14} /> Limpiar
              </button>
            </div>
            {searching ? (
              <ResultsSkeleton />
            ) : results.length === 0 ? (
              <div className="py-14 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                  <SearchX size={26} className="text-gray-400 dark:text-white/40" />
                </div>
                <p className="text-gray-700 dark:text-white/80 text-sm font-semibold">
                  Sin resultados para esta búsqueda
                </p>
                <p className="text-gray-500 dark:text-white/40 text-sm mt-1 max-w-xs">
                  Prueba con otra categoría, amplía el radio en el mapa o revisa la ortografía.
                </p>
                <button
                  onClick={clearResults}
                  className="btn btn-glass press-effect mt-5 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <X size={14} /> Limpiar búsqueda
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((p) => (
                  <ProviderCard key={p.id} provider={p} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Carruseles agrupados por categoría */}
            {groups
              .filter((g) => g.providers.length > 0)
              .map((g) => (
                <Carousel key={g.category.id} title={g.category.name} providers={g.providers} />
              ))}

            {/* Más buscados */}
            {topReviewed.length > 0 && (
              <Carousel title="Más buscados" providers={topReviewed} />
            )}

            {/* Recomendados */}
            {topRated.length > 0 && (
              <section className="mb-10">
                <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-4">Recomendados</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topRated.slice(0, 6).map((p) => (
                    <ProviderCard key={p.id} provider={p} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Banner publicitario propio */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 dark:border-primary/30 bg-gradient-to-br from-primary/5 to-amber/5 dark:from-primary/15 dark:to-amber/10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="hidden sm:flex w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 items-center justify-center shrink-0">
                <Search size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  ¿Eres profesional o tienes un negocio?
                </h3>
                <p className="text-gray-500 dark:text-white/60 text-sm mt-1">
                  Regístrate gratis en Servi y recibe clientes en tu ciudad.
                </p>
              </div>
              <Link
                href="/registrar-proveedor"
                className="shrink-0 btn btn-primary press-effect text-sm font-semibold"
              >
                Registrar mi servicio
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

// ── Tarjeta de proveedor ──
// Estado de disponibilidad → punto de color + etiqueta (señal de confianza
// para el cliente al elegir). Solo se muestra si el backend lo envía.
const AVAIL_META: Record<
  NonNullable<PublicProvider['availability']>,
  { dot: string; label: string }
> = {
  DISPONIBLE: { dot: 'bg-emerald-400', label: 'Disponible' },
  OCUPADO: { dot: 'bg-amber-400', label: 'Ocupado' },
  CON_DEMORA: { dot: 'bg-rose-400', label: 'Con demora' },
};

/**
 * Carrusel automático de la foto de portada: si el proveedor tiene varias
 * imágenes, rota entre ellas con un crossfade suave. `startDelay` (derivado
 * del id) escalona el arranque para que no todas las tarjetas cambien a la vez.
 */
function CardImageCarousel({
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
      interval = setInterval(() => setIdx((i) => (i + 1) % images.length), 3600);
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
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.7, ease: 'easeInOut' }, scale: { duration: 4 } }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
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

function ProviderCard({ provider }: { provider: PublicProvider }) {
  // Portada primero, luego el resto → carrusel automático suave.
  const imageUrls = (() => {
    const imgs = provider.images ?? [];
    const cover = imgs.filter((i) => i.isCover).map((i) => i.url);
    const rest = imgs.filter((i) => !i.isCover).map((i) => i.url);
    const all = [...cover, ...rest].filter(Boolean);
    return all.length ? all : ['/images/logo/servi.png'];
  })();
  const avail = provider.availability ? AVAIL_META[provider.availability] : null;
  const rating = provider.averageRating ?? 0;
  const reviews = provider.totalReviews ?? 0;
  const location = [provider.locality?.district, provider.locality?.province]
    .filter(Boolean)
    .join(', ');
  const href = `/${provider.slug ?? provider.id}`;
  const distance = (provider as { distanceKm?: number | null }).distanceKm;

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-card overflow-hidden hover:border-primary/30 dark:hover:border-primary/30 hover:shadow-lg dark:hover:shadow-glow-sm transition-all duration-300"
    >
      <div className="relative aspect-[5/3] bg-gray-100 dark:bg-dark-card overflow-hidden">
        <CardImageCarousel
          images={imageUrls}
          alt={provider.businessName}
          startDelay={(provider.id % 6) * 500}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
        {provider.category?.name && (
          <span className="absolute top-2 left-2 text-[11px] bg-black/50 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {provider.category.name}
          </span>
        )}
        {typeof distance === 'number' && (
          <span className="absolute top-2 right-2 text-[11px] bg-primary/80 text-white px-2 py-0.5 rounded-full">
            {distance.toFixed(1)} km
          </span>
        )}
        {avail && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 text-[11px] font-medium bg-black/55 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
            {avail.label}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <p className="text-gray-900 dark:text-white font-semibold text-sm truncate">{provider.businessName}</p>
          {provider.credentialVerified && (
            <ShieldCheck size={14} className="shrink-0 text-emerald-500 dark:text-emerald-400" aria-label="Credenciales verificadas" />
          )}
          {provider.type && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60">
              {PROFILE_TYPE_META[provider.type].label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-white/50">
          <span className="inline-flex items-center gap-1 text-amber">
            <Star size={12} className="fill-amber" /> {rating.toFixed(1)}
            <span className="text-gray-400 dark:text-white/40">({reviews})</span>
          </span>
          {location && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin size={12} className="text-gray-400 dark:text-white/40" /> {location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Carrusel horizontal ──
// Muestra solo los primeros 3 para no saturar; el resto se "acopla" oculto
// detrás de un botón y se despliega/repliega con una animación de docking.
const CAROUSEL_VISIBLE = 3;

function Carousel({ title, providers }: { title: string; providers: PublicProvider[] }) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = providers.length - CAROUSEL_VISIBLE;
  const visible = expanded ? providers : providers.slice(0, CAROUSEL_VISIBLE);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            {expanded ? 'Ver menos' : `Ver todos (+${hiddenCount})`}
            <ChevronDown
              size={14}
              className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        <AnimatePresence initial={false}>
          {visible.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.82, x: -28 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.82, x: -28 }}
              transition={{
                duration: 0.32,
                ease: [0.22, 1, 0.36, 1],
                delay: i >= CAROUSEL_VISIBLE ? (i - CAROUSEL_VISIBLE) * 0.05 : 0,
              }}
              className="w-[260px] shrink-0"
            >
              <ProviderCard provider={p} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

// Skeleton que refleja la grilla de resultados — preserva el layout (evita CLS)
// y comunica "cargando" mejor que un spinner suelto. aria-busy para lectores.
function ResultsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      aria-busy="true"
      aria-label="Cargando resultados"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-card overflow-hidden"
        >
          <div className="aspect-[5/3] bg-gray-200/70 dark:bg-white/5 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3.5 w-2/3 rounded bg-gray-200/70 dark:bg-white/5 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-gray-200/70 dark:bg-white/5 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

