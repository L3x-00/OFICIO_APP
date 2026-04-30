import Link from 'next/link';
import { Smartphone, ArrowRight, Shield, TrendingUp, Bell, Star } from 'lucide-react';

const features = [
  { icon: Shield,     text: 'Verificación de identidad gratuita' },
  { icon: TrendingUp, text: 'Estadísticas de tu perfil en tiempo real' },
  { icon: Bell,       text: 'Notificaciones de nuevas solicitudes' },
  { icon: Star,       text: 'Sistema de calificaciones verificadas' },
];

export default function CtaProviderSection() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Fondo y blobs */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-bg-dark to-bg-card" />
      <div className="blob bg-primary/30 w-[480px] h-[480px] -top-40 right-[-120px] animate-float-slow" />
      <div className="blob bg-amber/20 w-[360px] h-[360px] bottom-[-100px] left-[-80px] animate-float" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.04] pointer-events-none" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          data-reveal="scale"
          className="relative glass-card rounded-3xl p-8 sm:p-12 lg:p-16 text-center overflow-hidden gradient-border"
        >
          {/* Spotlight orgánico */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 0%, rgba(224,123,57,0.4), transparent 60%)',
            }}
            aria-hidden
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-6 animate-pulse-soft">
              <span className="text-primary text-xs font-bold uppercase tracking-widest">
                Para proveedores
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 max-w-3xl mx-auto leading-tight">
              Haz crecer tu negocio con{' '}
              <span className="text-gradient">OficioApp</span>
            </h2>

            <p className="text-text-secondary text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Descarga la app, crea tu perfil en minutos y empieza a conectar con clientes
              que buscan exactamente lo que ofreces.
            </p>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-12">
              {features.map((f, i) => (
                <div
                  key={f.text}
                  className="flex items-center gap-2 text-text-secondary text-sm animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <f.icon size={15} className="text-primary flex-shrink-0" />
                  {f.text}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="#"
                className="btn-primary press-effect group px-8 py-4 rounded-button font-bold text-base inline-flex items-center gap-2"
              >
                <Smartphone size={20} />
                Descargar la app
              </a>
              <Link
                href="/login"
                className="btn-ghost press-effect group px-8 py-4 rounded-button font-bold text-base inline-flex items-center gap-2"
              >
                Acceder al panel web
                <ArrowRight
                  size={20}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
