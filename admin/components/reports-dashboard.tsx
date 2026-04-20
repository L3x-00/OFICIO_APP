'use client';

import { useState, useEffect } from 'react';
import {
  Star, MessageSquare, Users, Tag, Download,
  Loader2, ShieldCheck, TrendingUp, AlertTriangle, Flag, CheckCircle2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getReports, exportUsersCSV, exportProvidersCSV, ReportsResponse,
  getProviderReports, markReportReviewed, ProviderReport, ProviderReportsResponse,
  getPlatformIssues, markPlatformIssueReviewed, PlatformIssue, PlatformIssuesResponse,
} from '@/lib/api';

const REASON_LABELS: Record<string, string> = {
  INFORMACION_FALSA:    'Información falsa',
  COMPORTAMIENTO:       'Comportamiento inapropiado',
  FRAUDE:               'Posible fraude',
  FOTO_INAPROPIADA:     'Fotos inapropiadas',
  NO_PRESTO:            'No prestó el servicio',
  OTRO:                 'Otro motivo',
};

export function ReportsDashboard() {
  const [data, setData]           = useState<ReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'top_rated' | 'most_reviewed' | 'active_users' | 'categories' | 'registrations' | 'verification' | 'user_reports' | 'platform_issues'
  >('top_rated');

  // ── Estado de reportes de usuarios ─────────────────────────
  const [reports, setReports]             = useState<ProviderReportsResponse | null>(null);
  const [reportsPage, setReportsPage]     = useState(1);
  const [reportsFilter, setReportsFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [reportsLoading, setReportsLoading] = useState(false);
  const [markingId, setMarkingId]         = useState<number | null>(null);

  // ── Estado de problemas de plataforma ──────────────────────
  const [issues, setIssues]               = useState<PlatformIssuesResponse | null>(null);
  const [issuesPage, setIssuesPage]       = useState(1);
  const [issuesFilter, setIssuesFilter]   = useState<'all' | 'pending' | 'reviewed'>('all');
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [markingIssueId, setMarkingIssueId] = useState<number | null>(null);

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

  // Carga reportes de usuarios cuando se activa esa pestaña o cambia filtro/página
  useEffect(() => {
    if (activeTab !== 'user_reports') return;
    setReportsLoading(true);
    const isReviewed = reportsFilter === 'all' ? undefined : reportsFilter === 'reviewed';
    getProviderReports(reportsPage, isReviewed)
      .then(setReports)
      .catch(() => toast.error('No se pudieron cargar los reportes de usuarios'))
      .finally(() => setReportsLoading(false));
  }, [activeTab, reportsPage, reportsFilter]);

  // Carga problemas de plataforma cuando se activa esa pestaña
  useEffect(() => {
    if (activeTab !== 'platform_issues') return;
    setIssuesLoading(true);
    const isReviewed = issuesFilter === 'all' ? undefined : issuesFilter === 'reviewed';
    getPlatformIssues(issuesPage, isReviewed)
      .then(setIssues)
      .catch(() => toast.error('No se pudieron cargar los problemas reportados'))
      .finally(() => setIssuesLoading(false));
  }, [activeTab, issuesPage, issuesFilter]);

  const handleMarkIssueReviewed = async (issue: PlatformIssue) => {
    if (issue.isReviewed) return;
    setMarkingIssueId(issue.id);
    try {
      await markPlatformIssueReviewed(issue.id);
      setIssues((prev) => prev
        ? {
            ...prev,
            pendingCount: Math.max(0, prev.pendingCount - 1),
            data: prev.data.map((i) => i.id === issue.id ? { ...i, isReviewed: true } : i),
          }
        : prev
      );
      toast.success('Problema marcado como revisado');
    } catch {
      toast.error('Error al marcar el problema');
    } finally {
      setMarkingIssueId(null);
    }
  };

  const handleMarkReviewed = async (report: ProviderReport) => {
    if (report.isReviewed) return;
    setMarkingId(report.id);
    try {
      await markReportReviewed(report.id);
      setReports((prev) => prev
        ? {
            ...prev,
            pendingCount: Math.max(0, prev.pendingCount - 1),
            data: prev.data.map((r) => r.id === report.id ? { ...r, isReviewed: true } : r),
          }
        : prev
      );
      toast.success('Reporte marcado como revisado');
    } catch {
      toast.error('Error al marcar el reporte');
    } finally {
      setMarkingId(null);
    }
  };

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
    { id: 'user_reports',    label: 'Reportes',          icon: Flag           },
    { id: 'platform_issues', label: 'Problemas',         icon: AlertTriangle  },
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

        {/* Reportes de usuarios */}
        {activeTab === 'user_reports' && (
          <div>
            {/* Filtros + contador pendientes */}
            <div className="flex items-center justify-between gap-3 p-4 border-b border-white/5 flex-wrap">
              <div className="flex gap-2">
                {(['all', 'pending', 'reviewed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setReportsFilter(f); setReportsPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      reportsFilter === f
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                        : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Revisados'}
                  </button>
                ))}
              </div>
              {reports && reports.pendingCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-orange-400">
                  <Clock size={12} />
                  <span className="font-bold">{reports.pendingCount}</span> sin revisar
                </div>
              )}
            </div>

            {reportsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-orange-400" size={24} />
              </div>
            ) : !reports || reports.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CheckCircle2 size={32} className="text-green-500/40" />
                <p className="text-gray-500 text-sm">No hay reportes{reportsFilter !== 'all' ? ' en este filtro' : ''}</p>
              </div>
            ) : (
              <>
                <table className="w-full text-left">
                  <thead className="bg-white/[0.02] border-b border-white/5">
                    <tr>
                      {['ID', 'Proveedor', 'Tipo', 'Motivo', 'Usuario', 'Descripción', 'Fecha', 'Estado'].map((h) => (
                        <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reports.data.map((r) => (
                      <tr key={r.id} className={`hover:bg-white/[0.02] transition-colors ${!r.isReviewed ? 'bg-orange-500/[0.03]' : ''}`}>
                        <td className="p-4 text-gray-600 font-mono text-xs">#{r.id}</td>
                        <td className="p-4">
                          <p className="text-white font-semibold text-sm">{r.provider.businessName}</p>
                          <p className="text-gray-600 text-xs mt-0.5">ID {r.provider.id}</p>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            r.provider.type === 'OFICIO'
                              ? 'bg-blue-500/15 text-blue-400'
                              : 'bg-purple-500/15 text-purple-400'
                          }`}>
                            {r.provider.type === 'OFICIO' ? 'Profesional' : 'Negocio'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-300 whitespace-nowrap">
                          {REASON_LABELS[r.reason] ?? r.reason}
                        </td>
                        <td className="p-4">
                          <p className="text-gray-300 text-sm">{r.user.firstName} {r.user.lastName}</p>
                          <p className="text-gray-600 text-xs mt-0.5">{r.user.email}</p>
                        </td>
                        <td className="p-4 max-w-[180px]">
                          <p className="text-gray-500 text-xs truncate" title={r.description ?? ''}>
                            {r.description || <span className="text-gray-700 italic">Sin detalle</span>}
                          </p>
                        </td>
                        <td className="p-4 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4">
                          {r.isReviewed ? (
                            <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
                              <CheckCircle2 size={13} /> Revisado
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMarkReviewed(r)}
                              disabled={markingId === r.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition-all disabled:opacity-50"
                            >
                              {markingId === r.id
                                ? <Loader2 size={11} className="animate-spin" />
                                : <Clock size={11} />}
                              Marcar revisado
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Paginación */}
                {reports.lastPage > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                    <p className="text-gray-600 text-xs">
                      Página {reports.page} de {reports.lastPage} · {reports.total} reportes
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReportsPage((p) => Math.max(1, p - 1))}
                        disabled={reports.page === 1}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 transition-all disabled:opacity-30"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setReportsPage((p) => Math.min(reports.lastPage, p + 1))}
                        disabled={reports.page === reports.lastPage}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 transition-all disabled:opacity-30"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'platform_issues' && (
          <div>
            <div className="flex items-center justify-between gap-3 p-4 border-b border-white/5 flex-wrap">
              <div className="flex gap-2">
                {(['all', 'pending', 'reviewed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setIssuesFilter(f); setIssuesPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      issuesFilter === f
                        ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25'
                        : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/15'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Revisados'}
                  </button>
                ))}
              </div>
              {issues && issues.pendingCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-yellow-400">
                  <Clock size={12} />
                  <span className="font-bold">{issues.pendingCount}</span> sin revisar
                </div>
              )}
            </div>

            {issuesLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-yellow-400" size={24} />
              </div>
            ) : !issues || issues.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CheckCircle2 size={32} className="text-green-500/40" />
                <p className="text-gray-500 text-sm">No hay problemas reportados{issuesFilter !== 'all' ? ' en este filtro' : ''}</p>
              </div>
            ) : (
              <>
                <table className="w-full text-left">
                  <thead className="bg-white/[0.02] border-b border-white/5">
                    <tr>
                      {['ID', 'Usuario', 'Rol', 'Descripción', 'Fecha', 'Estado'].map((h) => (
                        <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {issues.data.map((issue) => (
                      <tr key={issue.id} className={`hover:bg-white/[0.02] transition-colors ${!issue.isReviewed ? 'bg-yellow-500/[0.03]' : ''}`}>
                        <td className="p-4 text-gray-600 font-mono text-xs">#{issue.id}</td>
                        <td className="p-4">
                          <p className="text-white font-semibold text-sm">{issue.user.firstName} {issue.user.lastName}</p>
                          <p className="text-gray-600 text-xs mt-0.5">{issue.user.email}</p>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            issue.user.role === 'PROVEEDOR'
                              ? 'bg-blue-500/15 text-blue-400'
                              : 'bg-gray-500/15 text-gray-400'
                          }`}>
                            {issue.user.role === 'PROVEEDOR' ? 'Proveedor' : issue.user.role}
                          </span>
                        </td>
                        <td className="p-4 max-w-[280px]">
                          <p className="text-gray-300 text-sm line-clamp-2" title={issue.description}>
                            {issue.description}
                          </p>
                        </td>
                        <td className="p-4 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(issue.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4">
                          {issue.isReviewed ? (
                            <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
                              <CheckCircle2 size={13} /> Revisado
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMarkIssueReviewed(issue)}
                              disabled={markingIssueId === issue.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold hover:bg-yellow-500/20 transition-all disabled:opacity-50"
                            >
                              {markingIssueId === issue.id
                                ? <Loader2 size={11} className="animate-spin" />
                                : <Clock size={11} />}
                              Marcar revisado
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {issues.lastPage > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                    <p className="text-gray-600 text-xs">
                      Página {issues.page} de {issues.lastPage} · {issues.total} problemas
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIssuesPage((p) => Math.max(1, p - 1))}
                        disabled={issues.page === 1}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 transition-all disabled:opacity-30"
                      >Anterior</button>
                      <button
                        onClick={() => setIssuesPage((p) => Math.min(issues.lastPage, p + 1))}
                        disabled={issues.page === issues.lastPage}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 transition-all disabled:opacity-30"
                      >Siguiente</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
