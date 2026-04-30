import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Smartphone, CheckCircle, Star, ShieldCheck } from 'lucide-react';

const providerPerks = [
  'Perfil verificado y destacado',
  'Recibe solicitudes de clientes',
  'Estadísticas de visitas en tiempo real',
  'Pagos con Yape integrados',
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* ── Blobs decorativos animados (profundidad) ─────── */}
      <div className="blob bg-primary/40 w-[420px] h-[420px] -top-32 -left-24 animate-float-slow" />
      <div className="blob bg-amber/25 w-[360px] h-[360px] top-1/2 right-[-120px] animate-float" />

      {/* Patrón grid muy sutil */}
      <div
        className="absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.04] pointer-events-none"
        aria-hidden
      />

      {/* ── Split hero ───────────────────────────────────── */}
      <div className="relative flex flex-col lg:flex-row" style={{ minHeight: '620px', maxHeight: '760px' }}>

        {/* Panel izquierdo */}
        <div className="relative flex-[3] flex items-center overflow-hidden min-h-[440px] lg:min-h-0">
          <Image
            src="/images/promociona2.png"
            alt="Encuentra profesionales de confianza en tu ciudad"
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 1024px) 100vw, 62vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-dark/96 via-bg-dark/82 to-bg-dark/40" />
          <div className="absolute inset-0 bg-radial-primary opacity-60 pointer-events-none" />

          <div className="relative z-10 px-8 sm:px-14 lg:px-16 py-16 max-w-2xl">
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
        </div>

        {/* Panel derecho */}
        <div className="relative flex-[2] flex items-center overflow-hidden min-h-[300px] lg:min-h-0">
          <Image
            src="/images/portada.jpeg"
            alt="Proveedores de servicios en OficioApp"
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 1024px) 100vw, 38vw"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-bg-dark/96 via-bg-dark/82 to-bg-dark/55" />

          <div className="relative z-10 px-8 sm:px-12 py-16 w-full animate-slide-in-right" style={{ animationDelay: '300ms' }}>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-snug">
              ¿Eres profesional o tienes un negocio?
            </h2>
            <p className="text-text-secondary text-sm sm:text-base mb-7 leading-relaxed">
              Regístrate, verifica tu perfil y empieza a recibir clientes de tu ciudad desde hoy.
            </p>

            <ul className="space-y-3 mb-8">
              {providerPerks.map((perk, i) => (
                <li
                  key={perk}
                  className="flex items-center gap-2.5 text-text-secondary text-sm animate-fade-in-up"
                  style={{ animationDelay: `${500 + i * 80}ms` }}
                >
                  <CheckCircle size={16} className="text-primary flex-shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>

            <a
              href="#"
              className="inline-flex items-center gap-2 bg-primary/15 hover:bg-primary/25 border border-primary/40 hover:border-primary text-primary px-5 py-2.5 rounded-button text-sm font-semibold transition-all duration-200 hover:shadow-glow-sm hover-lift press-effect"
            >
              <Smartphone size={16} />
              Descarga la app gratis
            </a>
          </div>
        </div>
      </div>

      {/* Fade inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg-dark to-transparent pointer-events-none" />
    </section>
  );
}
