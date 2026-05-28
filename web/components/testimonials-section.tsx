'use client';

import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    name: 'María G.',
    city: 'Huancayo',
    role: 'Cliente',
    rating: 5,
    text: 'Encontré un electricista en 10 minutos. La reseña con GPS me dio mucha confianza. Ahora siempre uso Servi para todo.',
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

// Variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
};

const cardVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
  }
};

export default function TestimonialsSection() {
  return (
    <section id="testimonios" className="relative py-24 sm:py-32 overflow-hidden bg-dark-premium">
      {/* Fondo con resplandor ámbar sutil */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">

        <motion.div 
          className="max-w-2xl mb-14 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <span className="eyebrow">Testimonios</span>
          <h2 className="mt-3 font-display font-bold tracking-tightest text-white text-[34px] sm:text-[44px] leading-[1.1]">
            Historias reales de personas
            <br className="hidden sm:block" /> que ya confían en Servi.
          </h2>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {testimonials.map((t) => (
            <motion.article
              key={t.name}
              variants={cardVariants}
              // AQUÍ SE AGREGÓ rounded-2xl
              className="relative overflow-hidden rounded-2xl glass glass-hover p-7"
            >
              <Quote
                className="absolute top-6 right-6 text-white/5" // Transparencia sutil sobre cristal oscuro
                size={28}
                strokeWidth={1.5}
              />

              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, idx) => (
                  <Star key={idx} size={14} className="text-amber fill-amber drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]" /> // Estrellas con resplandor dorado
                ))}
              </div>

              <p className="text-white/70 text-[15.5px] leading-relaxed mb-7">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-5 border-t border-white/5">
                <div className={`avatar ${t.avatar} w-10 h-10 text-[13px] ring-1 ring-white/10`}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="font-display font-semibold text-white text-[14px]">
                    {t.name}
                  </div>
                  <div className="text-white/40 text-[12.5px]">
                    {t.role} · {t.city}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}