'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Eye, Users, ShieldCheck, MapPin, TrendingUp } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Mapa actualizado para el tema Dark Premium (colores brillantes sobre cristal oscuro)
const ACCENT = {
  orange: { bg: 'bg-primary/10', text: 'text-primary-light', border: 'border-primary/20' },
  blue:   { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  green:  { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/20' }, // Cian de confianza
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  rose:   { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  amber:  { bg: 'bg-amber/10', text: 'text-amber', border: 'border-amber/20' },
} as const;

const REFERRALS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_REFERIDOS === 'true';

const ABOUT_SECTIONS = [
  {
    title: 'Nuestra Misión',
    desc: 'Conectar a profesionales y negocios verificados con clientes reales en ciudades intermedias del Perú, donde antes no existía una plataforma formal y segura para contratar servicios locales.',
    icon: Target,
    accent: 'orange' as keyof typeof ACCENT,
  },
  {
    title: 'Nuestra Visión',
    desc: 'Ser el marketplace de servicios locales más confiable del Perú, expandiéndonos a todas las regiones y convirtiéndonos en la primera opción para encontrar profesionales verificados.',
    icon: Eye,
    accent: 'blue' as keyof typeof ACCENT,
  },
  {
    title: 'Público Objetivo',
    desc: 'Clientes que buscan servicios de calidad con garantía de verificación. Profesionales independientes y pequeños negocios que quieren expandir su alcance y credibilidad.',
    icon: Users,
    accent: 'green' as keyof typeof ACCENT,
  },
  {
    title: 'Verificación y Confianza',
    desc: 'Cada profesional pasa por un proceso de validación documental antes de aparecer en la plataforma. Las reseñas con GPS garantizan experiencias reales y transparentes.',
    icon: ShieldCheck,
    accent: 'purple' as keyof typeof ACCENT,
  },
  {
    title: 'Cobertura Actual',
    desc: 'Comenzamos en Huancayo y Huanta, ciudades donde la economía local necesitaba una solución tecnológica para conectar la oferta y demanda de servicios.',
    icon: MapPin,
    accent: 'rose' as keyof typeof ACCENT,
  },
  {
    title: 'Crecimiento',
    desc: REFERRALS_ENABLED
      ? 'Gracias al boca a boca, las invitaciones entre colegas y nuestro programa de referidos con monedas, más profesionales se suman cada semana a la plataforma.'
      : 'Gracias al boca a boca y las recomendaciones entre colegas, más profesionales se suman cada semana a la plataforma.',
    icon: TrendingUp,
    accent: 'amber' as keyof typeof ACCENT,
  },
];

// Variantes para la cascada de tarjetas
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.2 }
  }
};

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
  }
};

export default function AboutModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Fondo oscuro difuminado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Contenedor del Modal - Glassmorphism */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="relative bg-dark-surface/95 backdrop-blur-xl border border-white/5 rounded-2xl w-full max-w-3xl max-h-[88vh] mx-2 sm:mx-0 overflow-hidden shadow-glow-sm flex flex-col"
          >
            {/* Cabecera */}
            <div className="relative bg-white/[0.02] px-6 py-6 flex-shrink-0 border-b border-white/5">
              <div className="relative flex items-start justify-between">
                <div>
                  <span className="eyebrow">Team Less Dev</span>
                  <h2 className="mt-2 font-display font-bold tracking-tightest text-white text-[26px] sm:text-[30px] leading-tight">
                    ¿Quiénes somos?
                  </h2>
                  <p className="text-white/60 text-[14.5px] mt-2 max-w-md leading-relaxed">
                    Una plataforma peruana construida para conectar el talento local
                    con personas que valoran la seguridad y la calidad.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
                  aria-label="Cerrar"
                >
                  <X size={18} strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* Cuerpo con scroll y cascada */}
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {ABOUT_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const a = ACCENT[section.accent];
                  return (
                    <motion.div
                      key={section.title}
                      variants={cardVariants}
                      className="glass glass-hover rounded-xl p-5"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-lg border ${a.border} ${a.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon size={16} strokeWidth={1.75} className={a.text} />
                        </div>
                        <p className="font-display font-semibold text-white text-[14px] leading-snug">
                          {section.title}
                        </p>
                      </div>
                      <p className="text-white/50 text-[12.5px] leading-relaxed">
                        {section.desc}
                      </p>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Pie de página dentro del modal */}
              <div className="mt-8 pt-6 border-t border-white/5 text-center">
                <p className="text-white/60 text-[13px] leading-relaxed max-w-lg mx-auto">
                  <strong className="text-white">Servi</strong> nació de la necesidad
                  de formalizar el mercado de servicios locales en ciudades donde no
                  existía una alternativa digital confiable. Creemos en el talento
                  peruano y trabajamos cada día para que encontrar un profesional
                  de calidad sea tan fácil como pedir un taxi por app.
                </p>
                <p className="text-white/60 text-[13px] leading-relaxed max-w-lg mx-auto mt-3">
                  Desarrollado con dedicación por <strong className="text-white">Team Less Dev</strong>,
                  un equipo pequeño con grandes ideas. Porque no se trata del tamaño del
                  equipo, sino del impacto que generas.
                </p>
                <p className="text-white/30 text-[11px] mt-5">
                  © {new Date().getFullYear()} Team Less Dev — Hecho en Perú con dedicación y café.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
