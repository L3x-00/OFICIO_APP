'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Divisor sutil entre secciones del landing. Línea horizontal con
 * gradiente que se "dibuja" de izquierda a derecha cuando entra al
 * viewport, dándole ritmo visual al scroll sin romper la composición.
 *
 * Sin estado, sin lógica. Plug & play entre secciones.
 */
interface Props {
  /** Variantes preset de color para combinar con el contexto. */
  tone?: 'primary' | 'accent' | 'amber' | 'muted';
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  primary: 'via-primary/40',
  accent:  'via-accent/40',
  amber:   'via-amber/40',
  muted:   'via-white/10',
};

export default function SectionDivider({ tone = 'muted' }: Props) {
  const reduceMotion = useReducedMotion();
  const cls = `h-px w-full max-w-[640px] mx-auto bg-gradient-to-r from-transparent ${TONE[tone]} to-transparent`;

  if (reduceMotion) {
    return (
      <div aria-hidden className="py-4">
        <div className={cls} />
      </div>
    );
  }

  return (
    <div aria-hidden className="py-4 overflow-hidden">
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        style={{ originX: 0.5 }}
        className={cls}
      />
    </div>
  );
}
