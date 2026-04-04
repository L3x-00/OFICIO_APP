'use client';

import { useState, useEffect } from 'react';
import {
  Star, MessageSquare, Users, Tag, Download,
  Loader2, ShieldCheck, TrendingUp, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getReports, exportUsersCSV, exportProvidersCSV, ReportsResponse } from '@/lib/api';

export function ReportsDashboard() {
  const [data, setData]           = useState<ReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'top_rated' | 'most_reviewed' | 'active_users' | 'categories' | 'registrations' | 'verification'
  >('top_rated');

  useEffect(() => {
    getReports()
      .then(setData)
      .catch((err: any) => {
        const msg = err?.message || 'No se pudieron cargar los reportes';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleExport = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const tabs = [
    { id: 'top_rated',       label: 'Mejor calificados', icon: Star          },
    { id: 'most_reviewed',   label: 'Más reseñados',     icon: MessageSquare  },
    { id: 'active_users',    label: 'Usuarios activos',  icon: Users          },
    { id: 'categories',      label: 'Categorías',        icon: Tag            },
    { id: 'registrations',   label: 'Registros',         icon: TrendingUp     },
    { id: 'verification',    label: 'Verificación',      icon: ShieldCheck    },
  ] as const;

  const VERIFICATION_COLORS: Record<string, string> = {
    APROBADO:  'text-green-400',
    PENDIENTE: 'text-orange-400',
    RECHAZADO: 'text-red-400',
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="text-red-400" size={36} />
        <p className="text-red-400 text-sm">{error || 'Error al cargar reportes'}</p>
        <button
          onClick={() => { setError(null); setIsLoading(true); getReports().then(setData).catch((e) => setError(e.message)).finally(() => setIsLoading(false)); }}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Botones de exportación */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => handleExport(exportUsersCSV(), 'usuarios.csv')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-white/10 text-gray-300 text-sm font-medium hover:border-blue-500/40 hover:text-blue-400 transition-all"
        >
          <Download size={14} />
          Exportar usuarios CSV
        </button>
        <button
          onClick={() => handleExport(exportProvidersCSV(), 'proveedores.csv')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-white/10 text-gray-300 text-sm font-medium hover:border-purple-500/40 hover:text-purple-400 transition-all"
        >
          <Download size={14} />
          Exportar proveedores CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === id
                ? 'bg-primary/15 text-primary border border-primary/25'
                : 'bg-[#1a1a1a] text-gray-400 border border-white/5 hover:border-white/15'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden">

        {/* Mejor calificados */}
        {activeTab === 'top_rated' && (
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                {['#', 'Proveedor', 'Categoría', 'Localidad', 'Calificación', 'Reseñas', 'Verificado'].map((h) => (
                  <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.topRatedProviders.map((p, i) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-gray-600 font-bold text-sm">{i + 1}</td>
                  <td className="p-4 font-semibold text-white text-sm">{p.businessName}</td>
                  <td className="p-4 text-sm text-gray-400">{p.category.name}</td>
                  <td className="p-4 text-sm text-gray-400">{p.locality.name}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-white font-bold text-sm">{p.averageRating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-400">{p.totalReviews}</td>
                  <td className="p-4">
                    {p.isVerified
                      ? <ShieldCheck size={15} className="text-green-400" />
                      : <span className="text-gray-700">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Más reseñados */}
        {activeTab === 'most_reviewed' && (
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                {['#', 'Proveedor', 'Categoría', 'Reseñas', 'Calificación'].map((h) => (
                  <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.mostReviewedProviders.map((p, i) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-gray-600 font-bold text-sm">{i + 1}</td>
                  <td className="p-4 font-semibold text-white text-sm">{p.businessName}</td>
                  <td className="p-4 text-sm text-gray-400">{p.category.name}</td>
                  <td className="p-4">
                    <span className="text-white font-bold text-sm">{p.totalReviews}</span>
                    <span className="text-gray-600 text-xs ml-1">reseñas</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-gray-300 text-sm">{p.averageRating.toFixed(1)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Usuarios más activos */}
        {activeTab === 'active_users' && (
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                {['#', 'Usuario', 'Email', 'Reseñas', 'Favoritos', 'Miembro desde'].map((h) => (
                  <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.mostActiveUsers.map((u, i) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-gray-600 font-bold text-sm">{i + 1}</td>
                  <td className="p-4 font-semibold text-white text-sm">{u.firstName} {u.lastName}</td>
                  <td className="p-4 text-xs text-gray-500">{u.email}</td>
                  <td className="p-4 text-sm text-gray-300">{u._count.reviews}</td>
                  <td className="p-4 text-sm text-gray-300">{u._count.favorites}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Categorías */}
        {activeTab === 'categories' && (
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                {['#', 'Categoría', 'Slug', 'Proveedores'].map((h) => (
                  <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.popularCategories.map((c, i) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-gray-600 font-bold text-sm">{i + 1}</td>
                  <td className="p-4 font-semibold text-white text-sm">{c.name}</td>
                  <td className="p-4 text-xs font-mono text-gray-500">{c.slug}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 bg-primary/60 rounded-full"
                        style={{ width: `${Math.min(100, (c._count.providers / (data.popularCategories[0]?._count.providers || 1)) * 100)}px` }}
                      />
                      <span className="text-white font-bold text-sm">{c._count.providers}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Registros por mes */}
        {activeTab === 'registrations' && (
          data.recentRegistrations.length === 0 ? (
            <div className="p-12 text-center text-gray-600 text-sm">
              No hay datos de registros disponibles
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr>
                  {['Mes', 'Clientes nuevos', 'Proveedores nuevos', 'Total'].map((h) => (
                    <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.recentRegistrations.map((r) => (
                  <tr key={r.month} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-semibold text-white text-sm">{r.month}</td>
                    <td className="p-4 text-sm text-blue-400">{Number(r.users)}</td>
                    <td className="p-4 text-sm text-purple-400">{Number(r.providers)}</td>
                    <td className="p-4 text-sm text-gray-300 font-bold">
                      {Number(r.users) + Number(r.providers)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* Estado de verificación */}
        {activeTab === 'verification' && (
          <div className="p-8">
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              {data.verificationStats.map((s) => (
                <div
                  key={s.status}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-center"
                >
                  <p className={`text-3xl font-black mb-1 ${VERIFICATION_COLORS[s.status] ?? 'text-gray-400'}`}>
                    {s.count}
                  </p>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                    {s.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
