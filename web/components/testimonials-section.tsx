import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    name: 'María G.',
    city: 'Huancayo',
    role: 'Cliente',
    rating: 5,
    text: 'Encontré un electricista en 10 minutos. La reseña con GPS me dio mucha confianza. Ahora siempre uso OficioApp para todo.',
    avatar: 'avatar-orange',
  },
  {
    name: 'Carlos R.',
    city: 'Huanta',
    role: 'Proveedor · Gasfitero',
    rating: 5,
    text: 'Como gasfitero, la app me trajo clientes nuevos cada semana. La verificación de mi DNI me da credibilidad frente a los clientes.',
    avatar: 'avatar-amber',
  },
  {
    name: 'Lucía P.',
    city: 'Huancayo',
    role: 'Cliente',
    rating: 5,
    text: 'Necesitaba un chef a domicilio para un evento. Las fotos reales y los comentarios verificados me ayudaron a decidir con confianza.',
    avatar: 'avatar-ink',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonios" className="relative py-24 sm:py-32 bg-surface border-y border-line overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">

        <div className="max-w-2xl mb-14 sm:mb-16" data-reveal>
          <span className="eyebrow">Testimonios</span>
          <h2 className="mt-3 font-display font-bold tracking-tightest text-ink text-[34px] sm:text-[44px] leading-[1.1]">
            Historias reales de personas
            <br className="hidden sm:block" /> que ya confían en OficioApp.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <article
              key={t.name}
              data-reveal
              className={`reveal-delay-${i + 1} card-3d p-7 hover-lift relative`}
            >
              <Quote
                className="absolute top-6 right-6 text-line-2"
                size={28}
                strokeWidth={1.5}
              />

              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, idx) => (
                  <Star key={idx} size={14} className="text-amber fill-amber" />
                ))}
              </div>

              <p className="text-ink-2 text-[15.5px] leading-relaxed mb-7">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-5 border-t border-line">
                <div className={`avatar ${t.avatar} w-10 h-10 text-[13px]`}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="font-display font-semibold text-ink text-[14px]">
                    {t.name}
                  </div>
                  <div className="text-ink-4 text-[12.5px]">
                    {t.role} · {t.city}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
