'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCubes, FaHome, FaBroom, FaSpa, FaChalkboardTeacher, FaTools, FaToolbox } from 'react-icons/fa';
import { FiChevronRight, FiMapPin, FiLoader } from 'react-icons/fi';
import { api } from '@/lib/api';

/* Fallback cuando el visitante no da permiso de ubicación: provincia de
   Huancayo (incluye los distritos Huancayo y El Tambo). */
const FALLBACK_PROVINCE = 'Huancayo';
const NEARBY_RADIUS_KM = 10;

interface Card {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  highlighted?: boolean;
}

/* Tarjetas → categorías PADRE reales del catálogo (slug en BD).
   Al hacer clic se listan los proveedores reales de esa categoría
   filtrados por la ubicación del cliente. */
const CARDS: Card[] = [
  {
    slug: 'of-hogar',
    title: 'Hogar y Mantenimiento',
    subtitle: 'Reparación · gasfitería · jardín',
    description: 'Electricidad, gasfitería, jardinería y más. Profesionales de confianza para tu hogar.',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=500&fit=crop&crop=center&auto=format',
    icon: FaHome,
    tag: 'Hogar',
  },
  {
    slug: 'limpieza-del-hogar',
    title: 'Limpieza Integral',
    subtitle: 'Hogar · oficinas · pos-obra',
    description: 'Limpieza profunda, desinfección, lavado de alfombras y tapicería.',
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=500&fit=crop&crop=center&auto=format',
    icon: FaBroom,
    tag: 'Limpieza',
  },
  {
    slug: 'of-salud',
    title: 'Cuidado Personal',
    subtitle: 'Salud · bienestar · estética',
    description: 'Profesionales de salud y bienestar: masajes, terapias y cuidado personal.',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=500&fit=crop&crop=center&auto=format',
    icon: FaSpa,
    tag: 'Bienestar',
  },
  {
    slug: 'of-educacion',
    title: 'Clases y Tutorías',
    subtitle: 'Idiomas · apoyo · música',
    description: 'Idiomas, apoyo escolar, música y desarrollo personal para todas las edades.',
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=500&fit=crop&crop=center&auto=format',
    icon: FaChalkboardTeacher,
    tag: 'Aprendizaje',
    highlighted: true,
  },
  {
    slug: 'of-tecnologia',
    title: 'Reparaciones Técnicas',
    subtitle: 'Electrónica · electrodomésticos',
    description: 'Diagnóstico y reparación de electrodomésticos, celulares, computadoras y más.',
    image: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=400&h=500&fit=crop&crop=center&auto=format',
    icon: FaTools,
    tag: 'Reparaciones',
  },
  {
    slug: 'servicios-generales',
    title: 'Servicios Generales',
    subtitle: 'Gasfitería · drywall · pintura',
    description: 'Soluciones integrales: albañilería, soldadura, pintura, enchape y más.',
    image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=500&fit=crop&crop=center&auto=format',
    icon: FaToolbox,
    tag: 'Integral',
  },
];

export default function SolutionsSection() {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [locating, setLocating] = useState<string | null>(null);

  // Conteo real de proveedores por categoría (provincia por defecto).
  useEffect(() => {
    let alive = true;
    void Promise.all(
      CARDS.map((c) =>
        api
          .countProviders({ parentCategorySlug: c.slug, province: FALLBACK_PROVINCE })
          .then((n) => [c.slug, n] as const)
          .catch(() => [c.slug, -1] as const),
      ),
    ).then((pairs) => {
      if (alive) setCounts(Object.fromEntries(pairs.filter(([, n]) => n >= 0)));
    });
    return () => {
      alive = false;
    };
  }, []);

  /* Clic en "Ver servicios": intenta geolocalizar al cliente para listar
     proveedores cercanos; si no da permiso (o falla), cae a la provincia
     de Huancayo. El destino es /buscar prefiltrado. */
  const goToCategory = (card: Card) => {
    if (locating) return;
    const fallback = () =>
      router.push(`/buscar?categoria=${card.slug}&provincia=${FALLBACK_PROVINCE}&titulo=${encodeURIComponent(card.title)}`);

    if (!('geolocation' in navigator)) {
      fallback();
      return;
    }
    setLocating(card.slug);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(null);
        router.push(
          `/buscar?categoria=${card.slug}&lat=${pos.coords.latitude.toFixed(6)}&lng=${pos.coords.longitude.toFixed(6)}&km=${NEARBY_RADIUS_KM}&titulo=${encodeURIComponent(card.title)}`,
        );
      },
      () => {
        setLocating(null);
        fallback();
      },
      { timeout: 6000, maximumAge: 300000 },
    );
  };

  return (
    <section className="py-16 sm:py-20 bg-white dark:bg-dark-premium transition-colors duration-300 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="mb-10">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-gray-900 dark:text-white flex items-center gap-3">
            <FaCubes className="text-primary dark:text-primary-light" />
            Soluciones para todo
          </h2>
          <p className="text-gray-600 dark:text-white/60 mt-2 text-base sm:text-lg">
            Proveedores reales, verificados y cerca de ti.
          </p>
          <div className="inline-flex items-center gap-2 mt-3 text-primary dark:text-primary-light bg-primary/10 px-4 py-1.5 rounded-full text-sm font-medium">
            <FiMapPin />
            Según tu ubicación — o en Huancayo y El Tambo
          </div>
        </div>
      </div>

      {/* Carrusel infinito (derecha → izquierda, pausa al hover) */}
      <div className="marquee-mask relative" aria-label="Categorías de servicios">
        <div className="marquee-track gap-6 px-5 sm:px-8">
          {[...CARDS, ...CARDS].map((card, i) => {
            const Icon = card.icon;
            const count = counts[card.slug];
            const isLocating = locating === card.slug;
            const dup = i >= CARDS.length;
            return (
              <div
                key={`${card.slug}-${i}`}
                aria-hidden={dup}
                className={`group relative w-56 h-72 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl
                           transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] flex-shrink-0
                           ${card.highlighted ? 'ring-2 ring-amber ring-offset-2 ring-offset-white dark:ring-offset-dark-premium' : ''}`}
              >
                {/* Imagen de fondo */}
                <div
                  className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${card.image})` }}
                />

                {/* Franja base siempre visible: título + conteo real */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-10 group-hover:opacity-0 transition-opacity duration-300">
                  <h3 className="text-white font-display font-bold text-[16px] leading-tight">{card.title}</h3>
                  {typeof count === 'number' && (
                    <p className="text-white/70 text-[12px] mt-0.5">
                      {count > 0 ? `${count} proveedor${count === 1 ? '' : 'es'} disponibles` : 'Sé el primero en tu zona'}
                    </p>
                  )}
                </div>

                {/* Overlay con detalles (hover) */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent
                             opacity-0 group-hover:opacity-100 transition-opacity duration-300
                             flex flex-col justify-end p-5 text-white"
                >
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider backdrop-blur-sm px-3 py-1 rounded-full w-fit mb-2
                               ${card.highlighted ? 'bg-amber/30 border border-amber/40' : 'bg-white/20'}`}
                  >
                    <Icon className="inline mr-1 text-sm" />
                    {card.tag}
                  </span>
                  <h3 className="text-xl font-bold leading-tight">{card.title}</h3>
                  <p className="text-sm text-gray-200 mt-0.5">{card.subtitle}</p>
                  <p className="text-xs text-gray-300 mt-2 line-clamp-2">{card.description}</p>
                  <button
                    type="button"
                    onClick={() => goToCategory(card)}
                    disabled={isLocating}
                    tabIndex={dup ? -1 : 0}
                    className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white
                               ${card.highlighted ? 'bg-amber hover:bg-amber-dark' : 'bg-primary hover:bg-primary/85'}
                               px-4 py-1.5 rounded-full transition-all w-fit shadow-lg disabled:opacity-60`}
                  >
                    {isLocating ? (
                      <>
                        <FiLoader className="animate-spin" /> Ubicándote…
                      </>
                    ) : (
                      <>
                        Ver servicios <FiChevronRight className="text-xs" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enlace destacado */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 flex justify-end mt-6">
        <button
          type="button"
          onClick={() => goToCategory(CARDS[3])}
          className="inline-flex items-center gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10
                     hover:border-primary/40 hover:bg-gray-50 dark:hover:bg-white/10 px-6 py-2.5 rounded-full
                     font-semibold text-gray-800 dark:text-white/80 transition-all hover:translate-x-1"
        >
          Explorar Clases y Tutorías <FiChevronRight className="text-primary dark:text-primary-light" />
        </button>
      </div>
    </section>
  );
}
