'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Star, MapPin, LayoutGrid, type LucideIcon } from 'lucide-react';
import { useCountUp } from '@/lib/hooks';

// Solo tonos de la paleta Servi: naranja y ámbar.
type StatTone = 'primary' | 'amber';

interface StatDef {
  target: number;
  suffix: string;
  label: string;
  icon: LucideIcon;
  tone: StatTone;
}

const stats: StatDef[] = [
  { target: 500,  suffix: '+', label: 'Profesionales registrados', icon: ShieldCheck, tone: 'primary' },
  { target: 1200, suffix: '+', label: 'Reseñas verificadas',       icon: Star,        tone: 'amber'   },
  { target: 5,    suffix: '+', label: 'Ciudades atendidas',        icon: MapPin,      tone: 'primary' },
  { target: 30,   suffix: '+', label: 'Categorías de servicio',    icon: LayoutGrid,  tone: 'amber'   },
];

const TONE: Record<StatTone, { text: string; bar: string; iconBg: string; iconText: string }> = {
  primary: {
    text: 'text-primary dark:text-primary-light',
    bar: 'bg-primary',
    iconBg: 'bg-primary/10',
    iconText: 'text-primary dark:text-primary-light',
  },
  amber: {
    text: 'text-amber',
    bar: 'bg-amber',
    iconBg: 'bg-amber/10',
    iconText: 'text-amber',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

function StatItem({ stat }: { stat: StatDef }) {
  const { ref, value } = useCountUp(stat.target, 1800);
  const t = TONE[stat.tone];
  const Icon = stat.icon;

  return (
    <motion.div
      variants={itemVariants}
      className="relative flex items-start gap-4 group"
    >
      {/* Barra lateral de color — detalle elegante sin recuadro */}
      <div
        className={`w-1 h-12 rounded-full ${t.bar} flex-shrink-0 mt-1 transition-all duration-300 group-hover:h-14`}
      />

      <div className="flex-1 min-w-0">
        {/* Icono + número en la misma línea */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <div className={`w-8 h-8 rounded-lg ${t.iconBg} flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110`}>
            <Icon className={t.iconText} size={16} strokeWidth={1.75} />
          </div>
          <span className="font-display tabular-nums text-3xl sm:text-4xl font-extrabold leading-none tracking-tightest text-gray-900 dark:text-white">
            <span ref={ref}>{value.toLocaleString('es-PE')}</span>
            <span className={t.text}>{stat.suffix}</span>
          </span>
        </div>

        {/* Label */}
        <p className="mt-2 text-sm text-gray-500 dark:text-white/50 leading-snug">
          {stat.label}
        </p>
      </div>
    </motion.div>
  );
}

export default function StatsSection() {
  return (
    <section className="relative py-12 sm:py-14 bg-white dark:bg-dark-surface overflow-hidden transition-colors duration-300">
      {/* Fondo sutil solo en oscuro */}
      <div className="absolute inset-0 pointer-events-none dark:block hidden" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {stats.map((stat) => (
            <StatItem key={stat.label} stat={stat} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}