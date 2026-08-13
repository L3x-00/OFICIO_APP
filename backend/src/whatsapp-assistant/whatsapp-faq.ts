/**
 * Conocimiento F1 de Servi para WhatsApp. FIJO y determinista: sin IA, sin
 * consultas a BD de usuario/proveedor/cuenta. Solo información PÚBLICA de Servi
 * (qué es, cómo usar la app, registro, planes, proveedores, ayuda).
 *
 * La identidad y las reglas viven en Servi (no en OpenWA, que es genérico).
 */

/** Respuesta corta cuando el mensaje cae fuera del alcance de Servi. */
export const OUT_OF_SCOPE_REPLY =
  'Soy el asistente de Servi y solo puedo ayudarte con temas de la app Servi ' +
  '(servicios, registro, planes, proveedores). ¿En qué de Servi te ayudo?';

/** Confirmación única al derivar a un asesor humano. */
export const HUMAN_HANDOVER_REPLY =
  'Listo. Pausé las respuestas automáticas de Servi en este chat para que el ' +
  'equipo pueda continuar la atención por este medio.';

export interface FaqEntry {
  /** Palabras/frases (ya normalizadas: minúsculas, sin acentos) que disparan. */
  readonly keywords: readonly string[];
  readonly answer: string;
}

/**
 * FAQ pública de Servi. El orden importa: se evalúa de arriba a abajo y gana la
 * primera entrada con un keyword presente en el texto normalizado.
 */
export const SERVI_FAQ: readonly FaqEntry[] = [
  {
    keywords: [
      'registr',
      'crear cuenta',
      'crear perfil',
      'darme de alta',
      'inscrib',
    ],
    answer:
      'Para registrarte en Servi descarga la app o entra a la web, elige ' +
      '"Crear cuenta" y sigue los pasos. Si eres proveedor, puedes crear tu ' +
      'perfil de servicio desde la sección de registro de proveedor.',
  },
  {
    keywords: [
      'plan',
      'precio',
      'costo',
      'suscrip',
      'pago',
      'premium',
      'estandar',
      'gratis',
    ],
    answer:
      'Servi es gratis para clientes. Los proveedores eligen un plan: GRATIS, ' +
      'ESTÁNDAR o PREMIUM, con más alcance y funciones según el plan. Puedes ' +
      'ver y cambiar tu plan desde el panel de proveedor.',
  },
  {
    keywords: [
      'proveedor',
      'ofrecer servicio',
      'trabajar',
      'ser proveedor',
      'oficio',
      'negocio',
    ],
    answer:
      'En Servi un proveedor ofrece sus servicios (oficios, negocios o ' +
      'profesionales) a clientes cercanos. Regístrate como proveedor, completa ' +
      'tu perfil y aparecerás en las búsquedas de tu zona.',
  },
  {
    keywords: [
      'buscar',
      'busco',
      'encontrar',
      'encuentro',
      'contratar',
      'necesito un',
      'necesito una',
      'servicio cerca',
      'cerca de mi',
      'electricista',
      'gasfiter',
      'plomero',
      'peluquer',
      'abogado',
      'contador',
      'restaurante',
      'como uso',
      'como funciona',
      'usar la app',
    ],
    answer:
      'Con Servi buscas servicios locales (electricistas, gasfiteros, ' +
      'peluquerías, restaurantes y más) cerca de ti, ves su perfil y los ' +
      'contactas directo. Abre la app, busca la categoría y filtra por tu zona.',
  },
  {
    keywords: ['que es servi', 'que es', 'para que sirve', 'sobre servi'],
    answer:
      'Servi es un marketplace de servicios locales del Perú: conecta clientes ' +
      'con proveedores cercanos (oficios, negocios y profesionales). Clientes ' +
      'gratis; proveedores con planes de suscripción.',
  },
  {
    keywords: [
      'ayuda',
      'soporte',
      'problema',
      'no puedo',
      'contacto',
      'reclamo',
    ],
    answer:
      '¿Necesitas ayuda con Servi? Cuéntame tu duda sobre la app y te oriento. ' +
      'También puedes escribir "humano" para pausar las respuestas automáticas.',
  },
];
