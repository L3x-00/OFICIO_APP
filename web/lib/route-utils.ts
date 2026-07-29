// Rutas estáticas de nivel superior de la app — todo lo que NO es una de
// estas, con un solo segmento, es una vanity URL de proveedor (`/:slug`,
// antes `/p/:slug`). Si se agrega una ruta estática nueva de nivel
// superior, sumarla aquí también.
const TOP_LEVEL_STATIC_ROUTES = new Set([
  'buscar',
  'cliente',
  'login',
  'panel',
  'payments',
  'privacidad',
  'registrar-proveedor',
]);

/** true si el pathname es una vanity page de proveedor (`/algun-slug`). */
export function isVanitySlugPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 1) return false;
  return !TOP_LEVEL_STATIC_ROUTES.has(segments[0]);
}
