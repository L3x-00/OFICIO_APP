'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    src: '/images/provedoresmultiple.png',
    alt: 'Red de profesionales verificados',
    caption: 'Cientos de profesionales verificados en tu ciudad',
  },
  {
    src: '/images/provedo.cliente.png',
    alt: 'Conexión entre proveedor y cliente',
    caption: 'Conexión directa entre clientes y expertos',
  },
  {
    src: '/images/portadad2.png',
    alt: 'OficioApp – marketplace de servicios',
    caption: 'El marketplace de servicios locales más confiable del Perú',
  },
  {
    src: '/images/provedor.png',
    alt: 'Proveedor en OficioApp',
    caption: 'Crea tu perfil profesional y empieza a recibir clientes',
  },
  {
    src: '/images/promocionar.png',
    alt: 'Promociona tu negocio',
    caption: 'Promociona tu negocio y aumenta tus ventas',
  },
  {
    src: '/images/Gemini_Generated_Image_rlxpperlxpperlxp.png',
    alt: 'Servicios locales a tu alcance',
    caption: 'Servicios locales a tu alcance, cuando los necesites',
  },
];

const SLIDE_INTERVAL = 4500;

export default function ImageCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, []);

  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <section className="py-14 bg-bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10" data-reveal>
          <h2 className="text-2xl sm:text-4xl font-bold text-text-primary">
            Conoce <span className="text-gradient">OficioApp</span>
          </h2>
          <p className="text-text-secondary mt-2 text-sm sm:text-base">
            La plataforma que transforma cómo se contratan servicios en el Perú.
          </p>
        </div>

        <div
          data-reveal="scale"
          className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 ring-1 ring-white/5 select-none"
          style={{ aspectRatio: '16 / 7' }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {slides.map((slide, idx) => (
            <div
              key={slide.src}
              className={`absolute inset-0 transition-opacity duration-700 ${
                idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 90vw"
              />
              {/* Gradient overlay para texto */}
              <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/75 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 z-10">
                <p className="text-white text-sm sm:text-base font-medium drop-shadow-lg max-w-xl">
                  {slide.caption}
                </p>
              </div>
            </div>
          ))}

          {/* Botón anterior */}
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-primary/80 backdrop-blur-sm rounded-full text-white transition-all duration-200 hover:-translate-x-0.5 ring-1 ring-white/10 hover:ring-primary"
            aria-label="Imagen anterior"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Botón siguiente */}
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-primary/80 backdrop-blur-sm rounded-full text-white transition-all duration-200 hover:translate-x-0.5 ring-1 ring-white/10 hover:ring-primary"
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
                    ? 'w-6 h-2 bg-primary'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir a imagen ${idx + 1}`}
              />
            ))}
          </div>

          {/* Barra de progreso */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-20">
            <div
              key={current}
              className="h-full bg-primary origin-left"
              style={{
                animation: paused ? 'none' : `progress ${SLIDE_INTERVAL}ms linear`,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
