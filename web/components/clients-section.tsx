'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Search,
  ShieldCheck,
  MessageCircle,
  MapPin,
  Wallet,
  Star,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

// ── Variantes de animación (espejo de providers-section) ────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const cardVariants = {
  hidden: { y: 40, opacity: 0, scale: 0.95 },
  visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
  hover: { y: -8, scale: 1.02, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

const iconVariants = {
  hover: { scale: 1.15, rotate: -5, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

// ── Componente ─────────────────────────────────────────────
export default function ClientsSection({ embedded = false }: { embedded?: boolean } = {}) {
  const benefits = [
    {
      icon: Search,
      title: 'Encuéntralo rápido',
      description: 'Filtra por categoría y ubicación y compara profesionales cerca de ti en segundos.',
      color: 'accent' as const,
    },
    {
      icon: ShieldCheck,
      title: 'Perfiles verificados',
      description: 'Validamos identidad y credenciales. Las reseñas reales te ayudan a elegir con confianza.',
      color: 'primary' as const,
    },
    {
      icon: MessageCircle,
      title: 'Contacto directo',
      description: 'Escribe o llama al proveedor sin intermediarios ni comisiones ocultas.',
      color: 'accent' as const,
    },
  ];

  const features = [
    {
      icon: MapPin,
      title: 'Cerca de ti',
      description: 'Resultados por tu ubicación o por distrito.',
    },
    {
      icon: Wallet,
      title: 'Gratis para clientes',
      description: 'Buscar y contactar no te cuesta nada.',
    },
    {
      icon: Star,
      title: 'Reseñas reales',
      description: 'Opiniones verificadas de otros clientes.',
    },
  ];

  return (
    <section className={`relative overflow-hidden bg-background dark:bg-dark-surface transition-colors duration-300 ${embedded ? 'pt-8 pb-20 sm:pt-10 sm:pb-28' : 'py-20 sm:py-28'}`}>
      {/* ═══ Fondo decorativo ═══ */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[-15%] left-[-8%] w-[450px] h-[450px] bg-accent/5 dark:bg-accent/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-8%] w-[380px] h-[380px] bg-primary/5 dark:bg-primary/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        {/* ═══ HEADER ═══ */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground">
            Para <span className="text-accent">Clientes</span>
          </h2>
          <p className="mt-3 text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto">
            El servicio que necesitas, cerca de ti.
          </p>
          <p className="mt-2 text-muted-foreground/60 max-w-xl mx-auto">
            Electricistas, gasfiteros, abogados, restaurantes y más — verificados y con reseñas reales.
          </p>
        </motion.div>

        {/* ═══ BENEFICIOS (3 tarjetas) ═══ */}
        <motion.div
          className="grid md:grid-cols-3 gap-6 mb-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            const isAccent = benefit.color === 'accent';

            const iconBg = isAccent ? 'bg-accent/10 dark:bg-accent/15' : 'bg-primary/10 dark:bg-primary/15';
            const iconColor = isAccent ? 'text-accent' : 'text-primary';
            const borderColor = isAccent ? 'border-accent/15 dark:border-accent/20' : 'border-primary/15 dark:border-primary/20';
            const hoverShadow = isAccent
              ? 'hover:shadow-lg hover:shadow-accent/5 dark:hover:shadow-accent/10'
              : 'hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10';
            const gradientLine = isAccent ? 'from-accent to-accent/20' : 'from-primary to-primary/20';

            return (
              <motion.div key={benefit.title} variants={cardVariants} whileHover="hover" className="group relative">
                <div className={`relative overflow-hidden rounded-2xl bg-card border ${borderColor} p-6 sm:p-8 transition-all duration-500 h-full ${hoverShadow}`}>
                  <span className="absolute top-4 right-4 font-display font-extrabold text-6xl text-muted/10 dark:text-muted/10 select-none pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    {benefits.indexOf(benefit) + 1}
                  </span>

                  <motion.div
                    variants={iconVariants}
                    whileHover="hover"
                    className={`w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center mb-4`}
                  >
                    <Icon className={`${iconColor} w-7 h-7`} strokeWidth={1.75} />
                  </motion.div>

                  <h3 className="font-display font-bold text-xl text-foreground mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>

                  <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${gradientLine} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left w-full`} />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ═══ CTA — buscar servicios ═══ */}
        <motion.div
          className="relative rounded-3xl overflow-hidden bg-accent/5 dark:bg-accent/10 border border-accent/10 dark:border-accent/15 p-6 sm:p-8 lg:p-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 }}
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
            <div className="flex-1">
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-3">
                ¿Necesitas un servicio?
              </h3>
              <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto lg:mx-0">
                Explora proveedores verificados en tu ciudad y contáctalos directamente. Sin registro obligatorio.
              </p>

              <div className="flex items-center gap-3 mt-6 justify-center lg:justify-start">
                <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/70">
                  <Sparkles size={16} className="text-accent" />
                  Cientos de profesionales cerca de ti.
                </div>
              </div>
            </div>

            <Link
              href="/buscar"
              className="btn btn-primary btn-lg inline-flex items-center gap-2 whitespace-nowrap px-7 group"
            >
              <Search size={18} />
              Explorar servicios
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>

        {/* ═══ FEATURES (3 características) ═══ */}
        <motion.div
          className="grid sm:grid-cols-3 gap-4 mt-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="flex items-center gap-3 p-4 rounded-xl bg-card/50 dark:bg-card/30 hover:bg-card dark:hover:bg-card/50 transition-colors duration-300 group cursor-default border border-transparent hover:border-border"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
