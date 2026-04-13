'use client';

import { X, Mail, Calendar, Star, Heart, Briefcase, ShieldCheck,
  UserCheck, UserX, Trash2, Loader2, Building2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { UserItem, updateUserStatus, deleteUser } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  user: UserItem | null;
  onClose: () => void;
  onUpdated: () => void;
}

const ROLE_MAP: Record<string, { label: string; color: string; icon: any }> = {
  USUARIO:   { label: 'Cliente',    color: 'text-blue-400   bg-blue-500/10   border-blue-500/20',   icon: UserCheck },
  PROVEEDOR: { label: 'Proveedor',  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: Briefcase },
  ADMIN:     { label: 'Admin',      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: ShieldAlert },
};

const VERIF_MAP: Record<string, { label: string; color: string }> = {
  APROBADO:  { label: 'Aprobado',  color: 'text-green-400  bg-green-500/10  border-green-500/20' },
  PENDIENTE: { label: 'Pendiente', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  RECHAZADO: { label: 'Rechazado', color: 'text-red-400    bg-red-500/10    border-red-500/20' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function UserDetailModal({ user, onClose, onUpdated }: Props) {
  const [actionLoading, setActionLoading] = useState<'status' | 'delete' | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!user) return null;

  const role = ROLE_MAP[user.role] ?? { label: user.role, color: 'text-gray-400 bg-white/5 border-white/10', icon: UserCheck };
  const RoleIcon = role.icon;
  const isAdmin = user.role === 'ADMIN';

  const handleToggleStatus = async () => {
    setActionLoading('status');
    try {
      await updateUserStatus(user.id, !user.isActive);
      toast.success(user.isActive ? 'Usuario desactivado' : 'Usuario activado');
      onUpdated();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al actualizar estado');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    setActionLoading('delete');
    try {
      await deleteUser(user.id);
      toast.success('Usuario eliminado');
      onUpdated();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al eliminar');
    } finally {
      setActionLoading(null);
      setConfirmingDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#111] border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600/40 to-purple-600/40 border border-white/10 flex items-center justify-center text-white font-bold text-lg">
              {user.firstName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">{user.firstName} {user.lastName}</h2>
              <p className="text-gray-500 text-xs">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${role.color}`}>
              <RoleIcon size={12} /> {role.label}
            </span>
            <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${
              user.isActive
                ? 'text-green-400 bg-green-500/10 border-green-500/20'
                : 'text-red-400   bg-red-500/10   border-red-500/20'
            }`}>
              {user.isActive ? <UserCheck size={12}/> : <UserX size={12}/>}
              {user.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          {/* Info básica */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Información</h3>
            <div className="space-y-2">
              <InfoRow icon={<Mail size={14} className="text-blue-400"/>} label="Correo" value={user.email} />
              <InfoRow icon={<Calendar size={14} className="text-purple-400"/>} label="Fecha de registro" value={fmt(user.createdAt)} />
            </div>
          </section>

          {/* Actividad */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Actividad</h3>
            <div className="grid grid-cols-2 gap-3">
              <MetricBox icon={<Star size={14} className="text-yellow-400 fill-yellow-400"/>} label="Reseñas" value={String(user._count.reviews)} />
              <MetricBox icon={<Heart size={14} className="text-pink-400 fill-pink-400"/>} label="Favoritos" value={String(user._count.favorites)} />
            </div>
          </section>

          {/* Proveedor asociado */}
          {user.provider && (
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Perfil de proveedor</h3>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
                      <Building2 size={14} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{user.provider.businessName}</p>
                      <p className="text-gray-500 text-xs">ID #{user.provider.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.provider.isVerified && (
                      <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                        <ShieldCheck size={11}/> Verificado
                      </span>
                    )}
                    {(() => {
                      const vs = VERIF_MAP[user.provider.verificationStatus] ?? { label: user.provider.verificationStatus, color: 'text-gray-400 bg-white/5 border-white/10' };
                      return (
                        <span className={`text-xs px-2 py-1 rounded-lg border ${vs.color}`}>{vs.label}</span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Acciones */}
          {!isAdmin && (
            <section className="pt-2 border-t border-white/5">
              {!confirmingDelete ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleToggleStatus}
                    disabled={actionLoading !== null}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      user.isActive
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
                        : 'bg-green-500/10  text-green-400  border-green-500/20  hover:bg-green-500/20'
                    } disabled:opacity-50`}
                  >
                    {actionLoading === 'status'
                      ? <Loader2 size={14} className="animate-spin" />
                      : user.isActive ? <UserX size={14}/> : <UserCheck size={14}/>
                    }
                    {user.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-sm font-bold transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div className="bg-red-500/[0.06] border border-red-500/20 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-red-300 font-medium">
                    ¿Eliminar a <strong>{user.firstName} {user.lastName}</strong>? Esta acción no se puede deshacer.
                  </p>
                  {user.provider && (
                    <p className="text-xs text-orange-400">
                      También se eliminará el perfil: <strong>{user.provider.businessName}</strong>
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-sm hover:border-white/20 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading !== null}
                      className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-bold hover:bg-red-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === 'delete' && <Loader2 size={13} className="animate-spin" />}
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/[0.02] rounded-xl p-3 border border-white/5">
      {icon}
      <div>
        <p className="text-gray-600 text-[10px] uppercase font-bold tracking-wider">{label}</p>
        <p className="text-white text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-white font-bold text-xl leading-tight">{value}</p>
        <p className="text-gray-600 text-xs uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
