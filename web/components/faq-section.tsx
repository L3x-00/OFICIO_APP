'use client';

import { useState } from 'react';
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
    <div className="border-b border-line last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="font-display font-medium text-ink text-[15px] sm:text-[16px] group-hover:text-ink-2 transition-colors pr-4">
          {question}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={`text-ink-4 flex-shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180 text-ink' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-96 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-ink-3 text-[14.5px] leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function FaqSection() {
  return (
    <section id="faq" className="py-24 sm:py-32 bg-paper">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10">

        <div className="mb-14 sm:mb-16" data-reveal>
          <span className="eyebrow">Preguntas frecuentes</span>
          <h2 className="mt-3 font-display font-bold tracking-tightest text-ink text-[34px] sm:text-[44px] leading-[1.1]">
            Todo lo que necesitas saber.
          </h2>
          <p className="mt-4 text-ink-3 text-[16px] leading-relaxed max-w-lg">
            Respuestas claras a las dudas más comunes de clientes y proveedores.
          </p>
        </div>

        <div className="space-y-12">
          {faqData.map((group) => (
            <div key={group.category} data-reveal>
              <h3 className="font-display font-semibold text-ink text-[14px] uppercase tracking-[0.16em] mb-3 flex items-center gap-2.5">
                <span className="w-5 h-px bg-ink-4" />
                {group.category}
              </h3>
              <div className="card-flat px-6">
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
