'use client';

import { motion } from 'framer-motion';
import { Search, MessageCircle, Star } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Busca al experto que necesitas',
    desc: 'Filtra por categoría, ubicación y rating para encontrar al profesional ideal.',
  },
  {
    icon: MessageCircle,
    title: 'Contacta directamente',
    desc: 'Habla por WhatsApp o teléfono con el proveedor y acuerda los detalles.',
  },
  {
    icon: Star,
    title: 'Califica el servicio',
    desc: 'Deja tu reseña geolocalizada con GPS y ayuda a la comunidad.',
  },
];

// Variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 }
  }
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
  }
};

export default function HowItWorksSection() {
  return (
    <section id="como-funciona" className="relative py-24 sm:py-32 bg-dark-surface overflow-hidden">
      {/* Fondo sutil */}
      <div className="absolute inset-0 bg-radial-primary opacity-20 pointer-events-none" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">

        <motion.div 
          className="max-w-2xl mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <span className="eyebrow">Proceso simple</span>
          <h2 className="mt-3 font-display font-bold tracking-tightest text-white text-[34px] sm:text-[44px] leading-[1.1]">
            Tres pasos para encontrar
            <br className="hidden sm:block" /> al profesional ideal.
          </h2>
        </motion.div>

        {/* Steps Grid */}
        <motion.div 
          className="grid md:grid-cols-3 gap-x-10 gap-y-12 relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Línea conectora desktop — Efecto de luz de neón */}
          <div
            className="hidden md:block absolute top-7 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            aria-hidden
          />
          {/* Punto de luz central en la línea */}
          <div className="hidden md:block absolute top-[25px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-glow-sm" aria-hidden />

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              variants={itemVariants}
              className="relative group"
            >
              {/* Icono y Etiqueta */}
              <div className="relative z-10 mb-6 flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl glass border border-white/10 flex items-center justify-center transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-glow-sm">
                  <step.icon className="text-primary-light" size={22} strokeWidth={1.75} />
                </div>
                <span className="font-mono tabular-nums text-[12px] text-accent px-2 py-1 rounded-md border border-accent/20 bg-accent/10">
                  PASO 0{i + 1}
                </span>
              </div>

              <h3 className="font-display font-semibold text-white text-[20px] leading-snug mb-2 max-w-xs">
                {step.title}
              </h3>
              <p className="text-white/50 text-[14.5px] leading-relaxed max-w-xs">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}