/**
 * Conocimiento F1 de Servi para WhatsApp. FIJO y determinista: sin IA, sin
 * consultas a BD de usuario/proveedor/cuenta. Solo información PÚBLICA de Servi
 * (qué es, cómo usar la app, registro, planes, proveedores, ayuda).
 *
 * La identidad y las reglas viven en Servi (no en OpenWA, que es genérico).
 */
import {
  SERVI_ANDROID_URL,
  SERVI_WEB_URL,
} from '../ai-assistant/servi-platform-knowledge.js';

/** Respuesta corta cuando el mensaje cae fuera del alcance de Servi. */
export const OUT_OF_SCOPE_REPLY =
  'Soy el asistente de Servi. Puedo ayudarte con servicios, registro, planes y ' +
  'proveedores. ¿Qué necesitas saber sobre Servi?';

/** Presentación fija: un saludo sin contexto no debe parecer un rechazo. */
export const GREETING_REPLY =
  '¡Hola! Soy Ofi, el asistente de Servi. Puedo ayudarte a buscar un servicio, ' +
  'registrarte como proveedor o conocer cómo funciona la plataforma.';

/** Desvío de producto: no nombra ni promete funcionalidades no disponibles. */
export const HIDDEN_FEATURES_REPLY =
  'Por ahora Servi se enfoca en conectar directamente con proveedores y en el ' +
  'catálogo de servicios. ¿Buscas algún servicio para contactarlo?';

/** Confirmación única al derivar a un asesor humano. */
export const HUMAN_HANDOVER_REPLY =
  'Listo. Pausé las respuestas automáticas de Servi en este chat para que el ' +
  'equipo pueda continuar la atención por este medio.';

export interface FaqEntry {
  /** Palabras/frases (ya normalizadas: minúsculas, sin acentos) que disparan. */
  readonly keywords: readonly string[];
  readonly answer: string;
  /** `false` mantiene el texto de marca determinista y fuera de Ofi. */
  readonly aiEligible?: boolean;
}

/**
 * FAQ pública de Servi. El orden importa: se evalúa de arriba a abajo y gana la
 * primera entrada con un keyword presente en el texto normalizado.
 */
export const SERVI_FAQ: readonly FaqEntry[] = [
  {
    // Evitar términos cortos: `cita` coincide con "necesita" y `oferta` con
    // "ofertar". Estas frases conservan la respuesta de marca incluso con F2.
    keywords: [
      'subasta',
      'ofertas',
      'promocion',
      'descuento',
      'cupon',
      'referid',
      'monedas',
      'agenda',
      'agendar',
      'reservar cita',
      'cotiza',
    ],
    answer: HIDDEN_FEATURES_REPLY,
    aiEligible: false,
  },
  {
    keywords: [
      'descarg',
      'play store',
      'android',
      'servi en iphone',
      'servi en ios',
      'app store',
      'pagina web',
      'sitio web',
      'enlace',
    ],
    answer:
      `Puedes usar Servi en la web: ${SERVI_WEB_URL}. ` +
      `En Android descárgala desde Google Play: ${SERVI_ANDROID_URL}`,
  },
  {
    keywords: [
      'registr',
      'crear cuenta',
      'crear perfil',
      'darme de alta',
      'inscrib',
    ],
    answer:
      `Para registrarte entra a ${SERVI_WEB_URL} o descarga la app, elige ` +
      '"Crear cuenta" y sigue los pasos. Si eres proveedor, crea tu perfil ' +
      'desde el registro de proveedor.',
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
      'Servi es gratis para clientes. Los proveedores eligen GRATIS, ESTÁNDAR ' +
      'o PREMIUM según el alcance y funciones que necesiten. Revisa y cambia ' +
      'tu plan desde el panel de proveedor.',
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
      'En Servi puedes ofrecer un Oficio, servicio Profesional o Negocio a ' +
      'clientes cercanos. Regístrate como proveedor, completa tu perfil y ' +
      'aparecerás en las búsquedas de tu zona.',
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
      `Con Servi buscas servicios locales cerca de ti, ves perfiles y contactas ` +
      `directo. Entra a ${SERVI_WEB_URL} o abre la app, busca la categoría y filtra por tu zona.`,
  },
  {
    keywords: ['que es servi', 'que es', 'para que sirve', 'sobre servi'],
    answer:
      'Servi es una plataforma peruana de servicios locales, con cobertura ' +
      'inicial en Huancayo y alrededores. Conecta clientes con proveedores ' +
      'cercanos de oficios, profesionales y negocios.',
  },
  {
    keywords: [
      'estafa',
      'confiab',
      'seguro',
      'resena',
      'opinion',
      'verificad',
      'sello',
    ],
    answer:
      'Revisa la información visible en cada perfil, como sellos y reseñas. ' +
      'Servi ayuda a comparar opciones, pero siempre decide con quién contactar.',
  },
  {
    keywords: [
      'donde funciona',
      'que ciudad',
      'huancayo',
      'junin',
      'provincia',
    ],
    answer:
      'Servi tiene cobertura inicial en Huancayo y alrededores, Junín. Busca ' +
      'por categoría y zona para ver proveedores disponibles.',
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
