/**
 * Helpers compartidos por los módulos de "vitrina" (Carta Digital y Catálogo):
 * límites por plan, link de pedido por WhatsApp y agrupado de la vista pública.
 */

/** Límite de ítems según el plan. PREMIUM = ilimitado (Infinity). */
export function planItemLimit(
  plan: string,
  free: number,
  estandar: number,
): number {
  if (plan === 'PREMIUM') return Infinity;
  if (plan === 'ESTANDAR') return estandar;
  return free; // GRATIS / sin suscripción
}

/** Link wa.me prearmado hacia el proveedor (null si no hay número). */
export function whatsappOrderUrl(
  whatsapp: string | null | undefined,
  businessName: string,
  itemName: string,
): string | null {
  const digits = (whatsapp ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const text = encodeURIComponent(
    `Hola ${businessName}, quiero pedir: ${itemName}`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

interface StorefrontItem {
  category?: string | null;
  isAvailable: boolean;
  isFeatured?: boolean;
  order: number;
  name: string;
}

/**
 * Agrupa por sección para la vista PÚBLICA:
 *  - destacados (isFeatured) primero, disponibles antes que agotados,
 *  - dentro de cada sección por `order` y luego nombre,
 *  - secciones ordenadas según `sectionOrder` (las no listadas, al final A-Z).
 * Ítems sin `category` van a la sección "otros".
 */
export function groupStorefront<T extends StorefrontItem>(
  items: T[],
  sectionOrder: string[] = [],
): Array<{ section: string; items: T[] }> {
  const rank = (i: T) => (i.isAvailable === false ? 2 : i.isFeatured ? 0 : 1);
  const sorted = [...items].sort(
    (a, b) =>
      rank(a) - rank(b) || a.order - b.order || a.name.localeCompare(b.name),
  );

  const map = new Map<string, T[]>();
  for (const it of sorted) {
    const sec = (it.category && it.category.trim()) || 'otros';
    if (!map.has(sec)) map.set(sec, []);
    map.get(sec)!.push(it);
  }

  const orderIdx = (s: string) => {
    const i = sectionOrder.indexOf(s);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const keys = [...map.keys()].sort(
    (a, b) => orderIdx(a) - orderIdx(b) || a.localeCompare(b),
  );

  return keys.map((section) => ({ section, items: map.get(section)! }));
}
