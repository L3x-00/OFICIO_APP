'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { MANUAL_ACCENT } from '@/lib/constants';  // ← Cambiado
import type { GuideSection } from '@/lib/types';

interface GuideModalProps {
  section: GuideSection | null;
  isOpen: boolean;
  onClose: () => void;
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function GuideModal({ section, isOpen, onClose }: GuideModalProps) {
  if (!section) return null;

  const Icon = section.icon;
  const a = MANUAL_ACCENT[section.accent];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative glass rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-glow-lg border border-white/10"
          >
            {/* Header */}
            <div className="sticky top-0 glass border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border ${a.border} ${a.bg} flex items-center justify-center`}>
                  <Icon size={20} strokeWidth={1.75} className={a.text} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-white text-lg">{section.title}</h2>
                  <p className="text-white/40 text-xs">
                    {section.content.length} {section.content.length === 1 ? 'guía' : 'guías'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-5">
              {section.content.map((step, idx) => {
                const StepIcon = step.icon;
                const sa = MANUAL_ACCENT[step.accent];
                return (
                  <div key={idx} className="glass rounded-xl p-5 border border-white/5">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg border ${sa.border} ${sa.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <StepIcon size={15} strokeWidth={1.75} className={sa.text} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-white text-[15px]">
                          {step.title}
                        </h3>
                        <p className="text-white/60 text-[13px] leading-relaxed mt-1">
                          {step.desc}
                        </p>

                        {step.screenshot && (
  <div className="mt-3 flex justify-center">
    <div className="rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl" style={{ maxWidth: '280px' }}>
      <img
        src={`/images/manual/${step.screenshot}`}
        alt={step.title}
        className="w-full h-auto block"
        loading="lazy"
      />
    </div>
  </div>
)}

                        {step.subSteps && step.subSteps.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {step.subSteps.map((s, j) => (
                              <li key={j} className="text-white/50 text-[12.5px] flex items-start gap-2 leading-relaxed">
                                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${sa.dot}`} />
                                {s}
                              </li>
                            ))}
                          </ul>
                        )}

                        {step.links && step.links.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {step.links.map((link, k) => {
                              const ext = link.href.startsWith('http') || link.href.startsWith('mailto');
                              return (
                                <a
                                  key={k}
                                  href={link.href}
                                  target={ext ? '_blank' : undefined}
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-primary-light transition-colors px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-primary/30"
                                >
                                  {ext ? <ExternalLink size={12} /> : <ArrowRight size={12} />}
                                  {link.label}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 glass border-t border-white/10 px-6 py-3 flex justify-end">
              <button onClick={onClose} className="btn btn-ghost btn-sm press-effect">
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}