'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, Star, Radar, Loader2, X } from 'lucide-react';
import {
  api,
  type PublicProvider,
  type FeaturedCategory,
  type FeaturedGroup,
} from '@/lib/api';

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
              <LoaderRow />
            ) : results.length === 0 ? (
              <p className="text-gray-400 dark:text-white/40 text-sm py-12 text-center">
                No encontramos proveedores para esta búsqueda.
              </p>
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
function ProviderCard({ provider }: { provider: PublicProvider }) {
  const cover =
    provider.images?.find((i) => i.isCover)?.url ??
    provider.images?.[0]?.url ??
    '/images/logo/servi.png';
  const rating = provider.averageRating ?? 0;
  const reviews = provider.totalReviews ?? 0;
  const location = [provider.locality?.district, provider.locality?.province]
    .filter(Boolean)
    .join(', ');
  const href = `/p/${provider.slug ?? provider.id}`;
  const distance = (provider as { distanceKm?: number | null }).distanceKm;

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-card overflow-hidden hover:border-primary/30 dark:hover:border-primary/30 hover:shadow-lg dark:hover:shadow-glow-sm transition-all duration-300"
    >
      <div className="relative aspect-[5/3] bg-gray-100 dark:bg-dark-card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={provider.businessName}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
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
      </div>
      <div className="p-3">
        <p className="text-gray-900 dark:text-white font-semibold text-sm truncate">{provider.businessName}</p>
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
function Carousel({ title, providers }: { title: string; providers: PublicProvider[] }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {providers.map((p) => (
          <div key={p.id} className="w-[260px] shrink-0">
            <ProviderCard provider={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

function LoaderRow() {
  return (
    <div className="py-12 flex justify-center text-gray-400 dark:text-white/40">
      <Loader2 className="animate-spin" />
    </div>
  );
}