'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Slides "deseados". Si alguna imagen está faltando en /public/images/
// (devuelve 404), el componente la descarta automáticamente con el
// `onError` del <img>. Antes esos slides quedaban en negro mientras
// el carousel rotaba — ahora el usuario solo ve los slides cuyo
// asset existe realmente.
const ALL_SLIDES = [
  {
    src: '/images/coin.png',
    alt: 'Red de profesionales verificados',
    caption: 'Cientos de profesionales verificados en tu ciudad',
  },
  {
    src: '/images/portada.png',
    alt: 'Conexión entre proveedor y cliente',
    caption: 'Conexión directa entre clientes y expertos',
  },
  {
    src: '/images/provedor.png',
    alt: 'Servi – marketplace de servicios',
    caption: 'El marketplace de servicios locales más confiable del Perú',
  },
  {
    src: '/images/portada2.png',
    alt: 'Proveedor en Servi',
    caption: 'Crea tu perfil profesional y empieza a recibir clientes',
  },
  {
    src: '/images/promociona2.png',
    alt: 'Promociona tu negocio',
    caption: 'Promociona tu negocio y aumenta tus ventas',
  },
  {
    src: '/images/promocionar.png',
    alt: 'Servicios locales a tu alcance',
    caption: 'Servicios locales a tu alcance, cuando los necesites',
  },
] as const;

const SLIDE_INTERVAL = 4500;

export default function ImageCarousel() {
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const slides = ALL_SLIDES.filter((s) => !broken.has(s.src));
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // Si el slide actual quedó fuera de rango después de filtrar slides
  // rotos, lo reseteamos a 0.
  useEffect(() => {
    if (current >= slides.length && slides.length > 0) {
      setCurrent(0);
    }
  }, [current, slides.length]);

  const next = useCallback(() => {
    setCurrent((c) => (slides.length === 0 ? 0 : (c + 1) % slides.length));
  }, [slides.length]);

  const prev = () =>
    setCurrent((c) =>
      slides.length === 0 ? 0 : (c - 1 + slides.length) % slides.length,
    );

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <section className="py-24 sm:py-32 bg-dark-surface relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <span className="eyebrow">Galería</span>
          <h2 className="mt-3 font-display font-bold tracking-tightest text-white text-[34px] sm:text-[44px] leading-[1.1]">
            Conoce <span className="text-gradient">Servi</span>
          </h2>
          <p className="text-white/60 mt-3 text-[16px] max-w-lg mx-auto leading-relaxed">
            La plataforma que transforma cómo se contratan servicios en el Perú.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="relative rounded-2xl overflow-hidden glass border border-white/5 select-none"
          style={{ aspectRatio: '16 / 7' }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {slides.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
              Próximamente: galería de Servi.
            </div>
          ) : (
          /* AnimatePresence para transiciones suaves de slides */
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="absolute inset-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slides[current].src}
                alt={slides[current].alt}
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => {
                  // Marca este src como roto para que el filter del próximo
                  // render lo elimine de `slides`. Evita 404 + slide en
                  // negro cuando los assets están faltando en /public.
                  setBroken((prev) => {
                    const next = new Set(prev);
                    next.add(slides[current].src);
                    return next;
                  });
                }}
              />
              {/* Gradient overlay para texto */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-premium/80 via-dark-premium/20 to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6 z-10">
                <div className="glass rounded-xl px-5 py-3 inline-block">
                  <p className="text-white text-sm sm:text-base font-medium drop-shadow-lg max-w-xl">
                    {slides[current].caption}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          )}

          {/* Botón anterior */}
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center glass rounded-full text-white/70 hover:text-primary transition-all duration-200 hover:-translate-x-0.5 hover:shadow-glow-sm hover:border-primary/30"
            aria-label="Imagen anterior"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Botón siguiente */}
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center glass rounded-full text-white/70 hover:text-primary transition-all duration-200 hover:translate-x-0.5 hover:shadow-glow-sm hover:border-primary/30"
            aria-label="Imagen siguiente"
          >
            <ChevronRight size={20} />
          </button>

          {/* Indicadores (dots) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`rounded-full transition-all duration-300 ${
                  idx === current
                    ? 'w-6 h-2 bg-primary shadow-glow-sm'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Ir a imagen ${idx + 1}`}
              />
            ))}
          </div>

          {/* Barra de progreso */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 z-20">
            <div
              key={current}
              className="h-full bg-gradient-primary origin-left"
              style={{
                animation: paused ? 'none' : `progress ${SLIDE_INTERVAL}ms linear`,
              }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}