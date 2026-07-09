'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  category: string;
  items: FaqItem[];
}

const faqData: FaqCategory[] = [
  {
    category: 'Para Clientes',
    items: [
      {
        question: '¿Cómo garantizan que los profesionales sean confiables?',
        answer: 'Sometemos a cada proveedor a un riguroso proceso de validación de identidad y antecedentes antes de activar su perfil. Además, puedes guiarte por las calificaciones y reseñas reales de otros usuarios de la comunidad.',
      },
      {
        question: '¿Tiene algún costo buscar un servicio?',
        answer: 'No, buscar y contactar profesionales es totalmente gratuito. Puedes comparar perfiles, reseñas y precios, y elegir el que mejor se adapte a tu presupuesto y necesidad.',
      },
      {
        question: '¿Cómo funcionan las monedas de recompensa?',
        answer: 'Es nuestro sistema de lealtad. Puedes ganar monedas invitando a amigos con tu código de referido. Estas monedas se acumulan en tu perfil y pueden ser canjeadas por descuentos en servicios o meses de planes premium.',
      },
      {
        question: '¿Qué hago si tengo un problema con un servicio?',
        answer: 'Contamos con un sistema de soporte técnico y reporte de incidentes dentro de la app. Nuestro equipo administrativo mediará para asegurar que se cumplan los términos y condiciones bajo la normativa de protección al consumidor en Perú.',
      },
    ],
  },
  {
    category: 'Para Proveedores',
    items: [
      {
        question: '¿Cómo puedo empezar a ofrecer mis servicios?',
        answer: 'Solo debes registrarte, completar tu perfil profesional y subir los documentos solicitados para la verificación (DNI/RUC). Una vez aprobado, los clientes de tu zona podrán encontrarte y contactarte directamente.',
      },
      {
        question: '¿Qué beneficios obtengo con los planes Estándar y Premium?',
        answer: 'Los planes te permiten aparecer en los primeros lugares de búsqueda, ampliar tu alcance a más distritos, publicar más servicios y obtener una insignia destacada para generar más confianza.',
      },
      // Feature OCULTA (2026-07): subastas — restaurar esta FAQ al reactivar.
      // {
      //   question: '¿Cómo funcionan las subastas de servicios?',
      //   answer: 'Cuando un cliente publica una necesidad, recibirás una notificación si coincide con tu categoría. Podrás enviar una propuesta económica y técnica; el cliente revisará todas las ofertas y seleccionará la ganadora.',
      // },
      {
        question: '¿Es seguro el sistema de pagos por Yape?',
        answer: 'Totalmente. Hemos integrado un flujo de validación de capturas de pantalla y estados de pago que son verificados por el sistema para asegurar que tu suscripción se active correctamente y sin errores.',
      },
    ],
  },
  {
    category: 'General',
    items: [
      {
        question: '¿En qué ciudades está disponible Servi?',
        answer: 'Actualmente nos enfocamos en conectar ciudades intermedias del Perú, brindando una plataforma tecnológica donde antes no existía una solución formal y segura.',
      },
      {
        question: '¿Mi información personal está segura?',
        answer: 'Sí, cumplimos con los estándares de seguridad de datos y la Ley de Protección de Datos Personales en Perú, asegurando que tu información se maneje con total confidencialidad.',
      },
    ],
  },
];

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

function FaqAccordion({ question, answer }: FaqItem) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left group"
      >
        <span className={`font-display font-medium text-[14px] transition-colors pr-4 ${open ? 'text-primary-light' : 'text-white/80 group-hover:text-white'}`}>
          {question}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={`flex-shrink-0 transition-all duration-300 ${open ? 'rotate-180 text-primary' : 'text-white/30'}`}
        />
      </button>
      
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-white/50 text-[13px] leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FaqModal({ isOpen, onClose }: FaqModalProps) {
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
            className="relative glass rounded-2xl w-full max-w-xl max-h-[80vh] overflow-y-auto shadow-glow-lg border border-white/10"          >
            {/* Header */}
            <div className="sticky top-0 glass border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border border-primary/30 bg-primary/15 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                </div>
                <div>
                  <h2 className="font-display font-bold text-white text-lg">Preguntas frecuentes</h2>
                  <p className="text-white/40 text-xs">Respuestas rápidas a tus dudas</p>
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
            <div className="px-6 py-5 space-y-8">
              {faqData.map((group) => (
                <div key={group.category}>
                  <h3 className="font-display font-semibold text-primary text-[13px] uppercase tracking-[0.16em] mb-3 flex items-center gap-2.5">
                    <span className="w-5 h-px bg-primary/40" />
                    {group.category}
                  </h3>
                  <div className="glass rounded-xl px-5 border-white/5">
                    {group.items.map((item) => (
                      <FaqAccordion key={item.question} {...item} />
                    ))}
                  </div>
                </div>
              ))}
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