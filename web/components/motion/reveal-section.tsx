'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Wrapper de animación scroll-reveal para una sección del landing.
 *
 * Diseño:
 *   • Se activa con `whileInView` cuando ~12% de la sección entra al
 *     viewport — el efecto se siente al primer asomo, no cuando ya
 *     pasó la mitad.
 *   • `once: true` evita re-animar al volver atrás (mejor para SEO
 *     stitch + accesibilidad).
 *   • Respeta `prefers-reduced-motion`: si el user lo activó, no
 *     hacemos transform/opacity transitions, solo render.
 *
 * Mantenibilidad: cada `<HeroSection/>`, `<StatsSection/>`, etc. NO se
 * tocan. Este wrapper se aplica desde `app/page.tsx` y mantiene a las
 * secciones con su markup original — sin riesgo de romper estilos
 * internos o estados.
 */
interface Props {
  children: ReactNode;
  /** Distancia inicial vertical en px. Default 32 (sutil). */
  y?: number;
  /** Delay en segundos antes de animar. Útil para encadenar. Default 0. */
  delay?: number;
  /** Duración. Default 0.6. */
  duration?: number;
  /** % del elemento que debe estar visible para disparar. Default 0.12. */
  amount?: number;
  /** Si false, re-anima cada vez que entra al viewport. Default true. */
  once?: boolean;
  /** Clase extra para el wrapper (no toca al child). */
  className?: string;
}

export default function RevealSection({
  children,
  y = 32,
  delay = 0,
  duration = 0.6,
  amount = 0.12,
  once = true,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
