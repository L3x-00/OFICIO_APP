'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
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
import { useProfileType } from '@/lib/profile-type-context';
import type { Analytics } from '@/lib/types';

const PREMIUM_PERKS = [
  'Visitas diarias y horarios pico',
  'Comparativa semana a semana',
  'Rendimiento de cada servicio',
  'Identifica tus clientes más frecuentes',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
  }
};

export default function PanelEstadisticasPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [range, setRange] = useState<'7' | '30' | '90'>('7');
  const { activeType } = useProfileType();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const prov = await api.getMyProfile(activeType ?? undefined);
        if (cancelled) return;
        const plan = prov.subscription?.plan || 'GRATIS';
        setIsPaid(plan === 'ESTANDAR' || plan === 'PREMIUM');
        if (plan !== 'GRATIS') {
          const stats = await api.getAnalyticsWithDays(Number(range), activeType ?? undefined);
          if (!cancelled) setAnalytics(stats);
        }
      } catch {
        if (!cancelled) toast.error('Error al cargar estadísticas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [range, activeType]);

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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pb-20 md:pb-0 max-w-2xl mx-auto"
      >
        <h1 className="text-3xl font-extrabold text-white font-display tracking-tightest mb-6">
          Estadísticas
        </h1>
        <div className="relative glass rounded-xl p-8 sm:p-10 text-center overflow-hidden border-primary/20 shadow-glow-lg gradient-border">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-md">
              <Lock className="text-primary-light" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white font-display mb-2">
              Estadísticas <span className="text-gradient">Exclusivas</span>
            </h2>
            <p className="text-white/60 text-sm mb-7 max-w-md mx-auto">
              Desbloquea insights detallados con un Plan Estándar o Premium para
              tomar mejores decisiones para tu negocio.
            </p>
            <ul className="text-left space-y-3 mb-8 max-w-xs mx-auto">
              {PREMIUM_PERKS.map((perk, i) => (
                <motion.li
                  key={perk}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-2.5 text-white/60 text-sm"
                >
                  <CheckCircle className="text-accent flex-shrink-0" size={16} />
                  {perk}
                </motion.li>
              ))}
            </ul>
            <a
              href="/panel/ajustes"
              className="btn btn-primary press-effect inline-flex items-center gap-2 px-7 py-3 font-semibold text-sm"
            >
              Ver planes
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-20 md:pb-0 max-w-5xl"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-display tracking-tightest">Estadísticas</h1>
          <p className="text-white/50 text-sm mt-1">
            Mide el rendimiento de tu perfil en tiempo real.
          </p>
        </div>
        {/* Period selector pill */}
        <div className="flex glass p-1 rounded-xl gap-1">
          {(['7', '30', '90'] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setRange(r); setLoading(true); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                range === r
                  ? 'bg-primary/15 text-primary-light shadow-glow-sm'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {r} días
            </button>
          ))}
        </div>
      </motion.div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Eye}
          label="Total visitas"
          value={analytics?.totalViews ?? 0}
          color="text-primary-light"
          bg="bg-primary/10"
        />
        <SummaryCard
          icon={MessageCircle}
          label="WhatsApp"
          value={analytics?.totalWhatsappClicks ?? 0}
          color="text-accent"
          bg="bg-accent/10"
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
          color="text-purple-400"
          bg="bg-purple-400/10"
        />
      </div>

      {/* Gráfico de área (visitas) */}
      <ChartCard title="Visitas al perfil" subtitle="Evolución diaria de tus visitas">
        {analytics?.dailyData ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analytics.dailyData}>
              <defs>
                <linearGradient id="visitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E07B39" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E07B39" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(10, 14, 26, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px 0 rgba(5, 6, 15, 0.5)',
                  color: '#fff',
                }}
                itemStyle={{ color: '#FFB347' }}
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
              <defs>
                <linearGradient id="colorWhatsapp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E07B39" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#E07B39" stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(10, 14, 26, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px 0 rgba(5, 6, 15, 0.5)',
                  color: '#fff',
                }}
                cursor={{ fill: 'rgba(224,123,57,0.06)' }}
              />
              <Bar dataKey="whatsapp" fill="url(#colorWhatsapp)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="calls" fill="url(#colorCalls)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>
    </motion.div>
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
    <motion.div variants={itemVariants} className="group glass glass-hover rounded-xl p-4 transition-all duration-300">
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110`}>
        <Icon className={color} size={18} />
      </div>
      <p className="text-white/40 text-xs">{label}</p>
      <p className={`font-extrabold text-2xl tabular-nums ${color}`}>{value}</p>
    </motion.div>
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
    <motion.div variants={itemVariants} className="glass rounded-xl p-6 hover:border-white/10 transition-colors">
      <h2 className="text-lg font-semibold text-white font-display flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary shadow-glow-sm" />
        {title}
      </h2>
      <p className="text-white/30 text-xs mb-5">{subtitle}</p>
      {children}
    </motion.div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[260px] flex items-center justify-center">
      <p className="text-white/30 text-sm">Sin datos disponibles</p>
    </div>
  );
}