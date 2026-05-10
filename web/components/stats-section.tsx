'use client';

import { useCountUp } from '@/lib/hooks';

const stats = [
  { target: 500,  suffix: '+', label: 'Profesionales registrados' },
  { target: 1200, suffix: '+', label: 'Reseñas verificadas' },
  { target: 5,    suffix: '+', label: 'Ciudades atendidas' },
  { target: 30,   suffix: '+', label: 'Categorías de servicio' },
];

function StatItem({ stat, index }: { stat: (typeof stats)[number]; index: number }) {
  const { ref, value } = useCountUp(stat.target, 1800);

  return (
    <div
      data-reveal
      className={`reveal-delay-${index + 1} relative pl-6 sm:pl-7`}
    >
      <span
        className="absolute left-0 top-1.5 bottom-1.5 w-px bg-line-2"
        aria-hidden
      />
      <div className="font-display tabular-nums text-4xl sm:text-5xl font-bold text-ink leading-none tracking-tightest">
        <span ref={ref}>{value.toLocaleString('es-PE')}</span>
        <span className="text-orange-3 text-primary-darker">{stat.suffix}</span>
      </div>
      <div className="mt-3 text-ink-3 text-[13.5px] leading-snug max-w-[160px]">
        {stat.label}
      </div>
    </div>
  );
}

export default function StatsSection() {
  return (
    <section className="relative bg-surface border-y border-line">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-14 sm:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
          {stats.map((stat, i) => (
            <StatItem key={stat.label} stat={stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
