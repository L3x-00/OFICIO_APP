import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Smartphone, CheckCircle, Star } from 'lucide-react';

const providerPerks = [
  'Perfil verificado y destacado',
  'Recibe solicitudes de clientes',
  'Estadísticas de visitas en tiempo real',
  'Pagos con Yape integrados',
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* ── Split hero: dos paneles lado a lado ─────────────── */}
      <div className="flex flex-col lg:flex-row" style={{ minHeight: '620px', maxHeight: '760px' }}>

        {/* ── Panel izquierdo: promociona2.png ──────────────── */}
        <div className="relative flex-[3] flex items-center overflow-hidden min-h-[440px] lg:min-h-0">
          <Image
            src="/images/promociona2.png"
            alt="Encuentra profesionales de confianza en tu ciudad"
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 1024px) 100vw, 62vw"
          />
          {/* Overlay: oscuro a la izquierda, se desvanece a la derecha */}
          <div className="absolute inset-0 bg-gradient-to-r from-bg-dark/96 via-bg-dark/80 to-bg-dark/40" />

          <div className="relative z-10 px-8 sm:px-14 lg:px-16 py-16 max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 rounded-full px-4 py-1.5 mb-6">
              <Star size={13} className="text-primary fill-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-widest">
                Marketplace local · Perú
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.2rem] font-extrabold text-white leading-[1.15] mb-5">
              Encuentra profesionales{' '}
              <span className="text-primary">de confianza</span>{' '}
              en tu ciudad
            </h1>

            <p className="text-text-secondary text-lg sm:text-xl leading-relaxed mb-10 max-w-lg">
              Marketplace de servicios locales que conecta clientes con expertos
              verificados. Reseñas con GPS, Yape y soporte en Perú.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="bg-primary hover:bg-primary-dark text-white px-7 py-3.5 rounded-button font-bold text-sm inline-flex items-center gap-2 transition-all duration-200 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5"
              >
                Iniciar sesión
                <ArrowRight size={18} />
              </Link>
              <a
                href="#como-funciona"
                className="border border-white/25 text-white/90 hover:border-primary/60 hover:text-primary px-7 py-3.5 rounded-button font-bold text-sm inline-flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
              >
                <Smartphone size={18} />
                Cómo funciona
              </a>
            </div>
          </div>
        </div>

        {/* ── Panel derecho: portada.jpeg ───────────────────── */}
        <div className="relative flex-[2] flex items-center overflow-hidden min-h-[300px] lg:min-h-0">
          <Image
            src="/images/portada.jpeg"
            alt="Proveedores de servicios en OficioApp"
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 1024px) 100vw, 38vw"
          />
          {/* Overlay: oscuro a la derecha, se desvanece a la izquierda */}
          <div className="absolute inset-0 bg-gradient-to-l from-bg-dark/96 via-bg-dark/82 to-bg-dark/55" />

          <div className="relative z-10 px-8 sm:px-12 py-16 w-full">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-snug">
              ¿Eres profesional o tienes un negocio?
            </h2>
            <p className="text-text-secondary text-sm sm:text-base mb-7 leading-relaxed">
              Regístrate, verifica tu perfil y empieza a recibir clientes de tu ciudad desde hoy.
            </p>

            <ul className="space-y-3 mb-8">
              {providerPerks.map((perk) => (
                <li key={perk} className="flex items-center gap-2.5 text-text-secondary text-sm">
                  <CheckCircle size={16} className="text-primary flex-shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>

            <a
              href="#"
              className="inline-flex items-center gap-2 bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary px-5 py-2.5 rounded-button text-sm font-semibold transition-all duration-200"
            >
              <Smartphone size={16} />
              Descarga la app gratis
            </a>
          </div>
        </div>
      </div>

      {/* Fade inferior al fondo de la página */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-bg-dark to-transparent pointer-events-none" />
    </section>
  );
}
