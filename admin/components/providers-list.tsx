'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Eye, EyeOff,
  CheckCircle, XCircle, Edit, Star,
} from 'lucide-react';
import { StatusBadge } from './status-badge';
// Al estar en la misma carpeta, usamos ./
import { CreateProviderModal } from './create-provider-modal';
import { EditProviderModal } from './edit-provider-modal';

const BASE_URL = 'http://localhost:3000';

interface Provider {
  id: number;
  businessName: string;
  phone: string;
  isVerified: boolean;
  isVisible: boolean;
  averageRating: number;
  totalReviews: number;
  availability: string;
  type: string;
  category: { name: string };
  locality: { name: string };
  subscription?: { plan: string; status: string; endDate: string };
  user: { email: string };
}

interface Props {
  initialPage: number;
  initialSearch: string;
}

export function ProvidersList({ initialPage, initialSearch }: Props) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(initialPage);
  const [search, setSearch]       = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const lastPage = Math.ceil(total / 15);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(search ? { search } : {}),
      });
      const res  = await fetch(`${BASE_URL}/admin/providers?${params}`);
      const data = await res.json();
      setProviders(data.data);
      setTotal(data.total);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleToggleVisibility = async (id: number) => {
    setActionLoading(id);
    await fetch(`${BASE_URL}/admin/providers/${id}/toggle-visibility`, {
      method: 'PATCH',
    });
    await load();
    setActionLoading(null);
  };

  const handleApproveVerification = async (id: number) => {
    setActionLoading(id);
    await fetch(`${BASE_URL}/admin/providers/${id}/approve`, {
      method: 'PATCH',
    });
    await load();
    setActionLoading(null);
  };

  const availabilityBadge = (av: string) => {
    const map: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
      DISPONIBLE: { label: 'Disponible', variant: 'success' },
      OCUPADO:    { label: 'Ocupado',    variant: 'danger'  },
      CON_DEMORA: { label: 'Con demora', variant: 'warning' },
    };
    return map[av] ?? { label: av, variant: 'muted' as const };
  };

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar proveedor..."
            className="w-full bg-bg-card border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary/50"
          />
        </div>
        <span className="text-sm text-gray-500 ml-auto">
          {total} proveedores
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          <Plus size={16} />
          Nuevo proveedor
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-bg-card rounded-2xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Cargando...</div>
        ) : providers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No se encontraron proveedores
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {[
                  'Proveedor', 'Categoría', 'Tipo',
                  'Calificación', 'Estado', 'Verificado',
                  'Suscripción', 'Acciones',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {providers.map((p) => {
                const av = availabilityBadge(p.availability);
                return (
                  <tr key={p.id} className="hover:bg-white/2">
                    <td className="p-4">
                      <p className="font-medium text-white text-sm">{p.businessName}</p>
                      <p className="text-xs text-gray-500">{p.phone}</p>
                      <p className="text-xs text-gray-600">{p.user.email}</p>
                    </td>
                    <td className="p-4 text-sm text-gray-300">{p.category.name}</td>
                    <td className="p-4">
                      <StatusBadge
                        label={p.type === 'OFICIO' ? 'Oficio' : 'Negocio'}
                        variant={p.type === 'OFICIO' ? 'info' : 'warning'}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Star size={13} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-sm text-white">
                          {p.averageRating.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({p.totalReviews})
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <StatusBadge label={av.label} variant={av.variant} />
                        <div>
                          {p.isVisible
                            ? <StatusBadge label="Visible" variant="success" />
                            : <StatusBadge label="Oculto" variant="muted" />
                          }
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {p.isVerified
                        ? <CheckCircle size={18} className="text-green-400" />
                        : <XCircle size={18} className="text-gray-600" />
                      }
                    </td>
                    <td className="p-4">
                      {p.subscription && (
                        <div>
                          <StatusBadge
                            label={p.subscription.plan}
                            variant={
                              p.subscription.status === 'ACTIVA' ? 'success' :
                              p.subscription.status === 'GRACIA' ? 'warning' : 'danger'
                            }
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {p.subscription.status}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {/* Editar */}
                        <button
                          onClick={() => setEditingProvider(p)}
                          className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>

                        {/* Suspender / Activar */}
                        <button
                          onClick={() => handleToggleVisibility(p.id)}
                          disabled={actionLoading === p.id}
                          className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                            p.isVisible
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          }`}
                          title={p.isVisible ? 'Suspender' : 'Activar'}
                        >
                          {p.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>

                        {/* Verificar */}
                        {!p.isVerified && (
                          <button
                            onClick={() => handleApproveVerification(p.id)}
                            disabled={actionLoading === p.id}
                            className="p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                            title="Aprobar verificación"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {lastPage > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-all ${
                p === page
                  ? 'bg-primary text-white'
                  : 'bg-bg-card text-gray-400 border border-white/5 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Modales */}
      {showCreate && (
        <CreateProviderModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); load(); }}
        />
      )}
      {/* Cambia onSuccess por onUpdated */}
        {editingProvider && (
        <EditProviderModal
            provider={editingProvider}
            isOpen={!!editingProvider} // Añadimos esta prop si usas el código que te pasé
            onClose={() => setEditingProvider(null)}
            onUpdated={() => { 
            setEditingProvider(null); 
            load(); // Refresca la lista automáticamente
            }}
        />
        )}
    </div>
  );
}