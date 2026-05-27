'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Star, MapPin, LayoutGrid, type LucideIcon } from 'lucide-react';
import { useCountUp } from '@/lib/hooks';

// Cada stat lleva su propio "tono" (paleta + ícono). Mantiene el bar
// lateral como signature visual pero suma un ícono superior — antes
// eran 4 tarjetas idénticas indistinguibles.
type StatTone = 'primary' | 'amber' | 'accent' | 'magenta';

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
  { target: 5,    suffix: '+', label: 'Ciudades atendidas',        icon: MapPin,      tone: 'accent'  },
  { target: 30,   suffix: '+', label: 'Categorías de servicio',    icon: LayoutGrid,  tone: 'magenta' },
];

const TONE: Record<StatTone, { bg: string; ring: string; text: string; bar: string }> = {
  primary: { bg: 'bg-primary/10',       ring: 'border-primary/30',  text: 'text-primary-light', bar: 'from-primary via-primary-light to-accent' },
  amber:   { bg: 'bg-amber/10',         ring: 'border-amber/30',    text: 'text-amber',          bar: 'from-amber via-amber to-primary' },
  accent:  { bg: 'bg-accent/10',        ring: 'border-accent/30',   text: 'text-accent',         bar: 'from-accent via-accent to-primary' },
  magenta: { bg: 'bg-fuchsia-400/10',   ring: 'border-fuchsia-400/30', text: 'text-fuchsia-300', bar: 'from-fuchsia-400 via-primary to-amber' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 30, opacity: 0, scale: 0.95 },
  visible: { 
    y: 0, 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
  }
};

function StatItem({ stat }: { stat: StatDef }) {
  const { ref, value } = useCountUp(stat.target, 1800);
  const t = TONE[stat.tone];
  const Icon = stat.icon;

  return (
    <motion.div
      variants={itemVariants}
      className="glass glass-hover rounded-xl p-6 sm:p-8 relative overflow-hidden group"
    >
      {/* Bar lateral con gradiente específico por tono */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${t.bar} rounded-r-full shadow-glow-sm group-hover:w-1.5 transition-all duration-300`} />

      <div className="pl-4 sm:pl-5">
        {/* Icono superior: chip glass con borde de color, escala al hover */}
        <div
          className={`w-11 h-11 rounded-xl border ${t.ring} ${t.bg} flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-sm`}
        >
          <Icon className={t.text} size={20} strokeWidth={1.75} />
        </div>

        <div className="font-display tabular-nums text-3xl sm:text-4xl font-extrabold leading-none tracking-tightest">
          <span ref={ref} className="text-gradient">{value.toLocaleString('es-PE')}</span>
          <span className={t.text}>{stat.suffix}</span>
        </div>
        <div className="mt-3 text-white/50 text-[13.5px] sm:text-[14.5px] leading-snug max-w-[180px]">
          {stat.label}
        </div>
      </div>
    </motion.div>
  );
}

export default function StatsSection() {
  return (
    <section className="relative py-20 sm:py-24 bg-dark-surface overflow-hidden">
      {/* Fondo resplandeciente central sutil */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-5"
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