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
    <section className="relative py-24 sm:py-32 overflow-hidden bg-surface border-y border-line">
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">

        {/* Bloque CTA principal */}
        <div
          data-reveal="scale"
          className="relative card-3d p-10 sm:p-14 lg:p-16 overflow-hidden"
        >
          {/* Spotlight cálido */}
          <div
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 100% 0%, rgba(224,123,57,0.10), transparent 55%)',
            }}
            aria-hidden
          />

          <div className="relative max-w-3xl">
            <div className="chip-eyebrow mb-7">
              <span className="dot" />
              Para proveedores
            </div>

            <h2 className="font-display font-bold tracking-tightest text-ink text-[36px] sm:text-[48px] leading-[1.05]">
              Haz crecer tu negocio
              <br className="hidden sm:block" /> con <span className="text-gradient">OficioApp</span>.
            </h2>

            <p className="mt-6 text-ink-3 text-[17px] leading-relaxed max-w-2xl">
              Descarga la app, crea tu perfil en minutos y empieza a conectar con clientes
              que buscan exactamente lo que ofreces.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#" className="btn btn-orange btn-lg press-effect">
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
                <div key={f.text} className="flex items-center gap-2 text-ink-3 text-[13.5px]">
                  <f.icon size={15} className="text-primary flex-shrink-0" strokeWidth={1.75} />
                  {f.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bloque secundario: profesional o negocio */}
        <div
          data-reveal
          className="relative mt-8 card-flat p-8 sm:p-10"
        >
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="font-display font-semibold text-ink text-[24px] sm:text-[28px] leading-snug">
                ¿Eres profesional o tienes un negocio?
              </h3>
              <p className="mt-4 text-ink-3 text-[15px] leading-relaxed">
                Regístrate, verifica tu perfil y empieza a recibir clientes de tu ciudad
                desde hoy.
              </p>

              <a href="#" className="mt-6 btn btn-ink btn-sm press-effect">
                <Smartphone size={14} />
                Descarga la app gratis
              </a>
            </div>

            <ul className="space-y-3">
              {providerPerks.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-ink-2 text-[14.5px]">
                  <CheckCircle size={16} className="text-green flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
