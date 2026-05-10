import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import FlipCard3D from '@/components/flip-card-3d';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 sm:pt-28">
      {/* Fondo cálido con topografía sutil */}
      <div className="absolute inset-0 topo pointer-events-none" aria-hidden />
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pb-20 sm:pb-28 pt-10 sm:pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-20 items-center">

          {/* Columna izquierda: copy */}
          <div className="max-w-2xl">
            <div className="chip-eyebrow mb-7">
              <span className="dot" />
              Marketplace local · Perú
            </div>

            <h1 className="font-display font-extrabold tracking-tightest text-ink leading-[1.05] text-[44px] sm:text-[58px] lg:text-[68px]">
              Encuentra al{' '}
              <span className="relative inline-block">
                <span className="relative z-10">profesional</span>
                <span
                  className="absolute left-0 right-0 bottom-1 h-3 bg-gradient-to-r from-amber/30 to-primary/40 rounded-md -z-0"
                  aria-hidden
                />
              </span>{' '}
              <br className="hidden sm:block" />
              ideal en minutos.
            </h1>

            <p className="mt-7 text-ink-3 text-[17px] sm:text-[19px] leading-relaxed max-w-xl">
              Conectamos a clientes con profesionales y negocios verificados de tu ciudad.
              Reseñas con GPS, pagos con Yape y soporte local en todo el Perú.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn btn-ink btn-lg press-effect group">
                Empezar gratis
                <ArrowRight
                  size={18}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
              <a href="#como-funciona" className="btn btn-ghost btn-lg press-effect">
                Cómo funciona
              </a>
            </div>

            {/* Trust strip */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-ink-4 text-[13px]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-green" />
                <span>+500 profesionales verificados</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-line-2" />
              <div className="flex items-center gap-2">
                <span className="peru-stripe">
                  <i /><i /><i />
                </span>
                <span>Hecho en el Perú</span>
              </div>
            </div>
          </div>

          {/* Columna derecha: tarjeta 3D */}
          <div className="flex justify-center lg:justify-end">
            <FlipCard3D />
          </div>
        </div>
      </div>

      {/* Línea divisoria cálida final */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-line" aria-hidden />
    </section>
  );
}
