'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import FlipCard3D from '@/components/flip-card-3d';
import Floating from '@/components/motion/floating';

// Variantes de animación para la cascada (Stagger)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
  }
};

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 sm:pt-28 min-h-[90vh] flex items-center bg-dark-premium">
      {/* Fondo Dark Premium con manchas luminosas (Blobs) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* Blob naranja principal */}
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-float-slow" />
        {/* Blob turquesa de confianza */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] animate-float" />
        {/* Patrón grid sutil oscuro */}
        <div className="absolute inset-0 grid-bg-night opacity-30" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-20 items-center">

          {/* Columna izquierda: copy con Framer Motion */}
          <motion.div 
            className="max-w-2xl"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="chip-eyebrow mb-7">
              <span className="dot" />
              Marketplace local · Perú
            </motion.div>

            {/* Títulos con opacidad 90/95 para que se adapten bien en tema claro */}
            <motion.h1 
              variants={itemVariants}
              className="font-display font-extrabold tracking-tightest text-white/95 leading-[1.05] text-[40px] sm:text-[56px] lg:text-[66px]"
            >
              Encuentra al{' '}
              <span className="text-gradient">
                profesional
              </span>{' '}
              <br className="hidden sm:block" />
              ideal en minutos.
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="mt-7 text-white/60 text-[17px] sm:text-[19px] leading-relaxed max-w-xl"
            >
              Conectamos a clientes con profesionales y negocios verificados de tu ciudad.
              Reseñas con GPS, pagos con Yape y soporte local en todo el Perú.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-9 flex flex-wrap items-center gap-3">
              <motion.span
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="inline-flex"
              >
                <Link href="/login" className="btn btn-primary btn-lg press-effect group">
                  Empezar gratis
                  <ArrowRight
                    size={18}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
              </motion.span>
              <motion.span
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="inline-flex"
              >
                <a href="https://play.google.com/store/apps/details?id=com.oficioapp.mobile" className="btn btn-ghost btn-lg press-effect">
                  Cómo funciona
                </a>
              </motion.span>
            </motion.div>

            {/* Trust strip con bordes y opacidades adaptativas */}
            <motion.div variants={itemVariants} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-white/40 text-[13px]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-accent" />
                <span>+500 profesionales verificados</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="peru-stripe">
                  <i /><i /><i />
                </span>
                <span>Hecho en el Perú</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Columna derecha: tarjeta 3D con envoltorio para tema claro */}
          <motion.div
            className="flex justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            {/* Contenedor wrapper para la tarjeta 3D.
                En tema oscuro mantiene los bordes oscuros de la tarjeta.
                En tema claro (definido en CSS) cambiará a bordes claros. */}
            <div className="hero-3d-wrapper">
              <Floating amplitude={8} duration={4}>
                <FlipCard3D />
              </Floating>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Línea divisoria final con degradado */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden />
    </section>
  );
}