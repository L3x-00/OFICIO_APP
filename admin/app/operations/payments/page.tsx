import { AdminTabs } from '@/components/admin-tabs';
import YapePaymentsPage from '@/app/yape-payments/page';

export const dynamic = 'force-dynamic';

/**
 * Pantalla de Pagos (Yape).
 *
 * DEPRECADO (2026-07): el tab "Solicitudes de Plan" (PlanRequestsPage) se
 * retiró del panel — ese flujo activaba planes SIN comprobante ni monto,
 * sin auditoría (changedBy NULL) y con drift de fechas; ningún cliente
 * actual lo crea. Los flujos canónicos son Yape (manual con voucher,
 * precio server-side) y MercadoPago (webhook automático). La página
 * /plan-requests sigue existiendo por URL directa para consultar el
 * histórico; la tabla plan_requests se conserva.
 */
export default function OperationsPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pagos</h1>
        <p className="text-gray-400 text-sm mt-1">
          Aprueba los comprobantes de Yape — la activación por MercadoPago es automática.
        </p>
      </div>

      <AdminTabs
        tabs={[
          {
            key: 'yape',
            label: 'Pagos Yape',
            content: <YapePaymentsPage />,
          },
        ]}
      />
    </div>
  );
}
