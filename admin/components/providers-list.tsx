'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import {
  Plus, Search, Eye, EyeOff,
  CheckCircle, XCircle, Edit, Star, Trash2, Loader2, Crown, X,
} from 'lucide-react';
import { StatusBadge } from './status-badge';
import { CreateProviderModal } from './create-provider-modal';
import { EditProviderModal } from './edit-provider-modal';
import { ProviderDetailModal } from './provider-detail-modal';
import { getProviders, deleteProvider, toggleVisibility, promotePlan, Provider } from '@/lib/api';
import { toast } from 'sonner';

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
  const [viewingProvider, setViewingProvider] = useState<Provider | null>(null);
  const [promotingProvider, setPromotingProvider] = useState<Provider | null>(null);
  const [promotePlanLoading, setPromotePlanLoading] = useState(false);
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

  // Recargar cuando llega un nuevo proveedor registrado en tiempo real
  useAdminSocket(useCallback(payload => {
    if (payload.type === 'NEW_PROVIDER') load();
  }, [load]));

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

  const handlePromotePlan = async (id: number, plan: 'ESTANDAR' | 'PREMIUM') => {
    setPromotePlanLoading(true);
    try {
      await promotePlan(id, plan);
      toast.success(`Plan ${plan === 'PREMIUM' ? 'Premium' : 'Estándar'} activado · notificación enviada`);
      setPromotingProvider(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al promover plan');
    } finally {
      setPromotePlanLoading(false);
    }
  };

  const typeBadge = (type: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      NEGOCIO:      { label: 'Negocio',     cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
      BUSINESS:     { label: 'Negocio',     cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
      OFICIO:       { label: 'Profesional', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
      PROFESSIONAL: { label: 'Profesional', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    };
    return map[type] ?? { label: type, cls: 'text-gray-400 bg-white/5 border-white/10' };
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

  const verificationBadge = (status: string) => {
    const map: Record<string, { label: string; variant: any }> = {
      APROBADO:  { label: 'Aprobado',      variant: 'success' },
      PENDIENTE: { label: 'En revisión',   variant: 'warning' },
      RECHAZADO: { label: 'Rechazado',     variant: 'danger'  },
    };
    return map[status] ?? { label: status, variant: 'muted' };
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
                {['Proveedor', 'Tipo', 'Categoría', 'Estado / Visibilidad', 'Calificación', 'Suscripción', 'Acciones'].map((h) => (
                  <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={7} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
              ) : providers.map((p) => {
                const tb = typeBadge(p.type);
                return (
                <tr
                  key={p.id}
                  onClick={() => setViewingProvider(p)}
                  className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-sm">{p.businessName}</span>
                      <span className="text-xs text-gray-500">{p.user?.email}</span>
                    </div>
                  </td>
                  {/* Tipo de proveedor */}
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold ${tb.cls}`}>
                      {tb.label}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 bg-white/5 rounded-lg text-gray-300">{p.category.name}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                      <StatusBadge {...verificationBadge(p.verificationStatus)} />
                      {p.verificationStatus === 'APROBADO' && (
                        <StatusBadge {...availabilityBadge(p.availability)} />
                      )}
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
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingProvider(p)}
                        className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setPromotingProvider(p)}
                        className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-all"
                        title="Promover plan"
                      >
                        <Crown size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(p.id)}
                        disabled={actionLoading === p.id}
                        className={`p-2 rounded-lg transition-all ${p.isVisible ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}
                        title={p.isVisible ? 'Ocultar' : 'Mostrar'}
                      >
                        {p.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={actionLoading === p.id}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                        title="Eliminar"
                      >
                        {actionLoading === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
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

      <ProviderDetailModal
        provider={viewingProvider}
        onClose={() => setViewingProvider(null)}
        onEdit={viewingProvider ? () => {
          const p = viewingProvider;
          setViewingProvider(null);
          setEditingProvider(p);
        } : undefined}
      />

      {/* Modal de promoción de plan */}
      {promotingProvider && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPromotingProvider(null)}
        >
          <div
            className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center">
                    <Crown size={16} className="text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">Promover Plan</h3>
                    <p className="text-gray-500 text-xs truncate max-w-[160px]">{promotingProvider.businessName}</p>
                  </div>
                </div>
                <button onClick={() => setPromotingProvider(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 transition-all">
                  <X size={16} />
                </button>
              </div>

              <p className="text-gray-400 text-xs mb-4">
                Plan actual: <span className="text-white font-semibold">{promotingProvider.subscription?.plan ?? 'GRATIS'}</span>
                {' · '}{promotingProvider.subscription?.status ?? '—'}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePromotePlan(promotingProvider.id, 'ESTANDAR')}
                  disabled={promotePlanLoading}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all group"
                >
                  <Crown size={20} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-cyan-400 font-bold text-sm">Estándar</span>
                  <span className="text-cyan-400/60 text-[10px]">Visibilidad media</span>
                </button>
                <button
                  onClick={() => handlePromotePlan(promotingProvider.id, 'PREMIUM')}
                  disabled={promotePlanLoading}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all group"
                >
                  <Crown size={20} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                  <span className="text-yellow-400 font-bold text-sm">Premium</span>
                  <span className="text-yellow-400/60 text-[10px]">Máxima visibilidad</span>
                </button>
              </div>

              {promotePlanLoading && (
                <div className="flex justify-center mt-4">
                  <Loader2 size={18} className="animate-spin text-white/40" />
                </div>
              )}

              <p className="text-gray-600 text-[10px] text-center mt-4">
                El cambio es inmediato · Se notifica al proveedor por app
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}