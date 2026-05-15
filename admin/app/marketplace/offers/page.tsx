'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAdminOffers, getAdminOfferCategories, AdminOfferItem } from '@/lib/api';
import { Loader2, MapPin, Tag, RefreshCw } from 'lucide-react';

/**
 * Listado admin de ofertas con filtros laterales. Las categorías que se
 * muestran como chips se cargan dinámicamente desde `/admin/offers/categories`
 * — solo aparecen las que tienen ofertas activas, no toda la taxonomía.
 */
export default function AdminOffersPage() {
  const [items, setItems] = useState<AdminOfferItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [providerType, setProviderType] = useState('');
  const [department, setDepartment]     = useState('');
  const [province, setProvince]         = useState('');
  const [district, setDistrict]         = useState('');
  const [categorySlug, setCategorySlug] = useState('');

  const [cats, setCats] = useState<Array<{ id: number; name: string; slug: string }>>([]);

  useEffect(() => {
    getAdminOfferCategories().then(setCats).catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    getAdminOffers({
      page,
      providerType: providerType || undefined,
      department:   department    || undefined,
      province:     province      || undefined,
      district:     district      || undefined,
      categorySlug: categorySlug  || undefined,
    })
      .then((res) => {
        setItems(res.data);
        setTotal(res.total);
        setLastPage(res.lastPage);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, providerType, department, province, district, categorySlug]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Cualquier cambio de filtro resetea la paginación a 1.
  useEffect(() => { setPage(1); }, [providerType, department, province, district, categorySlug]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ofertas publicadas</h1>
          <p className="text-gray-400 text-sm mt-1">
            {total} ofertas — filtra por ubicación, tipo y categoría.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-2 text-sm rounded bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 inline-flex items-center gap-2"
        >
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <select
          value={providerType}
          onChange={(e) => setProviderType(e.target.value)}
          className="bg-white/5 border border-white/10 text-gray-200 rounded px-3 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          <option value="OFICIO">Profesionales</option>
          <option value="NEGOCIO">Negocios</option>
        </select>
        <input
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="Departamento"
          className="bg-white/5 border border-white/10 text-gray-200 rounded px-3 py-2 text-sm"
        />
        <input
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          placeholder="Provincia"
          className="bg-white/5 border border-white/10 text-gray-200 rounded px-3 py-2 text-sm"
        />
        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="Distrito"
          className="bg-white/5 border border-white/10 text-gray-200 rounded px-3 py-2 text-sm"
        />
        <select
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          className="bg-white/5 border border-white/10 text-gray-200 rounded px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {cats.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-amber-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          Sin ofertas con esos filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((o) => (
            <div key={o.id} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-white">{o.title}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  o.provider.type === 'NEGOCIO'
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-blue-500/15 text-blue-300'
                }`}>
                  {o.provider.type === 'NEGOCIO' ? 'Negocio' : 'Profesional'}
                </span>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2">{o.description}</p>
              <div className="text-xs text-gray-300 flex items-center gap-3 flex-wrap">
                {o.price != null && <span>S/ {o.price.toFixed(0)}</span>}
                <span className="text-gray-500">·</span>
                <span>{o.provider.businessName}</span>
                {o.provider.locality?.district && (
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <MapPin size={11} /> {o.provider.locality.district}
                  </span>
                )}
              </div>
              {o.categories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {o.categories.map((c) => (
                    <span key={c.category.id}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 inline-flex items-center gap-1">
                      <Tag size={10} /> {c.category.name}
                    </span>
                  ))}
                </div>
              )}
              {!o.isActive && (
                <div className="text-[11px] text-red-400">Oferta inactiva</div>
              )}
            </div>
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded bg-white/5 border border-white/10 text-gray-200 text-sm disabled:opacity-30">
            Anterior
          </button>
          <span className="px-3 py-1 text-sm text-gray-400">
            {page} / {lastPage}
          </span>
          <button disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded bg-white/5 border border-white/10 text-gray-200 text-sm disabled:opacity-30">
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
