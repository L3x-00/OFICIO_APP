/**
 * Utilities para generar slugs URL-friendly únicos a partir de nombres
 * de negocio o profesional. Usado por Vanity URLs (`/p/:slug`).
 *
 * - Quita acentos, pasa a minúsculas y reemplaza no-alfanuméricos por
 *   guiones. Recorta a 60 chars máx para que la URL no se vuelva
 *   inmanejable.
 * - Si ya existe en la BD, sufija con `-2`, `-3`, etc. hasta encontrar
 *   uno libre. Random suffix no — los slugs deben ser memorables.
 */

/** Normaliza un string arbitrario a un slug seguro para URLs. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remueve acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // descarta puntuación
    .replace(/\s+/g, '-')         // espacios → guiones
    .replace(/-+/g, '-')          // colapsa guiones consecutivos
    .replace(/^-|-$/g, '')        // recorta guiones al inicio/final
    .slice(0, 60);
}

/**
 * Construye un slug único contra la BD. Recibe la función `exists`
 * para chequear colisiones y va probando `slug`, `slug-2`, `slug-3`...
 * hasta encontrar uno libre. La caller pasa la closure de Prisma:
 *
 * ```ts
 * await uniqueSlug(name, (s) =>
 *   prisma.provider.findUnique({ where: { slug: s } }).then(Boolean)
 * );
 * ```
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const baseSlug = slugify(base) || 'usuario';
  if (!(await exists(baseSlug))) return baseSlug;

  // Hasta 99 sufijos numéricos; en producción real, sería extremadamente
  // raro chocar con tantos slugs idénticos.
  for (let i = 2; i <= 99; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  // Fallback ultra-defensivo: append timestamp si todos los 2..99
  // colisionan (no debería pasar nunca).
  return `${baseSlug}-${Date.now().toString(36)}`;
}
