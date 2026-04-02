'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Eye, EyeOff, 
  CheckCircle, XCircle, Edit, Star, Trash2, Loader2 
} from 'lucide-react';
import { StatusBadge } from './status-badge';
import { CreateProviderModal } from './create-provider-modal';
import { EditProviderModal } from './edit-provider-modal';
// Importamos las funciones unificadas
import { getProviders, deleteProvider, toggleVisibility, Provider } from '@/lib/api';

interface Props {
  initialPage: number;
  initialSearch: string;
}

export function ProvidersList({ initialPage, initialSearch }: Props) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const lastPage = Math.ceil(total / 15);

  // Carga de datos usando la API unificada
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getProviders(page, search);
      setProviders(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error("Error cargando proveedores:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    // Implementamos un pequeño debounce manual para la búsqueda
    const timer = setTimeout(() => {
      load();
    }, 300); 
    return () => clearTimeout(timer);
  }, [load]);

  const handleToggleVisibility = async (id: number) => {
    setActionLoading(id);
    try {
      await toggleVisibility(id);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro? Se borrará el usuario, fotos y reseñas en cascada.')) return;
    
    setActionLoading(id);
    try {
      await deleteProvider(id);
      await load();
    } catch (e: any) {
      alert(e.message || 'Error al eliminar');
    } finally {
      setActionLoading(null);
    }
  };

  const availabilityBadge = (av: string) => {
    const map: Record<string, { label: string; variant: any }> = {
      DISPONIBLE: { label: 'Disponible', variant: 'success' },
      OCUPADO: { label: 'Ocupado', variant: 'danger' },
      CON_DEMORA: { label: 'Demora', variant: 'warning' },
      FUERA_DE_SERVICIO: { label: 'Offline', variant: 'muted' },
    };
    return map[av] ?? { label: av, variant: 'muted' };
  };

  return (
    <div className="space-y-4">
      {/* Herramientas */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, teléfono o correo..."
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {total} resultados
          </span>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus size={16} />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Tabla con scroll horizontal para móviles */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                {['Proveedor', 'Categoría', 'Estado / Visibilidad', 'Calificación', 'Suscripción', 'Acciones'].map((h) => (
                  <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={6} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
              ) : providers.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-sm">{p.businessName}</span>
                      <span className="text-xs text-gray-500">{p.user?.email}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 bg-white/5 rounded-lg text-gray-300">{p.category.name}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                      <StatusBadge {...availabilityBadge(p.availability)} />
                      <StatusBadge 
                        label={p.isVisible ? 'Público' : 'Privado'} 
                        variant={p.isVisible ? 'success' : 'muted'} 
                      />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-bold text-white">{p.averageRating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {p.subscription ? (
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${p.subscription.status === 'ACTIVA' ? 'text-green-400' : 'text-orange-400'}`}>
                          {p.subscription.plan}
                        </span>
                        <span className="text-[10px] text-gray-600 uppercase">{p.subscription.status}</span>
                      </div>
                    ) : <span className="text-gray-700">-</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingProvider(p)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleToggleVisibility(p.id)}
                        disabled={actionLoading === p.id}
                        className={`p-2 rounded-lg transition-all ${p.isVisible ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}
                      >
                        {p.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        disabled={actionLoading === p.id}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                      >
                        {actionLoading === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {lastPage > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => setPage(num)}
              className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                num === page ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-[#1a1a1a] text-gray-500 border border-white/5 hover:border-white/20'
              }`}
            >
              {num}
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

      <EditProviderModal
        provider={editingProvider}
        isOpen={!!editingProvider}
        onClose={() => setEditingProvider(null)}
        onUpdated={() => { setEditingProvider(null); load(); }}
      />
    </div>
  );
}