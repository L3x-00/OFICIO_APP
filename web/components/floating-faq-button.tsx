'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import FaqModal from './faq-modal';

export default function FloatingFaqButton() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Ocultar en el panel de proveedor / cliente / vanity URLs
  const isHidden = pathname?.startsWith('/panel') || pathname?.startsWith('/cliente') || pathname?.startsWith('/p/');

  if (isHidden) return null;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const, delay: 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-40 group"
        aria-label="Preguntas frecuentes"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-dark-card border border-white/10 shadow-glow-md group-hover:border-primary/30 transition-all duration-300">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.75" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-white/60 group-hover:text-primary-light transition-colors flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <path d="M12 17h.01"/>
          </svg>
          <span className="text-white/70 group-hover:text-primary-light text-xs font-semibold font-display transition-colors">
            FAQ
          </span>
        </div>
      </motion.button>

      <FaqModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}