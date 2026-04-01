'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DayData {
  date: string;
  whatsapp: number;
  calls: number;
}

interface Props {
  data: DayData[];
}

export function AnalyticsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No hay datos de actividad aún
      </div>
    );
  }

  // Formatear fechas para el eje X
  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="whatsappGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#25D366" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#25D366" stopOpacity={0}   />
          </linearGradient>
          <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00C6FF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00C6FF" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#15192B',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: '#fff',
          }}
        />
        <Legend
          wrapperStyle={{ color: '#9CA3AF', fontSize: '13px' }}
        />
        <Area
          type="monotone"
          dataKey="whatsapp"
          name="WhatsApp"
          stroke="#25D366"
          strokeWidth={2}
          fill="url(#whatsappGrad)"
        />
        <Area
          type="monotone"
          dataKey="calls"
          name="Llamadas"
          stroke="#00C6FF"
          strokeWidth={2}
          fill="url(#callsGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}