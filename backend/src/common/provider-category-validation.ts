import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import {
  type CanonicalProviderType,
  normalizeProviderType,
} from './provider-type.js';

type CategoryLookup = Pick<PrismaService, 'category'>;

/**
 * Valida Especialidades contra el tipo de perfil sin romper el catálogo
 * legacy, que aún tiene categorías sin `forType`.
 *
 * - PROFESIONAL exige una categoría marcada explícitamente PROFESIONAL.
 * - OFICIO/NEGOCIO pueden usar filas legacy sin tipo mientras el catálogo se
 *   clasifica, pero nunca una categoría marcada para otro tipo.
 */
export async function validateProviderCategorySelection(
  prisma: CategoryLookup,
  categoryIds: unknown,
  providerType: CanonicalProviderType,
  max = 6,
): Promise<number[]> {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    throw new BadRequestException(
      'Debes seleccionar al menos una Especialidad',
    );
  }

  const ids = Array.from(new Set(categoryIds.map((id) => Number(id))));
  if (ids.length > max || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new BadRequestException('IDs de categoría inválidos');
  }

  const categories = await prisma.category.findMany({
    where: { id: { in: ids }, isActive: true },
    select: {
      id: true,
      parentId: true,
      forType: true,
      parent: { select: { forType: true } },
    },
  });

  if (categories.length !== ids.length) {
    throw new BadRequestException(
      'Una o más categorías no existen o están inactivas',
    );
  }

  for (const category of categories) {
    if (category.parentId == null) {
      throw new BadRequestException(
        'Selecciona una Especialidad, no una categoría principal',
      );
    }

    const ownType = category.forType
      ? normalizeProviderType(category.forType)
      : null;
    const parentType = category.parent?.forType
      ? normalizeProviderType(category.parent.forType)
      : null;

    if (
      (category.forType && !ownType) ||
      (category.parent?.forType && !parentType) ||
      (ownType && parentType && ownType !== parentType)
    ) {
      throw new BadRequestException(
        'La configuración de una categoría no es válida. Contacta con soporte.',
      );
    }

    const effectiveType = ownType ?? parentType;
    if (providerType === 'PROFESIONAL' && effectiveType !== 'PROFESIONAL') {
      throw new BadRequestException(
        'Las especialidades profesionales deben pertenecer a Servicios profesionales',
      );
    }
    if (effectiveType && effectiveType !== providerType) {
      throw new BadRequestException(
        'La Especialidad elegida no corresponde al tipo de perfil',
      );
    }
  }

  // Conserva el orden enviado: el primer elemento es la Especialidad principal.
  return ids;
}
