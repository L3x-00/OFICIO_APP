'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShieldCheck, Star, MapPin, LayoutGrid, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCountUp } from '@/lib/hooks';

// ── Tipos ──────────────────────────────────────────────────
type StepIcon = LucideIcon | string;
type StatTone = 'primary' | 'amber';

interface StatDef {
  target: number;
  suffix: string;
  label: string;
  icon: LucideIcon;
  tone: StatTone;
}

// ── Datos ──────────────────────────────────────────────────
const stats: StatDef[] = [
  { target: 500,  suffix: '+', label: 'Profesionales registrados', icon: ShieldCheck, tone: 'primary' },
  { target: 1200, suffix: '+', label: 'Reseñas verificadas',       icon: Star,        tone: 'amber'   },
  { target: 5,    suffix: '+', label: 'Ciudades atendidas',        icon: MapPin,      tone: 'primary' },
  { target: 30,   suffix: '+', label: 'Categorías de servicio',    icon: LayoutGrid,  tone: 'amber'   },
];

const TONE: Record<StatTone, { text: string; bar: string; iconBg: string; iconText: string }> = {
  primary: {
    text: 'text-primary-light',
    bar: 'bg-primary-light',
    iconBg: 'bg-primary-light/10',
    iconText: 'text-primary-light',
  },
  amber: {
    text: 'text-amber',
    bar: 'bg-amber',
    iconBg: 'bg-amber/10',
    iconText: 'text-amber',
  },
};

// ── Variantes de animación ────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const statsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.7 },
  },
};

const statItemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const stepContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
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

// ── Subcomponente StatItem ─────────────────────────────────
function StatItem({ stat }: { stat: StatDef }) {
  const { ref, value } = useCountUp(stat.target, 1800);
  const t = TONE[stat.tone];
  const Icon = stat.icon;

  return (
    <motion.div variants={statItemVariants} className="relative flex items-start gap-3 sm:gap-5 group min-w-0">
      <div className={`w-1 h-12 rounded-full ${t.bar} flex-shrink-0 mt-1 transition-all duration-300 group-hover:h-14`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${t.iconBg} flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110`}>
            <Icon className={t.iconText} size={16} strokeWidth={1.75} />
          </div>
          <span className="font-display tabular-nums text-2xl sm:text-3xl font-extrabold leading-none tracking-tightest text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
            <span ref={ref}>{value.toLocaleString('es-PE')}</span>
            <span className={t.text}>{stat.suffix}</span>
          </span>
        </div>
        <p className="mt-2.5 text-xs sm:text-sm text-white/80 leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">{stat.label}</p>
      </div>
    </motion.div>
  );
}

// ── Componente ─────────────────────────────────────────────
export default function HeroSection() {
  return (
    <>
      {/* ══════════════════════════════════════════════════════
          HERO + STATS — todo integrado
          ══════════════════════════════════════════════════════ */}
      <section className="force-dark-zone relative overflow-hidden min-h-[90vh] sm:min-h-screen flex flex-col justify-center">
        {/* ═══ FONDO: IMAGEN DE HUANCAYO CON DEGRADADO OSCURO 75% ═══ */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {/* Imagen de fondo (parque constitución) - se ajusta completamente */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: "url('/parque-constitucion.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          {/* Degradado oscuro (más ligero: deja ver la imagen, el texto usa drop-shadow para contraste) */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65 transition-colors duration-300" />

          {/* Degradado adicional para mejor fusión */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15" />
          
          {/* Efectos de luz (mantenidos para dar profundidad) */}
          <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px]" />
          <div className="absolute inset-0 grid-bg-night opacity-20" />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-8 sm:py-12 w-full">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Chip - siempre blanco */}
            <motion.div variants={itemVariants} className="chip-eyebrow mb-6 inline-flex max-w-full mx-auto bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="dot flex-shrink-0" />
              <span className="text-white/90 min-w-0 whitespace-normal">La Red de profesionales más grande de Huancayo</span>
            </motion.div>

            {/* Título - siempre blanco */}
            <motion.h1
              variants={itemVariants}
              className="font-display font-extrabold tracking-tightest text-white leading-[1.05] text-[30px] min-[420px]:text-[34px] sm:text-[48px] lg:text-[60px] break-words drop-shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
            >
              Encuentra al{' '}
              <span className="text-gradient">profesional</span>{' '}
              <br className="hidden sm:block" />
              en un solo clic.
            </motion.h1>

            {/* Descripción - siempre blanco */}
            <motion.p
              variants={itemVariants}
              className="mt-5 text-white/80 text-[15px] sm:text-[18px] leading-relaxed max-w-2xl mx-auto break-words drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
            >
              En Servi centralizamos a los mejores profesionales y negocios verificados de Huancayo. Todo lo que necesitas, ahora en un solo lugar.
            </motion.p>

            {/* Botones CTA */}
            <motion.div variants={itemVariants} className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-none mx-auto">
              <Link
                href="/buscar"
                className="btn btn-primary btn-lg press-effect inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Search size={18} />
                Buscar servicios
              </Link>
              <Link
                href="/registrar-proveedor"
                className="btn btn-primary btn-lg press-effect inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Quiero ser parte
              </Link>
            </motion.div>

            {/* ═══ STATS — más abajo de los botones ═══ */}
            <motion.div
              variants={statsContainerVariants}
              initial="hidden"
              animate="visible"
              className="mt-12 sm:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8"
            >
              {stats.map((stat) => (
                <StatItem key={stat.label} stat={stat} />
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Línea divisoria inferior */}
        <div
          className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
          aria-hidden
        />
      </section>

      {/* ══════════════════════════════════════════════════════
          PASOS — sección aparte CON IMAGEN DE FONDO
          ══════════════════════════════════════════════════════ */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        {/* ═══ FONDO: IMAGEN "TAN-FACIL" CON DEGRADADO 50% ═══ */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {/* Imagen de fondo */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: "url('/tan-facil.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          {/* Degradado del 50% que se adapta al tema */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-white/50 to-white/50 dark:from-black/50 dark:via-black/50 dark:to-black/50 transition-colors duration-300" />
          
          {/* Degradado sutil para mejor fusión */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-white/30 dark:from-black/30 dark:via-transparent dark:to-black/30" />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-gray-900 dark:text-white">
              Tan fácil como 1, 2, 3
            </h2>
            <p className="mt-2 text-gray-600 dark:text-white/60 text-[15px] sm:text-[16px]">
              Diseñado para que encuentres ayuda en minutos, sin estrés.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={stepContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            {[
              {
                num: '01',
                icon: Search,
                title: 'Busca lo que necesitas',
                desc: 'Explora cientos de perfiles por categoría, ubicación o calificación. Todo a un clic de distancia.',
              },
              {
                num: '02',
                icon: '/images/social/whatsapp.svg',
                title: 'Conecta directamente',
                desc: 'Chatea directamente con el profesional y explica lo que necesitas antes de contratar.',
              },
              {
                num: '03',
                icon: Star,
                title: 'Relájate',
                desc: 'El trabajo se hace. Pagas de forma segura y dejas una reseña para ayudar a tu comunidad.',
              },
            ].map((step, i) => {
              const isSvg = typeof step.icon === 'string';
              const IconComp = !isSvg ? (step.icon as LucideIcon) : null;

              return (
                <motion.div
                  key={step.title}
                  variants={stepItemVariants}
                  className="relative group cursor-default"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-black/40 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-black/50 transition-all duration-500 h-[220px] flex flex-col items-center justify-center p-6 group-hover:-translate-y-2 border border-white/20 dark:border-white/10">
                    
                    <span className="absolute top-3 right-4 font-display font-extrabold text-[80px] leading-none text-gray-300/50 dark:text-white/[0.06] select-none pointer-events-none group-hover:text-primary/20 dark:group-hover:text-primary/[0.10] transition-colors duration-500">
                      {step.num}
                    </span>

                    <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary/20 dark:bg-primary/10 flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:bg-primary/30 dark:group-hover:bg-primary/20 group-hover:shadow-glow-sm">
                      {isSvg ? (
                        <Image
                          src={step.icon as string}
                          alt=""
                          width={28}
                          height={28}
                          className="opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        IconComp && (
                          <IconComp className="text-primary dark:text-primary-light" size={28} strokeWidth={1.75} />
                        )
                      )}
                    </div>

                    <h3 className="relative z-10 font-display font-bold text-gray-800 dark:text-white text-[17px] text-center transition-all duration-500 group-hover:text-primary dark:group-hover:text-primary-light">
                      {step.title}
                    </h3>

                    <p className="relative z-10 mt-3 text-gray-600 dark:text-white/60 text-[13px] leading-relaxed text-center max-w-[240px] opacity-0 max-h-0 overflow-hidden transition-all duration-500 group-hover:opacity-100 group-hover:max-h-[100px]">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
    </>
  );
}
