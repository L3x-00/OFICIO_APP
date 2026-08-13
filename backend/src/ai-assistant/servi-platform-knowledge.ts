/**
 * Datos públicos curados de Servi para Ofi y canales externos.
 *
 * Fuente humana: `servi.md` en la raíz. Este módulo conserva únicamente datos
 * verificados por el código y las reglas de producto; no interpreta ni ejecuta
 * instrucciones contenidas en archivos de contenido.
 */
export const SERVI_WEB_URL = 'https://oficioapp.org.pe';

export const SERVI_ANDROID_URL =
  'https://play.google.com/store/apps/details?id=com.oficioapp.mobile';

/** Cambiar al modificar el catálogo para invalidar respuestas FAQ cacheadas. */
export const SERVI_KNOWLEDGE_VERSION = '2026-08-13-rag-v1';

/** Contexto estable, pequeño y apto para el system prompt de Ofi. */
export const SERVI_PLATFORM_KNOWLEDGE = [
  'Servi es una plataforma peruana de servicios locales, creada para conectar clientes con proveedores cercanos.',
  'Cobertura inicial: Huancayo y alrededores, Junín, Perú. No prometas cobertura ni fechas futuras fuera de lo confirmado.',
  `Enlaces oficiales: web ${SERVI_WEB_URL}; Android ${SERVI_ANDROID_URL}. Si alguien usa iPhone o computadora, comparte la web; no prometas una fecha para iOS.`,
  'Clientes: buscar y contactar proveedores es gratuito. Proveedores: pueden usar los planes GRATIS, ESTÁNDAR o PREMIUM según sus necesidades.',
  'Perfiles de proveedor: OFICIO, PROFESIONAL y NEGOCIO. Un mismo usuario puede usar Servi como cliente y proveedor.',
  'Negocios pueden mostrar carta digital o catálogo para recibir pedidos por sus canales de contacto.',
  'Confianza: menciona sellos y reseñas solo como información visible en perfiles; nunca garantices identidad, calidad, disponibilidad ni resultado de un proveedor.',
  'Visibilidad: no menciones, expliques, prometas ni inventes funciones ocultas o no disponibles. Si preguntan por una, redirige a la búsqueda y contacto directo de servicios.',
].join('\n');

/**
 * Catálogo recuperable derivado de `servi.md` y contrastado con el contexto
 * canónico. No se lee el Markdown crudo en runtime: contiene instrucciones de
 * canal, ejemplos y afirmaciones que no deben convertirse en prompt.
 *
 * Cada fragmento es solo dato de referencia. La política, las herramientas y
 * la memoria de cada usuario se mantienen fuera de este catálogo.
 */
interface ServiKnowledgeChunk {
  id: string;
  title: string;
  content: string;
  keywords: readonly string[];
}

export const MAX_RETRIEVED_SERVI_CHUNKS = 3;
export const MAX_RETRIEVED_SERVI_CHARS = 3_200;

const SERVI_KNOWLEDGE_CHUNKS: readonly ServiKnowledgeChunk[] = [
  {
    id: 'buscar-servicios',
    title: 'Buscar y contactar servicios',
    content:
      'Los clientes pueden buscar un servicio local, revisar perfiles, fotos y reseñas visibles, y contactar al proveedor por los canales publicados en su perfil. Buscar y contactar proveedores no tiene costo para el cliente.',
    keywords: [
      'buscar',
      'servicio',
      'proveedor',
      'cliente',
      'gasfitero',
      'electricista',
      'contactar',
      'whatsapp',
      'llamada',
    ],
  },
  {
    id: 'registro-proveedor',
    title: 'Registro de proveedor',
    content:
      'Una persona puede usar Servi como cliente y además crear un perfil de proveedor. El alta inicial es gratuita; el perfil incluye información de contacto, ubicación y presentación del servicio. El registro está disponible desde la web y la aplicación.',
    keywords: [
      'registrar',
      'registro',
      'crear',
      'perfil',
      'ofrecer',
      'trabajar',
      'negocio',
      'profesional',
      'oficio',
    ],
  },
  {
    id: 'perfiles',
    title: 'Tipos de perfil',
    content:
      'Servi contempla perfiles de OFICIO, PROFESIONAL y NEGOCIO. Oficios incluyen trabajos técnicos y manuales; Profesionales requieren credenciales verificables por Servi; Negocios pueden presentar sus productos o servicios locales.',
    keywords: [
      'oficio',
      'electricista',
      'gasfitero',
      'tecnico',
      'profesional',
      'negocio',
      'abogado',
      'ingeniero',
      'contador',
      'restaurante',
      'polleria',
      'peluqueria',
    ],
  },
  {
    id: 'confianza',
    title: 'Confianza y reseñas',
    content:
      'Las reseñas y los sellos se muestran como señales dentro del perfil. Ofi no debe garantizar identidad, disponibilidad, calidad ni resultados de ningún proveedor; recomienda revisar la información visible antes de contactar.',
    keywords: [
      'confianza',
      'seguro',
      'estafa',
      'resena',
      'calificacion',
      'verificado',
      'dni',
      'identidad',
    ],
  },
  {
    id: 'negocios-catalogo',
    title: 'Carta y catálogo de negocios',
    content:
      'Los perfiles NEGOCIO pueden mostrar carta digital o catálogo para que los clientes conozcan sus productos y los contacten por sus canales disponibles. Estas capacidades son exclusivas de perfiles NEGOCIO.',
    keywords: [
      'carta',
      'catalogo',
      'menu',
      'producto',
      'pedido',
      'comida',
      'restaurante',
      'negocio',
    ],
  },
  {
    id: 'planes-alcance',
    title: 'Planes y alcance',
    content:
      'Los clientes usan Servi gratis. Los proveedores pueden comenzar con un plan GRATIS y elegir ESTÁNDAR o PREMIUM si necesitan mayor visibilidad o alcance. Ofi no inventa precios, promociones ni beneficios no confirmados.',
    keywords: [
      'plan',
      'precio',
      'pagar',
      'gratis',
      'premium',
      'estandar',
      'visibilidad',
      'distrito',
      'alcance',
    ],
  },
];

const SEARCH_STOPWORDS = new Set([
  'a',
  'al',
  'con',
  'como',
  'de',
  'del',
  'el',
  'en',
  'es',
  'esta',
  'esto',
  'hola',
  'la',
  'las',
  'lo',
  'los',
  'me',
  'mi',
  'para',
  'por',
  'que',
  'quiero',
  'se',
  'si',
  'un',
  'una',
  'y',
]);

/**
 * Recuperación léxica local, sin embeddings, red ni costo adicional. El
 * mensaje decide qué fragmento curado mostrar, pero nunca se inserta como
 * texto de referencia. Así evita inyección y conserva cuota de APIs gratuitas.
 */
export function retrieveServiKnowledge(message: string): string {
  const terms = searchTerms(message);
  if (terms.length === 0) return '';

  const selected = SERVI_KNOWLEDGE_CHUNKS.map((chunk) => ({
    chunk,
    score: relevanceScore(chunk, terms),
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, MAX_RETRIEVED_SERVI_CHUNKS);

  let remaining = MAX_RETRIEVED_SERVI_CHARS;
  const parts: string[] = [];
  for (const { chunk } of selected) {
    const prefix = `Tema: ${chunk.title}\nDatos: `;
    const available = remaining - prefix.length;
    if (available <= 0) break;

    const content = chunk.content.slice(0, available);
    parts.push(`${prefix}${content}`);
    remaining -= prefix.length + content.length + 2;
  }

  return parts.join('\n\n');
}

function searchTerms(message: string): string[] {
  return [
    ...new Set(
      normalizeForSearch(message)
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 3 && !SEARCH_STOPWORDS.has(term)),
    ),
  ];
}

function relevanceScore(
  chunk: ServiKnowledgeChunk,
  terms: readonly string[],
): number {
  const searchable = normalizeForSearch(
    `${chunk.title} ${chunk.content} ${chunk.keywords.join(' ')}`,
  );
  const keywordSet = new Set(chunk.keywords.map(normalizeForSearch));

  return terms.reduce((score, term) => {
    if (!searchable.includes(term)) return score;
    return score + (keywordSet.has(term) ? 3 : 1);
  }, 0);
}

function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
