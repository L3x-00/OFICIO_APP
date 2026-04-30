'use client';

import { Users, Star, MapPin, Briefcase } from 'lucide-react';
import { useCountUp } from '@/lib/hooks';

const stats = [
  {
    icon: Users,
    target: 500,
    suffix: '+',
    label: 'Profesionales registrados',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Star,
    target: 1200,
    suffix: '+',
    label: 'Reseñas verificadas',
    color: 'text-amber',
    bg: 'bg-amber/10',
  },
  {
    icon: MapPin,
    target: 5,
    suffix: '+',
    label: 'Ciudades atendidas',
    color: 'text-green',
    bg: 'bg-green/10',
  },
  {
    icon: Briefcase,
    target: 30,
    suffix: '+',
    label: 'Categorías de servicio',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
];

function StatItem({ stat }: { stat: (typeof stats)[number] }) {
  const { ref, value } = useCountUp(stat.target, 1800);

  return (
    <div className="text-center group cursor-default">
      <div
        className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-sm ring-1 ring-white/5`}
      >
        <stat.icon size={24} className={stat.color} />
      </div>
      <div className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold ${stat.color} mb-1 tabular-nums`}>
        <span ref={ref}>{value.toLocaleString('es-PE')}</span>
        {stat.suffix}
      </div>
      <div className="text-text-muted text-xs sm:text-sm leading-snug">
        {stat.label}
      </div>
    </div>
  );
}

export default function StatsSection() {
  return (
    <section className="relative py-16 bg-bg-card/40 border-y border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.03] pointer-events-none" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {stats.map((stat, i) => (
            <div key={stat.label} data-reveal className={`reveal-delay-${i + 1}`}>
              <StatItem stat={stat} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
