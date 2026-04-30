'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  TrendingUp,
  ArrowUpRight,
  Lock,
  CheckCircle,
  Eye,
  MessageCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Analytics } from '@/lib/types';

const PREMIUM_PERKS = [
  'Visitas diarias y horarios pico',
  'Comparativa semana a semana',
  'Rendimiento de cada servicio',
  'Identifica tus clientes más frecuentes',
];

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
      <div className="space-y-6">
        <div className="skeleton h-9 w-48 rounded" />
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  // Upsell para plan Gratis
  if (!isPaid) {
    return (
      <div className="pb-20 md:pb-0 max-w-2xl mx-auto">
        <h1 data-reveal className="text-3xl font-extrabold text-text-primary mb-6">
          Estadísticas
        </h1>
        <div
          data-reveal="scale"
          className="relative bg-bg-card border border-white/5 rounded-2xl p-8 sm:p-10 text-center overflow-hidden gradient-border"
        >
          <div className="blob bg-primary/30 w-72 h-72 -top-20 -left-20 animate-float-slow" aria-hidden />

          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-glow-md">
              <Lock className="text-primary" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Estadísticas <span className="text-gradient">Exclusivas</span>
            </h2>
            <p className="text-text-secondary text-sm mb-7 max-w-md mx-auto">
              Desbloquea insights detallados con un Plan Estándar o Premium para
              tomar mejores decisiones para tu negocio.
            </p>
            <ul className="text-left space-y-3 mb-8 max-w-xs mx-auto">
              {PREMIUM_PERKS.map((perk, i) => (
                <li
                  key={perk}
                  className="flex items-center gap-2.5 text-text-secondary text-sm animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <CheckCircle className="text-green flex-shrink-0" size={16} />
                  {perk}
                </li>
              ))}
            </ul>
            <a
              href="/panel/ajustes"
              className="btn-primary press-effect inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm"
            >
              Ver planes
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-5xl">
      <div data-reveal className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary">Estadísticas</h1>
          <p className="text-text-secondary text-sm mt-1">
            Mide el rendimiento de tu perfil en tiempo real.
          </p>
        </div>
        {/* Period selector pill */}
        <div className="flex bg-bg-card border border-white/8 rounded-xl p-1 gap-1">
          {(['7', '30', '90'] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setRange(r); setLoading(true); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                range === r
                  ? 'bg-primary text-white shadow-glow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {r} días
            </button>
          ))}
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Eye}
          label="Total visitas"
          value={analytics?.totalViews ?? 0}
          color="text-primary"
          bg="bg-primary/10"
        />
        <SummaryCard
          icon={MessageCircle}
          label="WhatsApp"
          value={analytics?.totalWhatsappClicks ?? 0}
          color="text-green"
          bg="bg-green/10"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Llamadas"
          value={analytics?.totalCallClicks ?? 0}
          color="text-amber"
          bg="bg-amber/10"
        />
        <SummaryCard
          icon={CheckCircle}
          label="Reseñas"
          value={analytics?.totalReviews ?? 0}
          color="text-blue-400"
          bg="bg-blue-400/10"
        />
      </div>

      {/* Gráfico de área (visitas) */}
      <ChartCard title="Visitas al perfil" subtitle="Evolución diaria de tus visitas">
        {analytics?.dailyData ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analytics.dailyData}>
              <defs>
                <linearGradient id="visitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E07B39" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#E07B39" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} />
              <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(21, 25, 43, 0.95)',
                  border: '1px solid rgba(224,123,57,0.3)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                cursor={{ stroke: '#E07B39', strokeOpacity: 0.3 }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#E07B39"
                strokeWidth={2.5}
                fill="url(#visitsGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      {/* Gráfico de barras (contactos) */}
      <ChartCard
        title="Clics en WhatsApp vs Llamadas"
        subtitle="Compara los métodos de contacto preferidos por tus clientes"
      >
        {analytics?.dailyData ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} />
              <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(21, 25, 43, 0.95)',
                  border: '1px solid rgba(224,123,57,0.3)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                cursor={{ fill: 'rgba(224,123,57,0.06)' }}
              />
              <Bar dataKey="whatsapp" fill="#25D366" radius={[6, 6, 0, 0]} />
              <Bar dataKey="calls" fill="#E07B39" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  bg: string;
}) {
  return (
    <div data-reveal className="group bg-bg-card border border-white/5 rounded-2xl p-4 hover:border-primary/30 hover-lift transition-all duration-300">
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110`}>
        <Icon className={color} size={18} />
      </div>
      <p className="text-text-muted text-xs">{label}</p>
      <p className={`font-bold text-2xl tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <p className="text-text-muted text-xs mb-5">{subtitle}</p>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[260px] flex items-center justify-center">
      <p className="text-text-muted text-sm">Sin datos disponibles</p>
    </div>
  );
}
