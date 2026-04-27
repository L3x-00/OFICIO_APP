'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DailyData {
  date: string;
  views: number;
  whatsapp: number;
  calls: number;
}

interface Props {
  dailyData: DailyData[];
  rangeLabel: string;
}

export default function StatsCharts({ dailyData, rangeLabel }: Props) {
  if (!dailyData || dailyData.length === 0) {
    return (
      <p className="text-text-muted text-sm">Sin datos para mostrar.</p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Gráfico de línea: visitas */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Visitas al perfil ({rangeLabel})
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2235" />
            <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#15192B',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="views"
              stroke="#E07B39"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de barras: WhatsApp vs Llamadas */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Clics en WhatsApp vs Llamadas ({rangeLabel})
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2235" />
            <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#15192B',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="whatsapp" fill="#25D366" radius={[4, 4, 0, 0]} />
            <Bar dataKey="calls" fill="#E07B39" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}