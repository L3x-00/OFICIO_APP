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
