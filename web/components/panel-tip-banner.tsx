'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export interface PanelTip {
  text: string;
  cta?: { label: string; href: string };
}

const ROTATE_MS = 1500;

/**
 * Carrusel de mensajes cortos que rota cada 1.5s (fade+slide). Cada tip
 * puede traer un CTA propio (ej. upsell de planes).
 */
export function PanelTipBanner({ tips }: { tips: PanelTip[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (tips.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % tips.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [tips.length]);

  if (tips.length === 0) return null;
  const tip = tips[index];

  return (
    <div className="relative h-6 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex items-center gap-2 text-white/60 text-sm"
        >
          <Sparkles size={14} className="text-primary-light flex-shrink-0" />
          <span className="truncate">{tip.text}</span>
          {tip.cta && (
            <Link
              href={tip.cta.href}
              className="inline-flex items-center gap-0.5 text-primary-light hover:text-primary font-semibold flex-shrink-0 group"
            >
              {tip.cta.label}
              <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
