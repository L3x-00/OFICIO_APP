"use client"; // <--- ESTO ES VITAL

import { useEffect, useState } from 'react';
import { getAnalytics, AnalyticsResponse } from '@/lib/api';
// Importa tus componentes de gráficos o tablas aquí

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await getAnalytics(30);
        setData(result);
      } catch (err: any) {
        console.error("Fallo en analytics:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="p-8">Cargando estadísticas...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-8">No hay datos disponibles</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Panel de Analíticas</h1>
      {/* Aquí renderizas tus gráficas usando el objeto 'data' */}
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(data.dailyClicks, null, 2)}
      </pre>
    </div>
  );
}