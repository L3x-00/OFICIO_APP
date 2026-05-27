'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Levitación suave infinita en Y para elementos decorativos.
 *
 * SSR-safe: el árbol JSX (motion.div) es el mismo server y client.
 * Solo conmutamos la amplitud a 0 cuando el user pidió reducir
 * movimiento — evita el hydration mismatch que dejaba a Hero
 * invisible en producción.
 */
interface Props {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
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
  const amp = reduceMotion ? 0 : amplitude;

  return (
    <motion.div
      className={className}
      animate={{ y: [-amp, amp, -amp] }}
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
