import { ReportsDashboard } from '@/components/reports-dashboard';

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reportes y Estadísticas</h1>
        <p className="text-gray-400 text-sm mt-1">
          Análisis de actividad, mejores proveedores y categorías más populares
        </p>
      </div>
      <ReportsDashboard />
    </div>
  );
}
