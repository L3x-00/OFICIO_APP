import { Quote, Star, MapPin } from 'lucide-react';

const testimonials = [
  {
    name: 'María G.',
    city: 'Huancayo',
    role: 'Cliente',
    rating: 5,
    text: 'Encontré un electricista en 10 minutos. La reseña con GPS me dio mucha confianza. Ahora siempre uso OficioApp para todo.',
    accent: 'from-primary/20 to-primary/5',
  },
  {
    name: 'Carlos R.',
    city: 'Huanta',
    role: 'Proveedor · Gasfitero',
    rating: 5,
    text: 'Como gasfitero, la app me trajo clientes nuevos cada semana. La verificación de mi DNI me da credibilidad frente a los clientes.',
    accent: 'from-amber/20 to-amber/5',
  },
  {
    name: 'Lucía P.',
    city: 'Huancayo',
    role: 'Cliente',
    rating: 5,
    text: 'Necesitaba un chef a domicilio para un evento. Las fotos reales y los comentarios verificados me ayudaron a decidir con confianza.',
    accent: 'from-green/20 to-green/5',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonios" className="relative py-20 sm:py-28 bg-bg-dark overflow-hidden">
      <div className="blob bg-amber/15 w-[420px] h-[420px] top-1/2 -left-32 animate-float" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14" data-reveal>
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 mb-4">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">
              Testimonios
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-text-primary leading-tight">
            Lo que dicen <span className="text-gradient">nuestros usuarios</span>
          </h2>
          <p className="text-text-secondary mt-4 max-w-xl mx-auto text-lg">
            Historias reales de personas que ya confían en OficioApp.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              data-reveal
              className={`reveal-delay-${i + 1} group relative bg-bg-card border border-white/5 rounded-card p-7 hover:border-primary/30 hover-lift hover-glow transition-all duration-300 overflow-hidden`}
            >
              {/* Gradiente sutil de fondo del testimonio */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${t.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
              />

              <Quote
                className="text-primary/25 mb-3 group-hover:text-primary/40 transition-colors duration-300"
                size={36}
              />

              <div className="flex items-center gap-0.5 mb-3 relative">
                {Array.from({ length: t.rating }).map((_, idx) => (
                  <Star key={idx} size={14} className="text-amber fill-amber" />
                ))}
              </div>

              <p className="relative text-text-secondary text-sm leading-relaxed mb-6 italic">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="relative flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="w-11 h-11 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 ring-2 ring-primary/30 shadow-glow-sm">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-text-primary font-semibold text-sm">{t.name}</div>
                  <div className="text-text-muted text-xs flex items-center gap-1 mt-0.5">
                    <MapPin size={11} />
                    {t.role} · {t.city}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
