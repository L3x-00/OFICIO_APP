'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { MANUAL_ACCENT } from '@/lib/constants';  // ← Cambiado de './constants'
import type { GuideSection } from '@/lib/types';

interface GuideCardProps {
  section: GuideSection;
  onClick: () => void;
}

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function GuideCard({ section, onClick }: GuideCardProps) {
  const Icon = section.icon;
  const a = MANUAL_ACCENT[section.accent];

  return (
    <motion.button
      variants={cardVariants}
      onClick={onClick}
      className="glass rounded-xl overflow-hidden group text-left w-full transition-all duration-300 hover:shadow-glow-md hover:border-primary/30 cursor-pointer"
    >
      <div className="px-6 py-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl border ${a.border} ${a.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} strokeWidth={1.75} className={a.text} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-white text-[15.5px] leading-snug">
            {section.title}
          </h3>
          <p className="text-white/40 text-xs mt-1">
            {section.content.length} {section.content.length === 1 ? 'guía' : 'guías'}
          </p>
        </div>

        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className="text-white/30 flex-shrink-0 transition-transform duration-300 group-hover:rotate-180 group-hover:text-primary-light"
        />
      </div>
    </motion.button>
  );
}