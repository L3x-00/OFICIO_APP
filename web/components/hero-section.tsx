'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShieldCheck, Star, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import SearchBar from '@/components/search/search-bar';
// ── Tipos ──────────────────────────────────────────────────
type StepIcon = LucideIcon | string;

interface StepDef {
  icon: StepIcon;
  title: string;
  desc: string;
}

// ── Datos de los pasos ────────────────────────────────────
const steps: StepDef[] = [
  {
    icon: Search,
    title: 'Busca al experto que necesitas',
    desc: 'Filtra por categoría, ubicación y rating para encontrar al profesional ideal.',
  },
  {
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

// ── Variantes de animación ────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const stepContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.6 },
  },
};

const stepItemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

// ── Componente ─────────────────────────────────────────────
export default function HeroSection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/buscar?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/buscar');
    }
  };

  return (
    <section
      id="como-funciona"
      className="relative overflow-hidden pt-24 sm:pt-32 pb-16 sm:pb-20 bg-dark-premium"
    >
      {/* ═══ Fondo: Blobs + Grid ═══ */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 grid-bg-night opacity-30" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        
        {/* ═══ COPY PRINCIPAL (alineado a la izquierda) ═══ */}
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

          <motion.h1
            variants={itemVariants}
            className="font-display font-extrabold tracking-tightest text-white/95 leading-[1.05] text-[40px] sm:text-[56px] lg:text-[66px]"
          >
            Encuentra al{' '}
            <span className="text-gradient">profesional</span>{' '}
            <br className="hidden sm:block" />
            ideal en minutos.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-6 text-white/60 text-[17px] sm:text-[19px] leading-relaxed max-w-xl"
          >
            Conectamos a clientes con profesionales y negocios verificados de tu ciudad.
            Reseñas con GPS, pagos con Yape y soporte local en todo el Perú.
          </motion.p>

          {/* ═══ BARRA DE BÚSQUEDA (reemplaza los botones CTA) ═══ */}
          <motion.div variants={itemVariants} className="mt-8 max-w-xl">
            <SearchBar />
          </motion.div>

          {/* Trust strip */}
          <motion.div
            variants={itemVariants}
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-white/40 text-[13px]"
          >
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

        {/* ═══ 3 PASOS ═══ */}
        <motion.div
          className="mt-20 sm:mt-24 grid md:grid-cols-3 gap-x-10 gap-y-12 relative"
          variants={stepContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Línea conectora */}
          <svg
            aria-hidden
            className="hidden md:block absolute top-7 left-[8%] right-[8%] h-px w-[84%] pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 100 1"
          >
            <defs>
              <linearGradient id="hero-steps-line" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="rgba(224,123,57,0)" />
                <stop offset="20%" stopColor="rgba(224,123,57,0.55)" />
                <stop offset="80%" stopColor="rgba(6,182,212,0.55)" />
                <stop offset="100%" stopColor="rgba(6,182,212,0)" />
              </linearGradient>
            </defs>
            <line
              x1="0" y1="0.5" x2="100" y2="0.5"
              stroke="url(#hero-steps-line)"
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
                variants={stepItemVariants}
                className="relative group text-center md:text-left"
              >
                {/* Número decorativo de fondo */}
                <span
                  aria-hidden
                  className="absolute -top-6 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 font-display font-extrabold text-[112px] leading-none text-white/[0.04] select-none pointer-events-none group-hover:text-primary/[0.08] transition-colors duration-500"
                >
                  {stepNum}
                </span>

                {/* Icono + chip */}
                <div className="relative z-10 mb-5 flex items-center gap-3 justify-center md:justify-start">
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
                      IconComp && (
                        <IconComp className="text-primary-light" size={22} strokeWidth={1.75} />
                      )
                    )}
                  </div>
                  <span className="font-mono tabular-nums text-[12px] text-accent px-2 py-1 rounded-md border border-accent/20 bg-accent/10">
                    PASO {stepNum}
                  </span>
                </div>

                <h3 className="relative z-10 font-display font-semibold text-white text-[18px] leading-snug mb-2">
                  {step.title}
                </h3>
                <p className="relative z-10 text-white/50 text-[14px] leading-relaxed max-w-xs mx-auto md:mx-0">
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Línea divisoria inferior */}
      <div
        className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
        aria-hidden
      />
    </section>
  );
}