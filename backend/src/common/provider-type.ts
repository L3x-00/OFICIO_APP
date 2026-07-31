/**
 * Tipos canónicos persistidos en Provider.type.
 *
 * IMPORTANTE: `PROFESSIONAL` fue un alias histórico de OFICIO en clientes
 * antiguos. El tipo nuevo se escribe siempre en español: `PROFESIONAL`.
 * Nunca intercambiar ambos valores.
 */
export const CANONICAL_PROVIDER_TYPES = [
  'OFICIO',
  'PROFESIONAL',
  'NEGOCIO',
] as const;

export type CanonicalProviderType = (typeof CANONICAL_PROVIDER_TYPES)[number];

/** Normaliza entradas de API. Las salidas deben usar siempre el valor canónico. */
export function normalizeProviderType(
  value: unknown,
): CanonicalProviderType | null {
  if (typeof value !== 'string') return null;

  switch (value.trim().toUpperCase()) {
    case 'OFICIO':
      return 'OFICIO';
    case 'PROFESIONAL':
      return 'PROFESIONAL';
    case 'NEGOCIO':
      return 'NEGOCIO';
    // Compatibilidad de clientes ya publicados. No equivale al nuevo tipo.
    case 'PROFESSIONAL':
      return 'OFICIO';
    case 'BUSINESS':
      return 'NEGOCIO';
    default:
      return null;
  }
}

export function isIndividualProviderType(type: CanonicalProviderType): boolean {
  return type === 'OFICIO' || type === 'PROFESIONAL';
}

export function providerTypeLabel(type: CanonicalProviderType): string {
  switch (type) {
    case 'OFICIO':
      return 'oficio';
    case 'PROFESIONAL':
      return 'servicio profesional';
    case 'NEGOCIO':
      return 'negocio';
  }
}
