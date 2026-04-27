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
      {/* Fondo con gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-bg-dark to-bg-card" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-bg-card/50 border border-white/8 rounded-2xl p-8 sm:p-12 lg:p-16 text-center backdrop-blur-sm">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-6">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">
              Para proveedores
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 max-w-3xl mx-auto leading-tight">
            Haz crecer tu negocio con{' '}
            <span className="text-primary">OficioApp</span>
          </h2>

          <p className="text-text-secondary text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Descarga la app, crea tu perfil en minutos y empieza a conectar con clientes
            que buscan exactamente lo que ofreces.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-12">
            {features.map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-2 text-text-secondary text-sm"
              >
                <f.icon size={15} className="text-primary flex-shrink-0" />
                {f.text}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#"
              className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-button font-bold text-base inline-flex items-center gap-2 transition-all duration-200 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5"
            >
              <Smartphone size={20} />
              Descargar la app
            </a>
            <Link
              href="/login"
              className="border border-white/20 text-white hover:border-primary/50 hover:text-primary px-8 py-4 rounded-button font-bold text-base inline-flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
            >
              Acceder al panel web
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
