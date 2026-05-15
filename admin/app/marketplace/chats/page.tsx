'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAdminChats, AdminChatRoom } from '@/lib/api';
import { Loader2, MapPin, RefreshCw, MessageSquare } from 'lucide-react';

/**
 * Listado admin de salas de chat. La tabla ChatRoom solo soporta pares
 * `cliente ↔ proveedor` (no provider↔provider), así que el filtro pedido
 * "cliente↔profesional" / "cliente↔negocio" se cubre con `providerType`
 * y la rama "negocio↔profesional" no se expone porque el modelo de
 * datos no la representa.
 */
export default function AdminChatsPage() {
  const [items, setItems] = useState<AdminChatRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [providerType, setProviderType] = useState('');
  const [department, setDepartment]     = useState('');
  const [province, setProvince]         = useState('');
  const [district, setDistrict]         = useState('');
  const [activeWithin, setActiveWithin] = useState<number>(0);

  const fetchData = useCallback(() => {
    setLoading(true);
    getAdminChats({
      page,
      providerType: providerType || undefined,
      department:   department    || undefined,
      province:     province      || undefined,
      district:     district      || undefined,
      activeWithin: activeWithin  || undefined,
    })
      .then((res) => {
        setItems(res.data);
        setTotal(res.total);
        setLastPage(res.lastPage);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, providerType, department, province, district, activeWithin]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [providerType, department, province, district, activeWithin]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Conversaciones</h1>
          <p className="text-gray-400 text-sm mt-1">
            {total} salas — filtra por tipo de proveedor, ubicación o actividad reciente.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-2 text-sm rounded bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 inline-flex items-center gap-2"
        >
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <select value={providerType} onChange={(e) => setProviderType(e.target.value)}
          className="bg-white/5 border border-white/10 text-gray-200 rounded px-3 py-2 text-sm">
          <option value="">Cualquier proveedor</option>
          <option value="OFICIO">Cliente ↔ Profesional</option>
          <option value="NEGOCIO">Cliente ↔ Negocio</option>
        </select>
        <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Departamento"
          className="bg-white/5 border border-white/10 text-gray-200 rounded px-3 py-2 text-sm" />
        <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Provincia"
          className="bg-white/5 border border-white/10 text-gray-200 rounded px-3 py-2 text-sm" />
        <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Distrito"
          className="bg-white/5 border border-white/10 text-gray-200 rounded px-3 py-2 text-sm" />
        <select value={activeWithin} onChange={(e) => setActiveWithin(parseInt(e.target.value))}
          className="bg-white/5 border border-white/10 text-gray-200 rounded px-3 py-2 text-sm">
          <option value={0}>Cualquier actividad</option>
          <option value={1}>Activos hoy</option>
          <option value={3}>Últimos 3 días</option>
          <option value={7}>Últimos 7 días</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-amber-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          Sin conversaciones con esos filtros.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => {
            const last = r.messages[0];
            return (
              <div key={r.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">
                    {r.client.firstName} {r.client.lastName}
                    <span className="text-gray-500 px-2">↔</span>
                    {r.provider.businessName}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    r.provider.type === 'NEGOCIO'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-blue-500/15 text-blue-300'
                  }`}>
                    {r.provider.type === 'NEGOCIO' ? 'Negocio' : 'Profesional'}
                  </span>
                </div>
                {last ? (
                  <div className="mt-2 text-xs text-gray-400 line-clamp-2 inline-flex items-start gap-1">
                    <MessageSquare size={12} className="mt-0.5 shrink-0" />
                    <span>{last.content}</span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-500">Sin mensajes</div>
                )}
                <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-3 flex-wrap">
                  {r.provider.locality?.district && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={10} /> {r.provider.locality.district}
                    </span>
                  )}
                  {last && (
                    <span>Última actividad: {new Date(last.createdAt).toLocaleString()}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded bg-white/5 border border-white/10 text-gray-200 text-sm disabled:opacity-30">
            Anterior
          </button>
          <span className="px-3 py-1 text-sm text-gray-400">{page} / {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded bg-white/5 border border-white/10 text-gray-200 text-sm disabled:opacity-30">
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
