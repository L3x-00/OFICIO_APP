'use client';

import { useEffect, useState, useCallback } from 'react';
import { getYapePayments, approveYapePayment, rejectYapePayment } from '@/lib/api';
import { toast } from 'sonner';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import { CheckCircle, XCircle, Clock, Wallet, ChevronDown, ExternalLink, Image } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING:  { label: 'Pendiente',  color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30',  icon: Clock },
  APPROVED: { label: 'Aprobado',   color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',  icon: CheckCircle },
  REJECTED: { label: 'Rechazado',  color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',      icon: XCircle },
};

const PLAN_COLORS: Record<string, string> = {
  PREMIUM:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  ESTANDAR: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  BASICO:   'text-blue-400 bg-blue-400/10 border-blue-400/30',
};

export default function YapePaymentsPage() {
  const [payments, setPayments]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('PENDING');
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [imgModal, setImgModal]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getYapePayments(filter === 'ALL' ? undefined : filter);
      setPayments(data ?? []);
    } catch {
      toast.error('Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useAdminSocket(payload => {
    if (payload.type === 'NEW_YAPE_PAYMENT') {
      load();
      toast('Nuevo pago Yape recibido', {
        description: `Plan ${payload.body}`,
        duration: 5000,
      });
    }
  });

  const handleApprove = async (id: number) => {
    try {
      await approveYapePayment(id);
      toast.success('Plan activado correctamente');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al aprobar');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectYapePayment(id, rejectReason || undefined);
      toast.success('Pago rechazado');
      setRejectingId(null);
      setRejectReason('');
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al rechazar');
    }
  };

  const pendingCount = payments.filter(p => p.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-purple-400" />
            Pagos por Yape
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Valida los comprobantes de pago enviados por los proveedores
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-sm font-bold px-3 py-1.5 rounded-full">
            {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(s => (
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
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay pagos {filter !== 'ALL' ? STATUS_CONFIG[filter]?.label?.toLowerCase() : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(pmt => {
            const sc      = STATUS_CONFIG[pmt.status] ?? STATUS_CONFIG.PENDING;
            const StatusIcon = sc.icon;
            const planCls = PLAN_COLORS[pmt.plan] ?? '';
            const isPending = pmt.status === 'PENDING';
            const provider  = pmt.provider;

            return (
              <div
                key={pmt.id}
                className="bg-surface-1 border border-white/10 rounded-2xl p-5 flex flex-col gap-4"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold truncate">
                        {provider?.businessName}
                      </span>
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                        {provider?.type === 'NEGOCIO' ? 'Negocio' : 'Profesional'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {provider?.user?.firstName} {provider?.user?.lastName}
                      {' · '}{provider?.user?.email}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Plan actual:{' '}
                      <span className="text-gray-300">
                        {provider?.subscription?.plan ?? 'GRATIS'}
                      </span>
                      {' · '}
                      {new Date(pmt.createdAt).toLocaleDateString('es-PE', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Plan + monto + status */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${planCls}`}>
                      {pmt.plan}
                    </span>
                    <span className="text-white font-black text-xl">
                      S/ {Number(pmt.amount).toFixed(2)}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${sc.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {sc.label}
                    </span>
                  </div>
                </div>

                {/* Voucher + código */}
                <div className="flex gap-3 items-start flex-wrap">
                  {/* Imagen del voucher */}
                  <button
                    onClick={() => setImgModal(pmt.voucherUrl)}
                    className="relative group w-20 h-20 rounded-xl overflow-hidden border border-white/10 hover:border-purple-400/50 transition-all flex-shrink-0"
                  >
                    <img
                      src={pmt.voucherUrl}
                      alt="Voucher"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                  </button>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">Código verificación:</span>
                      <span className="text-white font-mono font-bold text-lg tracking-widest bg-white/5 px-3 py-0.5 rounded-lg border border-white/10">
                        {pmt.verificationCode}
                      </span>
                    </div>
                    {pmt.note && (
                      <p className="text-gray-400 text-xs bg-white/3 px-3 py-1.5 rounded-lg border border-white/5">
                        <span className="text-gray-500">Nota: </span>
                        {pmt.note}
                      </p>
                    )}
                    {pmt.rejectionReason && (
                      <p className="text-red-400 text-xs">
                        Motivo rechazo: {pmt.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones (solo PENDING) */}
                {isPending && (
                  <div className="flex gap-2 flex-wrap border-t border-white/5 pt-3">
                    <button
                      onClick={() => handleApprove(pmt.id)}
                      className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprobar y activar plan
                    </button>
                    <button
                      onClick={() => setRejectingId(rejectingId === pmt.id ? null : pmt.id)}
                      className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rejectingId === pmt.id ? 'rotate-180' : ''}`} />
                    </button>

                    {rejectingId === pmt.id && (
                      <div className="w-full flex gap-2 mt-1">
                        <input
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Motivo del rechazo (opcional)..."
                          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                        />
                        <button
                          onClick={() => handleReject(pmt.id)}
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

      {/* Modal imagen voucher */}
      {imgModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setImgModal(null)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setImgModal(null)}
              className="absolute -top-10 right-0 text-white/60 hover:text-white text-sm"
            >
              Cerrar ✕
            </button>
            <img
              src={imgModal}
              alt="Voucher ampliado"
              className="w-full rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
