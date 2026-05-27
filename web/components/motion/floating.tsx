'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Levitación suave infinita en eje Y para darle "vida" a elementos
 * decorativos (mockups, isotipos, hero cards). Cero side-effects:
 * no toca el child, solo lo envuelve.
 *
 * Respeta `prefers-reduced-motion` — usuarios con accesibilidad
 * activa ven el child estático.
 */
interface Props {
  children: ReactNode;
  /** Amplitud del swing en px. Default 8 (sutil). */
  amplitude?: number;
  /** Duración de un ciclo completo en s. Default 4. */
  duration?: number;
  /** Offset inicial — útil para desfasar varios Floating en la misma vista. */
  delay?: number;
  className?: string;
}

export default function Floating({
  children,
  amplitude = 8,
  duration = 4,
  delay = 0,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      animate={{ y: [-amplitude, amplitude, -amplitude] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
}
