'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const faqData: { category: string; items: FaqItem[] }[] = [
  {
    category: 'Para Clientes',
    items: [
      {
        question: '¿Cómo garantizan que los profesionales sean confiables?',
        answer: 'Sometemos a cada proveedor a un riguroso proceso de validación de identidad y antecedentes antes de activar su perfil. Además, puedes guiarte por las calificaciones y reseñas reales de otros usuarios de la comunidad.',
      },
      {
        question: '¿Tiene algún costo solicitar un servicio?',
        answer: 'No, publicar una solicitud de servicio es totalmente gratuito. Recibirás diferentes propuestas y tú eliges la que mejor se adapte a tu presupuesto y necesidad.',
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
        answer: 'Solo debes registrarte, completar tu perfil profesional y subir los documentos solicitados para la verificación (DNI/RUC). Una vez aprobado, podrás empezar a enviar ofertas a las solicitudes de los clientes.',
      },
      {
        question: '¿Qué beneficios obtengo con los planes Estándar y Premium?',
        answer: 'Los planes te permiten enviar más ofertas por día, aparecer en los primeros lugares de búsqueda y obtener una insignia de "Proveedor Destacado" para generar más confianza.',
      },
      {
        question: '¿Cómo funcionan las subastas de servicios?',
        answer: 'Cuando un cliente publica una necesidad, recibirás una notificación si coincide con tu categoría. Podrás enviar una propuesta económica y técnica; el cliente revisará todas las ofertas y seleccionará la ganadora.',
      },
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

function FaqAccordion({ question, answer }: FaqItem) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className={`font-display font-medium text-[15px] sm:text-[16px] transition-colors pr-4 ${open ? 'text-primary-light' : 'text-white/80 group-hover:text-white'}`}>
          {question}
        </span>
        <ChevronDown
          size={18}
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
            <p className="pb-5 text-white/50 text-[14.5px] leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqSection() {
  return (
    <section id="faq" className="py-24 sm:py-32 bg-dark-surface relative overflow-hidden">
      {/* Fondo decorativo sutil */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-5 sm:px-8 lg:px-10">

        <motion.div 
          className="mb-14 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <span className="eyebrow">Preguntas frecuentes</span>
          <h2 className="mt-3 font-display font-bold tracking-tightest text-white text-[34px] sm:text-[44px] leading-[1.1]">
            Todo lo que necesitas saber.
          </h2>
          <p className="mt-4 text-white/60 text-[16px] leading-relaxed max-w-lg">
            Respuestas claras a las dudas más comunes de clientes y proveedores.
          </p>
        </motion.div>

        <motion.div 
          className="space-y-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          {faqData.map((group) => (
            <motion.div 
              key={group.category} 
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
              }}
            >
              <h3 className="font-display font-semibold text-accent text-[14px] uppercase tracking-[0.16em] mb-3 flex items-center gap-2.5">
                <span className="w-5 h-px bg-accent/40" />
                {group.category}
              </h3>
              <div className="glass rounded-xl px-6 border-white/5">
                {group.items.map((item) => (
                  <FaqAccordion key={item.question} {...item} />
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}