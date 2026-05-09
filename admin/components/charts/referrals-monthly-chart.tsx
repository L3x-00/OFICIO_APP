'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  data: Array<{ month: string; count: number }>;
}

/**
 * Gráfico de invitaciones por mes para la página `/referrals`.
 * Aislado en su propio módulo para que `next/dynamic` con `ssr: false`
 * impida que Recharts entre en el bundle inicial del admin.
 */
export default function ReferralsMonthlyChart({ data }: Props) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E07B39" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#E07B39" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" stroke="#6B7280" fontSize={11} tickLine={false} />
          <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: 'rgba(21,25,43,0.95)',
              border: '1px solid rgba(224,123,57,0.3)',
              borderRadius: '10px',
              fontSize: '12px',
            }}
            cursor={{ stroke: '#E07B39', strokeOpacity: 0.3 }}
          />
          <Area type="monotone" dataKey="count" stroke="#E07B39" strokeWidth={2.5} fill="url(#invGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
