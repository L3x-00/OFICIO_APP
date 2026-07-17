'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Star,
  ArrowRight,
  Smartphone,
  Users,
  Settings,
  CheckCircle,
  Crown,
} from 'lucide-react';
import ProviderOnboardingForm from '@/components/onboarding/provider-onboarding-form';

// ── Variantes de animación ─────────────────────────────────
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
  visible: {
    y: 0,
    opacity: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const cardVariants = {
  hidden: { y: 40, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  hover: {
    y: -8,
    scale: 1.02,
    transition: { 
      duration: 0.3, 
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const iconVariants = {
  hover: {
    scale: 1.15,
    rotate: 5,
    transition: { 
      duration: 0.3, 
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

// ── Nueva paleta suave (Tailwind-safe) ──────────────────────
// Primario:     azul medianoche apagado  → #5B7FFF  (tailwind: blue-400/indigo-400)
// Acento:       dorado tostado cálido    → #C4A35A  (tailwind: amber-500/600 suave)
// Disponible:   verde salvia             → #5B9A6B  (tailwind: green-500/600)
// Ocupado:      rojo teja apagado        → #C4605E  (tailwind: red-400)
// Con demora:   naranja tostado          → #C48A50  (tailwind: orange-400)
// Verificado:   azul polvoriento         → #6B9FD4  (tailwind: blue-400)
// Favorito:     rosa apagado             → #D4687A  (tailwind: pink-400)
// Estrella:     dorado suave             → #D4B860  (tailwind: yellow-500)

// ── Componente ─────────────────────────────────────────────
export default function ProvidersSection() {
  const router = useRouter();

  const benefits = [
    {
      icon: Settings,
      title: 'Control Total',
      description: 'Tú decides tus tarifas, tus horarios y qué trabajos aceptar.',
      color: 'primary' as const,
    },
    {
      icon: Smartphone,
      title: 'Contacto Directo',
      description: 'Tu cliente te contacta directamente, sin intermediarios ni comisiones ocultas.',
      color: 'accent' as const,
    },
    {
      icon: Crown,
      title: 'Construye tu Reputación',
      description: 'Las reseñas verificadas te ayudan a destacar y ganar clientes fieles.',
      color: 'primary' as const,
    },
  ];

  const features = [
    {
      icon: ShieldCheck,
      title: 'Profesionales verificados',
      description: 'Validamos identidad y documentos para mayor confianza.',
    },
    {
      icon: Users,
      title: 'Comunidad en crecimiento',
      description: 'Únete a cientos de profesionales que ya confían en nosotros.',
    },
    {
      icon: CheckCircle,
      title: 'Sin costos ocultos',
      description: 'Lo que ves es lo que pagas. Transparencia total.',
    },
  ];

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-background dark:bg-dark-surface transition-colors duration-300">
      {/* ═══ Fondo decorativo (nuevos colores suaves) ═══ */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* Mancha primaria — azul apagado */}
        <div className="absolute top-[-15%] right-[-8%] w-[450px] h-[450px] bg-primary/5 dark:bg-primary/8 rounded-full blur-[120px]" />
        {/* Mancha acento — dorado tostado */}
        <div className="absolute bottom-[-15%] left-[-8%] w-[380px] h-[380px] bg-accent/5 dark:bg-accent/8 rounded-full blur-[100px]" />
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
            Para <span className="text-primary">Proveedores</span>
          </h2>
          <p className="mt-3 text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto">
            Tu talento, tu negocio, tus reglas.
          </p>
          <p className="mt-2 text-muted-foreground/60 max-w-xl mx-auto">
            Únete a cientos de profesionales que ya están creciendo en su ciudad con Servi.
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
            const isPrimary = benefit.color === 'primary';

            // Colores suaves de la nueva paleta
            const iconBg = isPrimary
              ? 'bg-primary/10 dark:bg-primary/15'
              : 'bg-accent/10 dark:bg-accent/15';
            const iconColor = isPrimary
              ? 'text-primary'
              : 'text-accent';
            const borderColor = isPrimary
              ? 'border-primary/15 dark:border-primary/20'
              : 'border-accent/15 dark:border-accent/20';
            const hoverShadow = isPrimary
              ? 'hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10'
              : 'hover:shadow-lg hover:shadow-accent/5 dark:hover:shadow-accent/10';
            const gradientLine = isPrimary
              ? 'from-primary to-primary/20'
              : 'from-accent to-accent/20';

            return (
              <motion.div
                key={benefit.title}
                variants={cardVariants}
                whileHover="hover"
                className="group relative"
              >
                <div className={`relative overflow-hidden rounded-2xl bg-card border ${borderColor} p-6 sm:p-8 transition-all duration-500 h-full ${hoverShadow}`}>
                  
                  {/* Número decorativo */}
                  <span className="absolute top-4 right-4 font-display font-extrabold text-6xl text-muted/10 dark:text-muted/10 select-none pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    {benefits.indexOf(benefit) + 1}
                  </span>

                  {/* Icono */}
                  <motion.div
                    variants={iconVariants}
                    whileHover="hover"
                    className={`w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center mb-4`}
                  >
                    <Icon className={`${iconColor} w-7 h-7`} strokeWidth={1.75} />
                  </motion.div>

                  {/* Título */}
                  <h3 className="font-display font-bold text-xl text-foreground mb-2">
                    {benefit.title}
                  </h3>

                  {/* Descripción */}
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {benefit.description}
                  </p>

                  {/* Línea decorativa inferior */}
                  <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${gradientLine} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left w-full`} />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ═══ CTA + FORMULARIO DE REGISTRO (wizard) ═══ */}
        <motion.div
          className="relative rounded-3xl overflow-hidden bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/15 p-6 sm:p-8 lg:p-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 }}
        >
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12">
            {/* Texto */}
            <div className="flex-1 text-center lg:text-left lg:sticky lg:top-28">
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-3">
                ¿Listo para empezar?
              </h3>
              <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto lg:mx-0">
                Regístrate como profesional o negocio aquí mismo — en unos minutos
                tu perfil estará listo para recibir clientes.
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-6 justify-center lg:justify-start">
                <Link
                  href="/registrar-proveedor"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-medium transition-colors group"
                >
                  <Users size={18} />
                  Prefiero el formulario completo
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Badge de disponibilidad */}
              <div className="flex items-center gap-3 mt-6 justify-center lg:justify-start">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
                  <Smartphone size={16} className="text-primary" />
                  Disponible en iOS y Android.
                </div>
                <span className="text-border">|</span>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Sin costos ocultos
                </span>
              </div>
            </div>

            {/* ── Formulario de registro ──────────────────
                AHORA se adapta al tema (hereda bg-card, text-foreground, etc.).
                Eliminado el parche force-dark-zone.
                El formulario interno (ProviderOnboardingForm) debe usar las
                mismas clases semánticas del tema para que el cambio
                claro/oscuro funcione. */}
            <div className="w-full lg:max-w-xl flex-shrink-0 rounded-2xl bg-card border border-border p-5 sm:p-7 shadow-lg dark:shadow-2xl">
              <h4 className="font-display font-bold text-foreground text-lg mb-1">
                Registrarse como proveedor
              </h4>
              <p className="text-muted-foreground text-[13px] mb-5">
                Profesional o negocio — el mismo registro completo de la app.
              </p>
              <ProviderOnboardingForm
                variant="wizard"
                onDone={() => router.push('/panel')}
              />
            </div>
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
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">
                    {feature.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
