import { AdminTabs } from '@/components/admin-tabs';
import YapePaymentsPage from '@/app/yape-payments/page';
import PlanRequestsPage from '@/app/plan-requests/page';

export const dynamic = 'force-dynamic';

/**
 * Pantalla unificada de Pagos Yape + Solicitudes de Plan.
 * Reusa los componentes-página originales. Cada tab conserva sus
 * filtros internos por estado (PENDIENTE / APROBADO / RECHAZADO).
 */
export default function OperationsPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pagos y Solicitudes</h1>
        <p className="text-gray-400 text-sm mt-1">
          Aprueba comprobantes de Yape y solicitudes de cambio de plan sin saltar entre páginas.
        </p>
      </div>

      <AdminTabs
        tabs={[
          {
            key: 'yape',
            label: 'Pagos Yape',
            content: <YapePaymentsPage />,
          },
          {
            key: 'plans',
            label: 'Solicitudes de Plan',
            content: <PlanRequestsPage />,
          },
        ]}
      />
    </div>
  );
}
