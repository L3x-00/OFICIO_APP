'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FaqModal from './faq-modal';
import { usePathname } from 'next/navigation';

export default function FloatingFaqButton() {
const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  // Ocultar en el panel de proveedor / cliente / vanity URLs
  const pathname = usePathname(); // 👈 Nuevo
  const isHidden = pathname?.startsWith('/panel') || pathname?.startsWith('/cliente') || pathname?.startsWith('/p/'); // 👈 Nuevo

  // Mostrar el botón solo después de scrollear un poco (300px)
  useEffect(() => {
    if (isHidden) { setVisible(false); return; } // 👈 Nuevo
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll(); 
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHidden]); // 👈 Actualizar si cambia la ruta

  // Si está en el panel, no renderizar nada
  if (isHidden) return null; // 👈 Nuevo

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.button
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
            onClick={() => setIsOpen(true)}
            className="fixed right-5 bottom-6 z-40 w-12 h-12 rounded-full bg-dark-card border border-white/10 shadow-glow-md flex items-center justify-center group hover:border-primary/30 transition-all duration-300"
            aria-label="Preguntas frecuentes"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="22" 
              height="22" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.75" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-white/60 group-hover:text-primary-light transition-colors"
            >
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <path d="M12 17h.01"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <FaqModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}