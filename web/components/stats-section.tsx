'use client';

import { motion } from 'framer-motion';
import { useCountUp } from '@/lib/hooks';

const stats = [
  { target: 500,  suffix: '+', label: 'Profesionales registrados' },
  { target: 1200, suffix: '+', label: 'Reseñas verificadas' },
  { target: 5,    suffix: '+', label: 'Ciudades atendidas' },
  { target: 30,   suffix: '+', label: 'Categorías de servicio' },
];

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

function StatItem({ stat }: { stat: (typeof stats)[number] }) {
  const { ref, value } = useCountUp(stat.target, 1800);

  return (
    <motion.div 
      variants={itemVariants}
      className="glass glass-hover rounded-xl p-6 sm:p-8 relative overflow-hidden group"
    >
      {/* Indicador lateral luminoso (Naranja a Cian) */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary-light to-accent rounded-r-full shadow-glow-sm group-hover:w-1.5 transition-all duration-300" />
      
      <div className="pl-4 sm:pl-5">
        <div className="font-display tabular-nums text-3xl sm:text-4xl font-extrabold leading-none tracking-tightest">
          <span ref={ref} className="text-gradient">{value.toLocaleString('es-PE')}</span>
          <span className="text-primary-light">{stat.suffix}</span>
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