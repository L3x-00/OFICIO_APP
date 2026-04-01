import { getAnalytics } from '@/lib/api';
import { AnalyticsChart } from '@/components/analytics-chart';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  // Ahora TypeScript sabe que 'analytics' tiene la propiedad 'dailyClicks'
  const analytics = await getAnalytics(30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">
          Actividad de los últimos 30 días
        </p>
      </div>

      <div className="bg-[#15192B] rounded-2xl border border-white/5 p-6">
        <h2 className="text-base font-semibold text-white mb-4">
          Clics en WhatsApp y Llamadas
        </h2>
        {/* Usamos un fallback [] por seguridad */}
        <AnalyticsChart data={analytics?.dailyClicks || []} />
      </div>
    </div>
  );
}