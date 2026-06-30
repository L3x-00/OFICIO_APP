'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Star, Loader2, X } from 'lucide-react';
import { api, type PublicProvider } from '@/lib/api';

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    setShowResults(true);
    try {
      const data = await api.searchProviders({ search: trimmed, limit: 6 });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
      setShowResults(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // Búsqueda con debounce implícito (esperamos 300ms tras dejar de escribir)
    if (val.trim().length >= 2) {
      const timer = setTimeout(() => runSearch(val), 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleSelectProvider = () => {
    setShowResults(false);
    setQuery('');
  };

  const coverUrl = (p: PublicProvider) =>
    p.images?.find((i) => i.isCover)?.url ??
    p.images?.[0]?.url ??
    '/images/logo/servi.png';

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (results.length > 0) setShowResults(true);
            }}
            placeholder="¿Qué servicio necesitas? Ej: electricista, gasfitero..."
            className="w-full bg-dark-card/80 border border-white/10 rounded-xl pl-11 pr-10 py-3.5 text-white text-sm placeholder:text-white/30 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary press-effect h-[46px] px-5 text-sm font-semibold"
        >
          Buscar
        </button>
      </form>

      {/* Dropdown de resultados */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 glass rounded-xl border border-white/10 overflow-hidden shadow-glow-lg">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-white/40">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-4 text-center text-white/40 text-sm">
              No se encontraron proveedores
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              {results.map((p) => (
                <Link
                  key={p.id}
                  href={`/p/${p.slug ?? p.id}`}
                  onClick={handleSelectProvider}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/5 last:border-b-0 group"
                >
                  {/* Avatar / miniatura */}
                  <div className="w-10 h-10 rounded-lg bg-dark-card border border-white/10 overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverUrl(p)}
                      alt={p.businessName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate group-hover:text-primary-light transition-colors">
                      {p.businessName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-white/50">
                      {p.category?.name && (
                        <span className="text-[11px] bg-white/[0.06] px-1.5 py-0.5 rounded">
                          {p.category.name}
                        </span>
                      )}
                      {p.averageRating != null && (
                        <span className="inline-flex items-center gap-0.5 text-amber">
                          <Star size={11} className="fill-amber" />
                          {p.averageRating.toFixed(1)}
                          <span className="text-white/40">({p.totalReviews ?? 0})</span>
                        </span>
                      )}
                    </div>
                    {(p.locality?.district || p.locality?.province) && (
                      <p className="text-xs text-white/40 mt-0.5 inline-flex items-center gap-1">
                        <MapPin size={10} />
                        {[p.locality?.district, p.locality?.province].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Flecha */}
                  <Search size={14} className="text-white/20 group-hover:text-primary-light transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {/* Footer: Ver todos */}
          {results.length > 0 && (
            <button
              type="submit"
              className="w-full py-2.5 text-center text-primary-light text-sm font-semibold hover:bg-white/[0.04] transition-colors border-t border-white/5"
            >
              Ver todos los resultados
            </button>
          )}
        </div>
      )}
    </div>
  );
}