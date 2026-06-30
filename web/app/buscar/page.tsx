'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, MapPin, Star, Radar, Store, Loader2, X } from 'lucide-react';
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
    <div className="h-[300px] rounded-2xl border border-white/10 bg-dark-card/50 flex items-center justify-center text-white/40">
      <Loader2 className="animate-spin" />
    </div>
  ),
});

// TODO: el usuario completará estos enlaces (los dejamos vacíos como en mobile).
const PLAY_STORE_URL = '';
const SOCIALS: { icon: string; label: string; href: string }[] = [
  { icon: 'whatsapp.svg', label: 'WhatsApp', href: '' },
  { icon: 'instagram.svg', label: 'Instagram', href: '' },
  { icon: 'tiktok.svg', label: 'TikTok', href: '' },
  { icon: 'facebook.svg', label: 'Facebook', href: '' },
  { icon: 'gmail.svg', label: 'Correo', href: '' },
];

export default function BuscarPage() {
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

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-6xl mx-auto px-4 pt-8 sm:pt-12">
        {/* Hero + búsqueda */}
        <header className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Buscar servicios
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Encuentra profesionales y negocios verificados cerca de ti.
          </p>
        </header>

        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runTextSearch();
              }}
              placeholder="¿Qué servicio necesitas? (electricista, peluquería…)"
              className="w-full bg-dark-card/70 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder:text-white/30 outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <button
            onClick={runTextSearch}
            disabled={searching || !query.trim()}
            className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl px-5 py-3 text-sm transition-colors disabled:opacity-50"
          >
            Buscar
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
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:border-white/20'
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
            <h2 className="font-display text-lg font-bold text-white">Buscar por radio</h2>
          </div>
          <SearchRadarMap onSearch={runNearby} loading={searching} />
        </section>

        {/* Resultados (búsqueda / categoría / cercanía) o descubrimiento */}
        {results !== null ? (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-white">
                {resultsTitle}{' '}
                <span className="text-white/40 text-sm font-normal">({results.length})</span>
              </h2>
              <button
                onClick={clearResults}
                className="inline-flex items-center gap-1 text-white/50 hover:text-white text-sm"
              >
                <X size={14} /> Limpiar
              </button>
            </div>
            {searching ? (
              <LoaderRow />
            ) : results.length === 0 ? (
              <p className="text-white/40 text-sm py-8 text-center">
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
                <h2 className="font-display text-lg font-bold text-white mb-4">Recomendados</h2>
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
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-amber/10 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-primary/20 items-center justify-center shrink-0">
                <Store className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                  ¿Aún no tienes tu negocio registrado?
                </h3>
                <p className="text-white/60 text-sm mt-1">
                  Únete a Servi y llega a miles de clientes en tu ciudad. El registro es gratis.
                </p>
              </div>
              <Link
                href="/login"
                className="shrink-0 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
              >
                ¡Regístrate!
              </Link>
            </div>
          </div>
        </section>

        {/* Descarga la app + redes */}
        <section className="rounded-2xl border border-white/10 bg-dark-card/50 p-6 text-center">
          <h3 className="font-display text-lg font-bold text-white">Lleva Servi contigo</h3>
          <p className="text-white/50 text-sm mt-1 mb-4">
            Descarga la app y encuentra servicios donde estés.
          </p>
          <a
            href={PLAY_STORE_URL || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-black font-semibold rounded-xl px-5 py-3 text-sm hover:bg-white/90 transition-colors"
          >
            Descargar App
          </a>
          <div className="flex items-center justify-center gap-3 mt-5">
            {SOCIALS.map((s) => (
              <a
                key={s.icon}
                href={s.href || undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center hover:border-white/25 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/social/${s.icon}`} alt={s.label} width={20} height={20} />
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* Botón sticky de descarga (esquina inferior izquierda, lejos de los FAB) */}
      <a
        href={PLAY_STORE_URL || undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 left-4 z-40 inline-flex items-center gap-2 bg-white text-black font-semibold rounded-full pl-4 pr-5 py-2.5 text-sm shadow-lg hover:bg-white/90 transition-colors"
      >
      </a>
    </main>
  );
}

// ── Tarjeta de proveedor → perfil público /p/[id] (acepta id numérico) ──
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
      className="glass glass-hover overflow-hidden group block rounded-2xl border border-white/10 transition-all"
    >
      <div className="relative aspect-[5/3] bg-dark-card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={provider.businessName}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        {provider.category?.name && (
          <span className="absolute top-2 left-2 text-[11px] bg-black/50 text-white/90 px-2 py-0.5 rounded-full">
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
        <p className="text-white font-semibold text-sm truncate">{provider.businessName}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
          <span className="inline-flex items-center gap-1 text-amber">
            <Star size={12} className="fill-amber" /> {rating.toFixed(1)}
            <span className="text-white/40">({reviews})</span>
          </span>
          {location && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin size={12} /> {location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Carrusel horizontal de proveedores ──
function Carousel({ title, providers }: { title: string; providers: PublicProvider[] }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-lg font-bold text-white mb-4">{title}</h2>
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
    <div className="py-12 flex justify-center text-white/40">
      <Loader2 className="animate-spin" />
    </div>
  );
}
