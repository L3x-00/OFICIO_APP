'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Wrapper de animación scroll-reveal para una sección del landing.
 *
 * IMPORTANTE — accesibilidad sin romper hidratación:
 *   `useReducedMotion()` devuelve `null` en SSR y `true|false` en
 *   client → si lo usamos para BRANCHEAR el árbol JSX (motion.div vs
 *   div plano), React detecta hydration mismatch en producción y
 *   silenciosamente deja el componente en su estado inicial
 *   (opacity: 0). Resultado: secciones invisibles, "todo oscuro".
 *   Acá renderizamos SIEMPRE `motion.div` (mismo árbol server/client)
 *   y solo modulamos `transition.duration` para respetar la
 *   preferencia del usuario.
 */
interface Props {
  children: ReactNode;
  y?: number;
  delay?: number;
  duration?: number;
  amount?: number;
  once?: boolean;
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
  // Cuando el user pidió reducir movimiento, anulamos la duración y
  // el offset Y — el contenido aparece de inmediato, pero el TREE
  // sigue siendo el mismo (motion.div) para que la hidratación case.
  const effDuration = reduceMotion ? 0 : duration;
  const effY        = reduceMotion ? 0 : y;

  return (
    <motion.div
      initial={{ opacity: 0, y: effY }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{
        duration: effDuration,
        delay:    reduceMotion ? 0 : delay,
        ease:     [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
