'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Search, Star, type LucideIcon } from 'lucide-react';

// `icon` puede ser un componente Lucide o una ruta a un SVG propio
// (el ícono de WhatsApp viene de /public/images/social/whatsapp.svg).
type StepIcon = LucideIcon | string;

interface StepDef {
  icon: StepIcon;
  title: string;
  desc: string;
}

const steps: StepDef[] = [
  {
    icon: Search,
    title: 'Busca al experto que necesitas',
    desc: 'Filtra por categoría, ubicación y rating para encontrar al profesional ideal.',
  },
  {
    // SVG oficial de WhatsApp — el ícono Lucide MessageCircle se
    // confundía con "chat genérico" y no transmitía la marca.
    icon: '/images/social/whatsapp.svg',
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
          {/* Línea conectora dashed con gradiente — sustituye al
              "neón liso" para reforzar la idea de progreso paso a paso.
              SVG inline para controlar dashoffset; los círculos
              representan los pasos en la línea. */}
          <svg
            aria-hidden
            className="hidden md:block absolute top-7 left-[8%] right-[8%] h-px w-[84%] pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 100 1"
          >
            <defs>
              <linearGradient id="howitworks-line" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%"   stopColor="rgba(224,123,57,0)" />
                <stop offset="20%"  stopColor="rgba(224,123,57,0.55)" />
                <stop offset="80%"  stopColor="rgba(6,182,212,0.55)" />
                <stop offset="100%" stopColor="rgba(6,182,212,0)" />
              </linearGradient>
            </defs>
            <line
              x1="0" y1="0.5" x2="100" y2="0.5"
              stroke="url(#howitworks-line)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          </svg>

          {steps.map((step, i) => {
            const isSvg = typeof step.icon === 'string';
            const IconComp = !isSvg ? (step.icon as LucideIcon) : null;
            const stepNum = `0${i + 1}`;
            return (
              <motion.div
                key={step.title}
                variants={itemVariants}
                className="relative group"
              >
                {/* Número grande de fondo — semitransparente, decorativo.
                    Sale del flujo con `absolute` y `pointer-events-none`
                    para no interferir con el click ni con el layout. */}
                <span
                  aria-hidden
                  className="absolute -top-6 -left-2 font-display font-extrabold text-[112px] leading-none text-white/[0.04] select-none pointer-events-none group-hover:text-primary/[0.08] transition-colors duration-500"
                >
                  {stepNum}
                </span>

                {/* Icono + chip de paso */}
                <div className="relative z-10 mb-6 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl glass border border-white/10 flex items-center justify-center transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-glow-sm">
                    {isSvg ? (
                      <Image
                        src={step.icon as string}
                        alt=""
                        width={24}
                        height={24}
                        className="opacity-95"
                      />
                    ) : (
                      IconComp && <IconComp className="text-primary-light" size={22} strokeWidth={1.75} />
                    )}
                  </div>
                  <span className="font-mono tabular-nums text-[12px] text-accent px-2 py-1 rounded-md border border-accent/20 bg-accent/10">
                    PASO {stepNum}
                  </span>
                </div>

                <h3 className="relative z-10 font-display font-semibold text-white text-[20px] leading-snug mb-2 max-w-xs">
                  {step.title}
                </h3>
                <p className="relative z-10 text-white/50 text-[14.5px] leading-relaxed max-w-xs">
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}