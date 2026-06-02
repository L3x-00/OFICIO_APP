/**
 * Helpers compartidos por AdminService (Facade) y los servicios extraídos
 * del god object: categories / dashboard / trust / payments.
 *
 * Son funciones puras (o que reciben el `cacheManager` por parámetro) para
 * tener UNA sola fuente de verdad sin introducir una dependencia DI extra ni
 * duplicar la lógica en cada servicio.
 */

/**
 * Inyecta un alias `category: { name }` derivado de la primera entrada en
 * `providerCategories[0].category` para retrocompatibilidad con el frontend
 * admin/web que aún lee `provider.category.name` (modelo singular legado).
 * No altera `providerCategories` — coexisten ambos.
 */
export function withCategoryAlias<
  T extends { providerCategories?: Array<{ category: { name: string } }> },
>(p: T): T & { category: { name: string } } {
  const name = p?.providerCategories?.[0]?.category?.name ?? 'Sin categoría';
  return { ...p, category: { name } };
}

/**
 * plan + status → prioridad de listado (1 = más arriba). Solo las
 * suscripciones ACTIVA escalan; cualquier otro estado cae a la cola (4).
 */
export function planToPriority(plan: string, status: string): number {
  if (status !== 'ACTIVA') return 4;
  switch (plan) {
    case 'PREMIUM':
      return 1;
    case 'ESTANDAR':
      return 2;
    case 'GRATIS':
      return 3;
    default:
      return 4;
  }
}

/**
 * Invalida la caché de proveedores en Redis por prefijo `providers_*`.
 * Borrado SELECTIVO — ya no usamos flushAll para no purgar caches de otros
 * módulos en el mismo Redis. Recibe el `cacheManager` por parámetro.
 */
export async function clearProvidersCache(cacheManager: any): Promise<void> {
  const PATTERN = 'providers_*';
  try {
    const cm = cacheManager;
    const client =
      cm?.store?.getClient?.() ?? cm?.client ?? cm?.store?.client ?? null;

    // Caso ideal: cliente Redis con SCAN (cache-manager-redis-yet expone uno).
    if (client && typeof client.scanIterator === 'function') {
      const toDelete: string[] = [];
      for await (const key of client.scanIterator({
        MATCH: PATTERN,
        COUNT: 200,
      })) {
        toDelete.push(key as string);
      }
      if (toDelete.length > 0 && typeof client.del === 'function') {
        await client.del(toDelete);
      }
      return;
    }

    // Fallback: KEYS (bloqueante, solo en datasets pequeños).
    if (client && typeof client.keys === 'function') {
      const keys: string[] = await client.keys(PATTERN);
      if (keys.length > 0) {
        if (typeof client.del === 'function') await client.del(keys);
        else {
          for (const k of keys) await cm.del?.(k);
        }
      }
      return;
    }

    // Último recurso: si el cache-manager no expone client, intentamos
    // borrar por nombre conocido (lista vacía → no-op). NO hacemos
    // flushAll para evitar afectar caches no relacionadas.
  } catch {
    // Si la limpieza falla, el TTL natural (~30s) invalida la caché.
  }
}
