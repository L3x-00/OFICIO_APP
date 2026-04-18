'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPlanRequests, approvePlanRequest, rejectPlanRequest } from '@/lib/api';
import { toast } from 'sonner';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import { CheckCircle, XCircle, Clock, CreditCard, ChevronDown } from 'lucide-react';

const PLAN_COLORS: Record<string, string> = {
  ESTANDAR: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  PREMIUM:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  GRATIS:   'text-gray-400 bg-gray-400/10 border-gray-400/30',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDIENTE: { label: 'Pendiente',  color: 'text-amber-400',  icon: Clock },
  APROBADO:  { label: 'Aprobado',   color: 'text-green-400',  icon: CheckCircle },
  RECHAZADO: { label: 'Rechazado',  color: 'text-red-400',    icon: XCircle },
  CANCELADO: { label: 'Cancelado',  color: 'text-gray-500',   icon: XCircle },
};

export default function PlanRequestsPage() {
  const [requests, setRequests]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('PENDIENTE');
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPlanRequests(filter === 'ALL' ? undefined : filter);
      setRequests(data ?? []);
    } catch {
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  // Recargar automáticamente cuando llega una nueva solicitud de plan en tiempo real
  const onSocketEvent = useCallback(() => { load(); }, [filter]);
  useAdminSocket(payload => {
    if (payload.type === 'NEW_PLAN_REQUEST') onSocketEvent();
  });

  const handleApprove = async (id: number) => {
    try {
      await approvePlanRequest(id);
      toast.success('Plan aprobado y activado');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al aprobar');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectPlanRequest(id, rejectReason || undefined);
      toast.success('Solicitud rechazada');
      setRejectingId(null);
      setRejectReason('');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al rechazar');
    }
  };

  const pendingCount = requests.filter(r => r.status === 'PENDIENTE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-yellow-400" />
            Solicitudes de Plan
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestiona las solicitudes de upgrade de plan de los proveedores
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-bold px-3 py-1.5 rounded-full">
            {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {['PENDIENTE', 'APROBADO', 'RECHAZADO', 'ALL'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              filter === s
                ? 'bg-white/10 border-white/30 text-white'
                : 'border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            {s === 'ALL' ? 'Todos' : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Cargando...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay solicitudes {filter !== 'ALL' ? STATUS_CONFIG[filter]?.label?.toLowerCase() : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const sc = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDIENTE;
            const StatusIcon = sc.icon;
            const planCls = PLAN_COLORS[req.plan] ?? PLAN_COLORS.GRATIS;
            const isPending = req.status === 'PENDIENTE';

            return (
              <div
                key={req.id}
                className="bg-surface-1 border border-white/10 rounded-2xl p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Info proveedor */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold truncate">
                        {req.provider?.businessName}
                      </span>
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                        {req.provider?.type === 'NEGOCIO' ? 'Negocio' : 'Profesional'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {req.provider?.user?.firstName} {req.provider?.user?.lastName}
                      {' · '}{req.provider?.user?.email}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Plan actual: <span className="text-gray-300">{req.provider?.subscription?.plan ?? 'GRATIS'}</span>
                      {' · '}Solicitado: {new Date(req.createdAt).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })}
                    </p>
                    {req.reason && (
                      <p className="text-red-400 text-xs mt-1">Motivo rechazo: {req.reason}</p>
                    )}
                  </div>

                  {/* Plan badge + status */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${planCls}`}>
                      {req.plan}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${sc.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {sc.label}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                {isPending && (
                  <div className="flex gap-2 flex-wrap border-t border-white/5 pt-3">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => setRejectingId(rejectingId === req.id ? null : req.id)}
                      className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rejectingId === req.id ? 'rotate-180' : ''}`} />
                    </button>

                    {rejectingId === req.id && (
                      <div className="w-full flex gap-2 mt-1">
                        <input
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Motivo del rechazo (opcional)..."
                          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                        />
                        <button
                          onClick={() => handleReject(req.id)}
                          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                        >
                          Confirmar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
