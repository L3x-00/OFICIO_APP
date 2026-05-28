'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Shield, MapPin, CreditCard, HeartHandshake, Star, type LucideIcon } from 'lucide-react';

// `icon` puede ser:
//   • Un componente Lucide (tipo `LucideIcon`).
//   • Una ruta a SVG propio (string que empieza con `/`), p.ej. el
//     ícono oficial de WhatsApp para la tarjeta "Contacto directo".
type BenefitIcon = LucideIcon | string;

interface BenefitDef {
  icon: BenefitIcon;
  title: string;
  desc: string;
  accent: 'orange' | 'accent' | 'amber' | 'ink' | 'whatsapp';
}

const benefits: BenefitDef[] = [
  {
    icon: Shield,
    title: 'Profesionales verificados',
    desc: 'Validamos identidad y documentos para que contrates con total tranquilidad.',
    accent: 'orange',
  },
  {
    icon: MapPin,
    title: 'Reseñas con GPS',
    desc: 'Opiniones geolocalizadas que garantizan autenticidad en cada experiencia.',
    accent: 'accent',
  },
  {
    icon: CreditCard,
    title: 'Pagos seguros con Yape',
    desc: 'Método de pago confiable usado por millones de peruanos cada día.',
    accent: 'amber',
  },
  {
    icon: HeartHandshake,
    title: 'Soporte local',
    desc: 'Equipo peruano que entiende las necesidades de tu ciudad y negocio.',
    accent: 'orange',
  },
  {
    // SVG oficial de WhatsApp — sustituye al ícono Zap genérico que no
    // representaba la naturaleza del beneficio. Vive en /public.
    icon: '/images/social/whatsapp.svg',
    title: 'Contacto directo',
    desc: 'Habla directamente con el proveedor por WhatsApp o teléfono sin intermediarios.',
    accent: 'whatsapp',
  },
  {
    icon: Star,
    title: 'Rating transparente',
    desc: 'Sistema de calificaciones verificadas para tomar la mejor decisión.',
    accent: 'amber',
  },
];

// Mapa actualizado para el tema Dark Premium (colores brillantes sobre cristal oscuro)
const accentMap: Record<BenefitDef['accent'], { bg: string; text: string; border: string }> = {
  orange:   { bg: 'bg-primary/10',         text: 'text-primary-light', border: 'border-primary/20'        },
  accent:   { bg: 'bg-accent/10',          text: 'text-accent',        border: 'border-accent/20'         }, // Cian de confianza
  amber:    { bg: 'bg-amber/10',           text: 'text-amber',         border: 'border-amber/20'          },
  ink:      { bg: 'bg-white/5',            text: 'text-white/70',      border: 'border-white/10'          },
  // Tono específico para el SVG de WhatsApp: verde corporativo de la app.
  whatsapp: { bg: 'bg-emerald-500/10',     text: 'text-emerald-300',   border: 'border-emerald-500/25'    },
};

// Variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const cardVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
  }
};

export default function BenefitsSection() {
  return (
    <section id="beneficios" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Fondo sutil con gradiente radial */}
      <div className="absolute inset-0 bg-radial-primary pointer-events-none opacity-40" aria-hidden />
      
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">

        {/* Header */}
        <motion.div 
          className="max-w-2xl mb-14 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <span className="eyebrow">Por qué Servi</span>
          <h2 className="mt-3 font-display font-bold tracking-tightest text-white text-[34px] sm:text-[44px] leading-[1.1]">
            La plataforma que entiende cómo se contratan
            <br className="hidden sm:block" /> servicios en el Perú.
          </h2>
          <p className="mt-5 text-white/60 text-[16px] leading-relaxed max-w-xl">
            Construido alrededor de la confianza, la transparencia y la cercanía
            que esperan los clientes peruanos.
          </p>
        </motion.div>

        {/* Grid con Framer Motion Stagger */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {benefits.map((b) => {
            const a = accentMap[b.accent];
            const isSvg = typeof b.icon === 'string';
            const IconComp = !isSvg ? (b.icon as LucideIcon) : null;
            return (
              <motion.article
                key={b.title}
                variants={cardVariants}
                // AQUÍ SE AGREGÓ rounded-2xl
                className="relative overflow-hidden rounded-2xl glass glass-hover p-7 group"
              >
                {/* Shine sweep — Tailwind `before:` no aplica a glass, así
                    que usamos un span absoluto que se translateX al hover
                    del article padre. Pasa una sola vez por hover. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent skew-x-12 transition-transform duration-700 ease-out group-hover:translate-x-full"
                />

                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-xl border ${a.border} ${a.bg} flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-sm`}
                  >
                    {isSvg ? (
                      <Image
                        src={b.icon as string}
                        alt=""
                        width={22}
                        height={22}
                        className="opacity-90"
                      />
                    ) : (
                      IconComp && <IconComp className={a.text} size={22} strokeWidth={1.75} />
                    )}
                  </div>
                  <h3 className="font-display font-semibold text-white text-[17px] leading-snug mb-2">
                    {b.title}
                  </h3>
                  <p className="text-white/50 text-[14.5px] leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}