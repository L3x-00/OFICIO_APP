import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    name: 'María G.',
    city: 'Huancayo',
    role: 'Cliente',
    rating: 5,
    text: 'Encontré un electricista en 10 minutos. La reseña con GPS me dio mucha confianza. Ahora siempre uso OficioApp para todo.',
  },
  {
    name: 'Carlos R.',
    city: 'Huanta',
    role: 'Proveedor · Gasfitero',
    rating: 5,
    text: 'Como gasfitero, la app me trajo clientes nuevos cada semana. La verificación de mi DNI me da credibilidad frente a los clientes.',
  },
  {
    name: 'Lucía P.',
    city: 'Huancayo',
    role: 'Cliente',
    rating: 5,
    text: 'Necesitaba un chef a domicilio para un evento. Las fotos reales y los comentarios verificados me ayudaron a decidir con confianza.',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonios" className="py-20 sm:py-28 bg-bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 mb-4">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">
              Testimonios
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-text-secondary mt-3 max-w-xl mx-auto text-lg">
            Historias reales de personas que ya confían en OficioApp.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="group bg-bg-card border border-white/5 rounded-card p-6 hover:border-primary/25 hover:-translate-y-1 transition-all duration-300"
            >
              <Quote className="text-primary/30 mb-4" size={28} />

              {/* Estrellas */}
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={14} className="text-amber fill-amber" />
                ))}
              </div>

              <p className="text-text-secondary text-sm leading-relaxed mb-5">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-text-primary font-semibold text-sm">{t.name}</div>
                  <div className="text-text-muted text-xs">
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
