'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Trash2, Loader2, UserCheck, UserX,
  ShieldCheck, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getUsers, deleteUser, updateUserStatus, UserItem } from '@/lib/api';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  USUARIO:    { label: 'Cliente',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  PROVEEDOR:  { label: 'Proveedor',    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  ADMIN:      { label: 'Admin',        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
};

export function UsersList() {
  const [users, setUsers]           = useState<UserItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [lastPage, setLastPage]     = useState(1);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'true' | 'false'>('');
  const [isLoading, setIsLoading]   = useState(true);
  const [actionId, setActionId]     = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserItem | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUsers({
        page,
        search: search || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter !== '' ? statusFilter === 'true' : undefined,
      });
      setUsers(data.data);
      setTotal(data.total);
      setLastPage(data.lastPage);
    } catch (err: any) {
      toast.error(err?.message || 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (user: UserItem) => {
    setActionId(user.id);
    try {
      await deleteUser(user.id);
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Error al eliminar usuario');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    setActionId(user.id);
    try {
      await updateUserStatus(user.id, !user.isActive);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Error al actualizar estado del usuario');
    } finally {
      setActionId(null);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o correo..."
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/40 transition-all"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-blue-500/40 transition-all"
        >
          <option value="">Todos los roles</option>
          <option value="USUARIO">Clientes</option>
          <option value="PROVEEDOR">Proveedores</option>
          <option value="ADMIN">Admins</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
          className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-blue-500/40 transition-all"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>

        <span className="text-xs text-gray-500 font-medium ml-auto">
          {total} usuario(s)
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                {['Usuario', 'Rol', 'Estado', 'Registro', 'Actividad', 'Acciones'].map((h) => (
                  <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-500" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-600 text-sm">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : users.map((u) => {
                const role = ROLE_LABELS[u.role] ?? { label: u.role, color: 'text-gray-400 bg-white/5 border-white/10' };
                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-sm">
                          {u.firstName} {u.lastName}
                        </span>
                        <span className="text-xs text-gray-500">{u.email}</span>
                        {u.provider && (
                          <span className="text-xs text-purple-400 mt-0.5 flex items-center gap-1">
                            {u.provider.isVerified && <ShieldCheck size={10} />}
                            {u.provider.businessName}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${role.color}`}>
                        {role.label}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                        u.isActive
                          ? 'text-green-400 bg-green-500/10 border border-green-500/20'
                          : 'text-red-400 bg-red-500/10 border border-red-500/20'
                      }`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    <td className="p-4 text-sm text-gray-400">
                      {fmt(u.createdAt)}
                    </td>

                    <td className="p-4">
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div>{u._count.reviews} reseña(s)</div>
                        <div>{u._count.favorites} favorito(s)</div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {u.role !== 'ADMIN' && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={actionId === u.id}
                              title={u.isActive ? 'Desactivar' : 'Activar'}
                              className={`p-2 rounded-lg transition-all ${
                                u.isActive
                                  ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                                  : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              }`}
                            >
                              {actionId === u.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : u.isActive ? <UserX size={13} /> : <UserCheck size={13} />
                              }
                            </button>

                            <button
                              onClick={() => setConfirmDelete(u)}
                              disabled={actionId === u.id}
                              title="Eliminar usuario"
                              className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
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
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-[#1a1a1a] border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-400">
            Página {page} de {lastPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page === lastPage}
            className="p-2 rounded-lg bg-[#1a1a1a] border border-white/5 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal de confirmación de borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Eliminar usuario</h3>
            <p className="text-gray-400 text-sm mb-1">
              ¿Eliminar a <strong className="text-white">{confirmDelete.firstName} {confirmDelete.lastName}</strong>?
            </p>
            <p className="text-gray-600 text-xs mb-6">
              Esta acción borrará el usuario, sus reseñas y favoritos en cascada. No se puede deshacer.
              {confirmDelete.provider && (
                <span className="block mt-1 text-orange-400">
                  También se eliminará el perfil de proveedor: {confirmDelete.provider.businessName}
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:border-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={actionId === confirmDelete.id}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-bold hover:bg-red-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionId === confirmDelete.id && <Loader2 size={14} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
