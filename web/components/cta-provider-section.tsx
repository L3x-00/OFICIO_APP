'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Smartphone, ArrowRight, Shield, TrendingUp, Bell, Star, CheckCircle } from 'lucide-react';

const features = [
  { icon: Shield,     text: 'Verificación de identidad gratuita' },
  { icon: TrendingUp, text: 'Estadísticas en tiempo real' },
  { icon: Bell,       text: 'Notificaciones de solicitudes' },
  { icon: Star,       text: 'Calificaciones verificadas' },
];

const providerPerks = [
  'Perfil verificado y destacado',
  'Recibe solicitudes de clientes',
  'Estadísticas de visitas en tiempo real',
  'Pagos con Yape integrados',
];

export default function CtaProviderSection() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-dark-premium">
      {/* Fondo con patrón grid sutil */}
      <div className="absolute inset-0 grid-bg-night opacity-30 pointer-events-none" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">

        {/* Bloque CTA principal - Glassmorphism con Glow */}
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="relative glass p-10 sm:p-14 lg:p-16 overflow-hidden border-primary/20 shadow-glow-md"
        >
          {/* Spotlight / Blob naranja intenso */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
          >
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/15 rounded-full blur-[120px] animate-float-slow" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] animate-float" />
          </div>

          <div className="relative max-w-3xl">
            <div className="chip-eyebrow mb-7">
              <span className="dot" />
              Para proveedores
            </div>

            <h2 className="font-display font-bold tracking-tightest text-white text-[36px] sm:text-[48px] leading-[1.05]">
              Haz crecer tu negocio
              <br className="hidden sm:block" /> con <span className="text-gradient">OficioApp</span>.
            </h2>

            <p className="mt-6 text-white/60 text-[17px] leading-relaxed max-w-2xl">
              Descarga la app, crea tu perfil en minutos y empieza a conectar con clientes
              que buscan exactamente lo que ofreces.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#" className="btn btn-primary btn-lg press-effect">
                <Smartphone size={18} />
                Descargar la app
              </a>
              <Link href="/login" className="btn btn-ghost btn-lg press-effect group">
                Acceder al panel web
                <ArrowRight
                  size={18}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            {/* Mini features inline */}
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {features.map((f) => (
                <div key={f.text} className="flex items-center gap-2 text-white/50 text-[13.5px]">
                  <f.icon size={15} className="text-primary-light flex-shrink-0" strokeWidth={1.75} />
                  {f.text}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bloque secundario: profesional o negocio */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="relative mt-8 glass p-8 sm:p-10"
        >
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="font-display font-semibold text-white text-[24px] sm:text-[28px] leading-snug">
                ¿Eres profesional o tienes un negocio?
              </h3>
              <p className="mt-4 text-white/60 text-[15px] leading-relaxed">
                Regístrate, verifica tu perfil y empieza a recibir clientes de tu ciudad
                desde hoy.
              </p>

              <a href="#" className="mt-6 btn btn-ghost btn-sm press-effect border-white/10 hover:border-primary/30">
                <Smartphone size={14} />
                Descarga la app gratis
              </a>
            </div>

            <ul className="space-y-3">
              {providerPerks.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-white/70 text-[14.5px]">
                  {/* Cambiamos el verde genérico por nuestro Cian de confianza */}
                  <CheckCircle size={16} className="text-accent flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}