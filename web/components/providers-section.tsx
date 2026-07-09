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
} from 'lucide-react';
import ProviderOnboardingForm from '@/components/onboarding/provider-onboarding-form';

// ── Variantes de animación (CORREGIDAS) ────────────────────
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

// ── Componente ─────────────────────────────────────────────
export default function ProvidersSection() {
  const router = useRouter();
  const benefits = [
    {
      icon: Settings,
      title: 'Control Total',
      description: 'Tú decides tus tarifas, tus horarios y qué trabajos aceptar.',
      color: 'primary',
    },
    {
      icon: Smartphone,
      title: 'Contacto Directo',
      description: 'Tu cliente te contacta directamente, sin intermediarios ni comisiones ocultas.',
      color: 'amber',
    },
    {
      icon: Star,
      title: 'Construye tu Reputación',
      description: 'Las reseñas verificadas te ayudan a destacar y ganar clientes fieles.',
      color: 'primary',
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
    <section className="relative py-20 sm:py-28 overflow-hidden bg-gray-50 dark:bg-dark-surface transition-colors duration-300">
      {/* ═══ Fondo decorativo ═══ */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-amber/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 grid-bg opacity-20" />
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
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-gray-900 dark:text-white">
            Para <span className="text-primary dark:text-primary-light">Proveedores</span>
          </h2>
          <p className="mt-3 text-gray-600 dark:text-white/60 text-lg sm:text-xl max-w-2xl mx-auto">
            Tu talento, tu negocio, tus reglas.
          </p>
          <p className="mt-2 text-gray-500 dark:text-white/40 max-w-xl mx-auto">
            Únete a cientos de profesionales que ya están creciendo en su ciudad con OficioApp.
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
            const bgColor = isPrimary ? 'bg-primary/10' : 'bg-amber/10';
            const textColor = isPrimary ? 'text-primary dark:text-primary-light' : 'text-amber';
            const borderColor = isPrimary ? 'border-primary/20' : 'border-amber/20';

            return (
              <motion.div
                key={benefit.title}
                variants={cardVariants}
                whileHover="hover"
                className="group relative"
              >
                <div className={`relative overflow-hidden rounded-2xl bg-white dark:bg-white/5 border ${borderColor} p-6 sm:p-8 transition-all duration-500 h-full hover:shadow-xl dark:hover:shadow-primary/5`}>
                  
                  {/* Número decorativo */}
                  <span className="absolute top-4 right-4 font-display font-extrabold text-6xl text-gray-100 dark:text-white/5 select-none pointer-events-none group-hover:scale-110 transition-transform duration-500">
                    {benefits.indexOf(benefit) + 1}
                  </span>

                  {/* Icono */}
                  <motion.div
                    variants={iconVariants}
                    whileHover="hover"
                    className={`w-14 h-14 rounded-xl ${bgColor} flex items-center justify-center mb-4`}
                  >
                    <Icon className={`${textColor} w-7 h-7`} strokeWidth={1.75} />
                  </motion.div>

                  {/* Título */}
                  <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white mb-2">
                    {benefit.title}
                  </h3>

                  {/* Descripción */}
                  <p className="text-gray-600 dark:text-white/60 text-sm leading-relaxed">
                    {benefit.description}
                  </p>

                  {/* Línea decorativa */}
                  <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${isPrimary ? 'from-primary to-primary/20' : 'from-amber to-amber/20'} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left w-full`} />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ═══ CTA + FORMULARIO DE REGISTRO (wizard) ═══ */}
        <motion.div
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent border border-primary/10 dark:border-primary/20 p-6 sm:p-8 lg:p-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 }}
        >
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12">
            {/* Texto */}
            <div className="flex-1 text-center lg:text-left lg:sticky lg:top-28">
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-gray-900 dark:text-white mb-3">
                ¿Listo para empezar?
              </h3>
              <p className="text-gray-600 dark:text-white/60 text-base sm:text-lg max-w-xl mx-auto lg:mx-0">
                Regístrate como profesional o negocio aquí mismo — en unos minutos
                tu perfil estará listo para recibir clientes.
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-6 justify-center lg:justify-start">
                <Link
                  href="/registrar-proveedor"
                  className="inline-flex items-center gap-2 text-gray-700 dark:text-white/70 hover:text-primary dark:hover:text-primary-light font-medium transition-colors group"
                >
                  <Users size={18} />
                  Prefiero el formulario completo
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Badge de disponibilidad */}
              <div className="flex items-center gap-3 mt-6 justify-center lg:justify-start">
                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/40">
                  <Smartphone size={16} className="text-primary dark:text-primary-light" />
                  Disponible en iOS y Android.
                </div>
                <span className="text-gray-300 dark:text-white/10">|</span>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Sin costos ocultos
                </span>
              </div>
            </div>

            {/* Wizard de registro — mismo formulario del móvil, por pasos.
                Panel SIEMPRE oscuro (los inputs del onboarding usan la paleta
                dark-glass); force-dark-zone lo protege de la inversión light. */}
            <div className="force-dark-zone w-full lg:max-w-xl flex-shrink-0 rounded-2xl bg-dark-surface border border-white/10 p-5 sm:p-7 shadow-2xl">
              <h4 className="font-display font-bold text-white text-lg mb-1">Registrarse como proveedor</h4>
              <p className="text-white/45 text-[13px] mb-5">Profesional o negocio — el mismo registro completo de la app.</p>
              <ProviderOnboardingForm variant="wizard" onDone={() => router.push('/panel')} />
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
                className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors duration-300 group cursor-default"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 text-primary dark:text-primary-light" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-800 dark:text-white">
                    {feature.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-white/40">
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