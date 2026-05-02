'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const faqData: { category: string; items: FaqItem[] }[] = [
  {
    category: 'Para Clientes (Usuarios)',
    items: [
      {
        question: '¿Cómo garantizan que los profesionales sean confiables?',
        answer: 'Sometemos a cada proveedor a un riguroso proceso de validación de identidad y antecedentes antes de activar su perfil. Además, puedes guiarte por las calificaciones y reseñas reales de otros usuarios de la comunidad.',
      },
      {
        question: '¿Tiene algún costo solicitar un servicio?',
        answer: 'No, publicar una solicitud de servicio es totalmente gratuito. Recibirás diferentes propuestas (subastas) y tú eliges la que mejor se adapte a tu presupuesto y necesidad.',
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
    category: 'Para Proveedores (Profesionales y Negocios)',
    items: [
      {
        question: '¿Cómo puedo empezar a ofrecer mis servicios?',
        answer: 'Solo debes registrarte, completar tu perfil profesional y subir los documentos solicitados para la verificación (DNI/RUC). Una vez aprobado por el administrador, podrás empezar a enviar ofertas a las solicitudes de los clientes.',
      },
      {
        question: '¿Qué beneficios obtengo con los planes Estándar y Premium?',
        answer: 'Los planes de suscripción te permiten enviar más ofertas por día, aparecer en los primeros lugares de búsqueda y obtener una insignia de "Proveedor Destacado" para generar más confianza.',
      },
      {
        question: '¿Cómo funcionan las subastas de servicios?',
        answer: 'Cuando un cliente publica una necesidad, recibirás una notificación si coincide con tu categoría. Podrás enviar una propuesta económica y técnica; el cliente revisará todas las ofertas y seleccionará la ganadora.',
      },
      {
        question: '¿Es seguro el sistema de pagos por Yape?',
        answer: 'Totalmente. Hemos integrado un flujo de validación de capturas de pantalla y estados de pago que son verificados por el sistema para asegurar que tu suscripción o transacciones se activen correctamente y sin errores.',
      },
    ],
  },
  {
    category: 'General',
    items: [
      {
        question: '¿En qué ciudades está disponible OficioApp?',
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
        <span className="text-text-primary font-medium text-sm sm:text-base group-hover:text-primary transition-colors pr-4">
          {question}
        </span>
        <ChevronDown
          size={18}
          className={`text-text-muted flex-shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-96 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-text-secondary text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function FaqSection() {
  return (
    <section id="faq" className="py-20 sm:py-28 bg-bg-dark">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14" data-reveal>
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 mb-4">
            <HelpCircle size={14} className="text-primary" />
            <span className="text-primary text-xs font-bold uppercase tracking-widest">
              Preguntas frecuentes
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
            Todo lo que necesitas saber
          </h2>
          <p className="text-text-secondary mt-3 max-w-lg mx-auto">
            Respuestas claras a las dudas más comunes de clientes y proveedores.
          </p>
        </div>

        <div className="space-y-10">
          {faqData.map((group) => (
            <div key={group.category} data-reveal>
              <h3 className="text-text-primary font-bold text-lg mb-3 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-primary rounded-full" />
                {group.category}
              </h3>
              <div className="bg-bg-card border border-white/5 rounded-2xl px-5">
                {group.items.map((item) => (
                  <FaqAccordion key={item.question} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}