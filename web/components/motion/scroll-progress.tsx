'use client';

import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * Barra de progreso fija en el tope de la página, vinculada al scroll
 * vertical del viewport.
 *
 * Detalles:
 *   • `useScroll().scrollYProgress` da un MotionValue 0→1.
 *   • Pasamos por `useSpring` con stiffness/damping suaves para que la
 *     barra no "salte" en cada gesto del trackpad.
 *   • z-index 50 — encima del navbar de la landing (que es z-40).
 *
 * El componente solo se monta en client (`'use client'`). Si en algún
 * momento querés esconderla en mobile, basta con `hidden sm:block`.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 25,
    mass: 0.4,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-amber origin-left z-50 shadow-glow-sm pointer-events-none"
    />
  );
}
