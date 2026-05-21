'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Headphones, Download, ExternalLink } from 'lucide-react';
import { GUIDE_SECTIONS } from '@/lib/constants';  // ← Cambiado
import GuideCard from './GuideCard';
import GuideModal from './GuideModal';
import type { GuideSection } from '@/lib/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export default function UserManual() {
  const [selectedSection, setSelectedSection] = useState<GuideSection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (section: GuideSection) => {
    setSelectedSection(section);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedSection(null), 300);
  };

  return (
    <section id="guia" className="py-24 sm:py-32 bg-dark-premium relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        {/* Encabezado */}
        <motion.div
          className="max-w-2xl mb-14 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
        >
          <span className="eyebrow">Manual de usuario</span>
          <h2 className="mt-3 font-display font-bold tracking-tightest text-white text-[34px] sm:text-[44px] leading-[1.1]">
            Aprende a usar <span className="text-gradient">Servi</span>.
          </h2>
          <p className="mt-4 text-white/60 text-[16px] leading-relaxed max-w-xl">
            Todo lo que necesitas saber para aprovechar al máximo la plataforma,
            tanto si eres cliente como si eres profesional o negocio.
          </p>
        </motion.div>

        {/* Grid de tarjetas */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {GUIDE_SECTIONS.map((section) => (
            <GuideCard key={section.id} section={section} onClick={() => handleCardClick(section)} />
          ))}
        </motion.div>

        {/* Footer con enlaces */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-white/40 text-[13px] max-w-lg mx-auto leading-relaxed">
            Si después de leer este manual aún tienes dudas, contáctanos.
            Estamos aquí para ayudarte.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a href="mailto:soporteofiapp@gmail.com" className="btn btn-ghost btn-sm press-effect">
              <Headphones size={14} />
              Soporte técnico
            </a>
            <a href="mailto:ronla.angarita31@gmail.com" className="btn btn-ghost btn-sm press-effect">
              <Download size={14} />
              Ventas y planes
            </a>
            <a href="#" className="btn btn-primary btn-sm press-effect">
              <ExternalLink size={14} />
              Descargar la app
            </a>
          </div>
        </motion.div>
      </div>

      {/* Modal */}
      <GuideModal section={selectedSection} isOpen={isModalOpen} onClose={handleCloseModal} />
    </section>
  );
}