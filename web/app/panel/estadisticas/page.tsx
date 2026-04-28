'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  Lock,
} from 'lucide-react';
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
import type { Analytics } from '@/lib/types';

export default function PanelEstadisticasPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [range, setRange] = useState<'7' | '30' | '90'>('7');

  useEffect(() => {
    async function load() {
      try {
        const prov = await api.getMyProfile();
        const plan = prov.subscription?.plan || 'GRATIS';
        setIsPaid(plan === 'ESTANDAR' || plan === 'PREMIUM');
        if (plan !== 'GRATIS') {
          const stats = await api.getAnalyticsWithDays(Number(range));
          setAnalytics(stats);
        }
      } catch {
        toast.error('Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Upsell si es plan Gratis
  if (!isPaid) {
    return (
      <div className="pb-20 md:pb-0">
        <h1 className="text-2xl font-bold text-text-primary mb-6">
          Estadísticas
        </h1>
        <div className="bg-bg-card border border-white/5 rounded-card p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-text-muted/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-text-muted" size={28} />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Desbloquea Estadísticas
          </h2>
          <p className="text-text-secondary mb-6">
            Necesitas un plan Estándar o Premium para acceder a tus
            métricas.
          </p>
          <div className="text-left space-y-3 mb-6">
            {[
              'Ve tus visitas diarias',
              'Compara semanas',
              'Identifica tus horarios pico',
              'Mide tu crecimiento',
            ].map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-2 text-text-secondary text-sm"
              >
                <TrendingUp className="text-primary" size={16} />
                {benefit}
              </div>
            ))}
          </div>
          <a
            href="/panel/ajustes"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-button font-semibold text-sm transition-colors"
          >
            Ver planes <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          Estadísticas
        </h1>
        <div className="flex gap-2">
          {(['7', '30', '90'] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setRange(r); setLoading(true); }}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-primary text-white'
                  : 'bg-bg-input text-text-muted hover:text-text-secondary'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico de línea */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Visitas al perfil
        </h2>
        {analytics?.dailyData ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics.dailyData}>
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
        ) : (
          <p className="text-text-muted text-sm">Sin datos</p>
        )}
      </div>

      {/* Gráfico de barras */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Clics en WhatsApp vs Llamadas
        </h2>
        {analytics?.dailyData ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.dailyData}>
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
        ) : (
          <p className="text-text-muted text-sm">Sin datos</p>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-card border border-white/5 rounded-card p-4">
          <p className="text-text-muted text-xs">Total reseñas</p>
          <p className="text-text-primary font-bold text-xl">
            {analytics?.totalReviews ?? 0}
          </p>
        </div>
        <div className="bg-bg-card border border-white/5 rounded-card p-4">
          <p className="text-text-muted text-xs">Rating promedio</p>
          <p className="text-text-primary font-bold text-xl">
            {analytics?.totalReviews ? '4.5' : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}