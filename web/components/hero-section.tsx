import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Smartphone, Star, ShieldCheck } from 'lucide-react';
import FlipCard3D from '@/components/flip-card-3d';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Blobs decorativos animados */}
      <div className="blob bg-primary/40 w-[420px] h-[420px] -top-32 -left-24 animate-float-slow" />
      <div className="blob bg-amber/25 w-[360px] h-[360px] top-1/2 right-[-120px] animate-float" />

      {/* Patrón grid muy sutil */}
      <div
        className="absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.04] pointer-events-none"
        aria-hidden
      />

      {/* Imagen de fondo unificada */}
      <div className="absolute inset-0">
        <Image
          src="/images/promociona2.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        {/* Capa base que oscurece toda la imagen */}
        <div className="absolute inset-0 bg-bg-dark/65" />
        {/* Degradado lateral (más denso a la izquierda donde está el texto) */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg-dark/95 via-bg-dark/75 to-bg-dark/55" />
        <div className="absolute inset-0 bg-radial-primary opacity-50 pointer-events-none" />
      </div>

      <div
        className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-16 lg:py-24"
        style={{ minHeight: '620px' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10 lg:gap-16 items-center">
          {/* Texto + CTAs */}
          <div className="max-w-2xl">
            {/* Badge con pulse */}
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 rounded-full px-4 py-1.5 mb-6 animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <Star size={13} className="text-primary fill-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-widest">
                Marketplace local · Perú
              </span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold text-white leading-[1.1] mb-5 animate-fade-in-up"
              style={{ animationDelay: '120ms' }}
            >
              Encuentra profesionales{' '}
              <span className="text-gradient">de confianza</span>{' '}
              en tu ciudad
            </h1>

            <p
              className="text-text-secondary text-lg sm:text-xl leading-relaxed mb-10 max-w-lg animate-fade-in-up"
              style={{ animationDelay: '240ms' }}
            >
              Marketplace de servicios locales que conecta clientes con expertos
              verificados. Reseñas con GPS, Yape y soporte en Perú.
            </p>

            <div
              className="flex flex-wrap gap-4 animate-fade-in-up"
              style={{ animationDelay: '360ms' }}
            >
              <Link
                href="/login"
                className="btn-primary press-effect group px-7 py-3.5 rounded-button font-bold text-sm inline-flex items-center gap-2"
              >
                Iniciar sesión
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
              <a
                href="#como-funciona"
                className="btn-ghost press-effect px-7 py-3.5 rounded-button font-bold text-sm inline-flex items-center gap-2"
              >
                <Smartphone size={18} />
                Cómo funciona
              </a>
            </div>

            {/* Trust badge */}
            <div
              className="mt-8 flex items-center gap-2 text-text-muted text-xs animate-fade-in-up"
              style={{ animationDelay: '500ms' }}
            >
              <ShieldCheck size={14} className="text-green" />
              Más de 500 profesionales verificados en todo el Perú
            </div>
          </div>

          {/* Tarjeta 3D giratoria */}
          <div
            className="flex justify-center lg:justify-end animate-fade-in-up pb-10 lg:pb-0"
            style={{ animationDelay: '500ms' }}
          >
            <FlipCard3D />
          </div>
        </div>
      </div>

      {/* Fade inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg-dark to-transparent pointer-events-none" />
    </section>
  );
}
