import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Fila de providerCategory con los features de la categoría y su padre. */
type CategoryFeatureRow = {
  category?: {
    features?: unknown;
    parent?: { features?: unknown } | null;
  } | null;
} | null;

function toFeatureArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === 'string')
    : [];
}

/**
 * Computa los features EFECTIVOS (hija o, si vacía, heredados del padre) de un
 * conjunto de `providerCategories` ya cargadas. PURO (sin BD) — pensado para
 * incluir `features` en respuestas de listado/detalle SIN N+1: basta con
 * seleccionar `category.features` + `category.parent.features` en el query.
 */
export function effectiveFeaturesFromCategories(
  rows: CategoryFeatureRow[],
): string[] {
  const set = new Set<string>();
  for (const r of rows ?? []) {
    const own = toFeatureArray(r?.category?.features);
    const eff = own.length
      ? own
      : toFeatureArray(r?.category?.parent?.features);
    eff.forEach((f) => set.add(f));
  }
  return [...set];
}

/** Superficie que consume el array de features. */
export type FeatureSurface = 'public' | 'panel';

/**
 * Reducción de superficie (2026-07): filtra qué features son VISIBLES según
 * tipo de proveedor y kill-switches de entorno. El móvil deriva sus CTAs y
 * entradas del panel 100% de este array → filtrar aquí oculta la UI incluso
 * en .aab ya instalados, sin recompilar.
 *
 * Reglas:
 * - `carta_digital`/`catalogo`: SOLO proveedores NEGOCIO (los OFICIO quedan
 *   con chat/contacto). Ambas superficies.
 * - `agenda`/`cotizacion`: OCULTAS al público salvo FEATURE_AGENDA /
 *   FEATURE_COTIZACION = 'true' en env. El PANEL las conserva para que el
 *   proveedor atienda citas/cotizaciones YA existentes (se drenan solas);
 *   nuevas no pueden crearse porque el CTA público desaparece y el endpoint
 *   de creación está flagueado.
 */
export function visibleProviderFeatures(
  features: string[],
  providerType: string | null | undefined,
  surface: FeatureSurface,
): string[] {
  return features.filter((f) => {
    if (
      (f === 'carta_digital' || f === 'catalogo') &&
      providerType !== 'NEGOCIO'
    ) {
      return false;
    }
    if (
      f === 'agenda' &&
      surface === 'public' &&
      process.env.FEATURE_AGENDA !== 'true'
    ) {
      return false;
    }
    if (
      f === 'cotizacion' &&
      surface === 'public' &&
      process.env.FEATURE_COTIZACION !== 'true'
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Resuelve las FUNCIONALIDADES (features) habilitadas para una categoría o un
 * proveedor. Una categoría hija HEREDA los features del padre si su propio
 * array está vacío. El feature-gating de los módulos (agenda, carta_digital,
 * catalogo, cotizacion) se apoya en este servicio.
 *
 * Cross-cutting → vive en un módulo @Global ([[ProviderFeaturesModule]]).
 */
@Injectable()
export class ProviderFeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Features efectivos de una categoría (propios, o heredados del padre). */
  async getCategoryFeatures(categoryId: number): Promise<string[]> {
    const cat = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { features: true, parent: { select: { features: true } } },
    });
    if (!cat) return [];
    const own = this.toArray(cat.features);
    return own.length ? own : this.toArray(cat.parent?.features);
  }

  /** Unión de los features de TODAS las categorías de un proveedor. */
  async getProviderFeatures(providerId: number): Promise<string[]> {
    const rows = await this.prisma.providerCategory.findMany({
      where: { providerId },
      select: {
        category: {
          select: { features: true, parent: { select: { features: true } } },
        },
      },
    });
    return effectiveFeaturesFromCategories(rows);
  }

  /** ¿El proveedor tiene habilitado `feature`? */
  async providerHasFeature(
    providerId: number,
    feature: string,
  ): Promise<boolean> {
    const features = await this.getProviderFeatures(providerId);
    return features.includes(feature);
  }

  /** Igual que `providerHasFeature` pero lanza 403 si no lo tiene. */
  async assertProviderHasFeature(
    providerId: number,
    feature: string,
  ): Promise<void> {
    if (!(await this.providerHasFeature(providerId, feature))) {
      throw new ForbiddenException(
        `Este proveedor no tiene habilitada la funcionalidad "${feature}".`,
      );
    }
  }

  /** Normaliza el campo Json `features` a string[] (defensivo). */
  private toArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((x): x is string => typeof x === 'string')
      : [];
  }
}
