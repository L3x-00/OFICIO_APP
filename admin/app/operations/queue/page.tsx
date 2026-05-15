import { AdminTabs } from '@/components/admin-tabs';
import { VerificationQueue } from '@/components/verification-queue';
import TrustValidationPage from '@/app/trust-validation/page';

export const dynamic = 'force-dynamic';

/**
 * Pantalla unificada de Verificación + Validación de Confianza.
 * Cada tab reusa el componente original sin re-implementar nada — el
 * mismo backend y los mismos filtros existentes siguen vigentes.
 */
export default function OperationsQueuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Verificación y Validación</h1>
        <p className="text-gray-400 text-sm mt-1">
          Revisión de identidad y confianza de proveedores en un solo lugar.
        </p>
      </div>

      <AdminTabs
        tabs={[
          {
            key: 'verification',
            label: 'Verificación',
            content: <VerificationQueue />,
          },
          {
            key: 'trust',
            label: 'Validación de Confianza',
            content: <TrustValidationPage />,
          },
        ]}
      />
    </div>
  );
}
