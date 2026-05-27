'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Divisor sutil entre secciones del landing. Línea horizontal con
 * gradiente que se "dibuja" de izquierda a derecha cuando entra al
 * viewport.
 *
 * SSR-safe: árbol JSX idéntico server/client (siempre motion.div).
 * Solo conmutamos `transition.duration` cuando el user pidió reducir
 * movimiento — así no se genera hydration mismatch que dejaría las
 * secciones invisibles en producción.
 */
interface Props {
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

  return (
    <div aria-hidden className="py-4 overflow-hidden">
      <motion.div
        initial={{ scaleX: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{
          duration: reduceMotion ? 0 : 0.9,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        }}
        style={{ originX: 0.5 }}
        className={cls}
      />
    </div>
  );
}
