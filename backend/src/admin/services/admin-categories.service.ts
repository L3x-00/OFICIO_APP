import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { clearProvidersCache as sharedClearProvidersCache } from './admin-shared.js';
import {
  type CanonicalProviderType,
  normalizeProviderType,
} from '../../common/provider-type.js';

/**
 * CRUD de Categorías — primera pieza extraída del "god object" AdminService
 * (hito M1). AdminService delega aquí vía Facade; el controller no cambia.
 *
 * Cada mutación de categoría invalida la caché de proveedores
 * (`clearProvidersCache`, helper compartido en admin-shared) para propagar
 * el cambio a mobile/web de inmediato.
 */
@Injectable()
export class AdminCategoriesService {
  private readonly logger = new Logger(AdminCategoriesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: any,
  ) {}

  async getCategories() {
    const categories = await this.prisma.category.findMany({
      include: {
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            forType: true,
          },
        },
        parent: { select: { id: true, name: true, forType: true } },
        _count: { select: { providerCategories: true } },
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });

    // El API nunca vuelve a exponer aliases legacy a Admin/Web.
    return categories.map((category) => ({
      ...category,
      forType: this.normalizeForType(
        category.forType,
        `tipo de la categoria ${category.id}`,
      ),
      parent: category.parent
        ? {
            ...category.parent,
            forType: this.normalizeForType(
              category.parent.forType,
              `tipo de la categoria padre ${category.parent.id}`,
            ),
          }
        : null,
      children: category.children.map((child) => ({
        ...child,
        forType: this.normalizeForType(
          child.forType,
          `tipo de la subcategoria ${child.id}`,
        ),
      })),
    }));
  }

  async createCategory(data: {
    name: string;
    slug: string;
    iconUrl?: string;
    parentId?: number;
    forType?: string | null;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: data.slug },
    });
    if (existing)
      throw new ConflictException(`El slug '${data.slug}' ya está en uso`);

    const forType = this.normalizeForType(data.forType);
    if (data.parentId != null) {
      const parent = await this.findParent(data.parentId);
      this.assertParentChildCompatibility(
        this.normalizeForType(parent.forType, 'tipo de la categoria padre'),
        forType,
      );
    }

    const created = await this.prisma.category.create({
      data: { ...data, forType },
    });
    await this.clearProvidersCache(); // propaga a mobile/web de inmediato
    return created;
  }

  async updateCategory(
    id: number,
    data: {
      name?: string;
      slug?: string;
      iconUrl?: string;
      parentId?: number | null;
      forType?: string | null;
      isActive?: boolean;
    },
  ) {
    const exists = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        parentId: true,
        forType: true,
        parent: { select: { id: true, forType: true } },
        _count: { select: { providerCategories: true } },
      },
    });
    if (!exists) throw new NotFoundException('Categoría no encontrada');

    if (data.slug && data.slug !== exists.slug) {
      const slugTaken = await this.prisma.category.findUnique({
        where: { slug: data.slug },
      });
      if (slugTaken)
        throw new ConflictException(`El slug '${data.slug}' ya está en uso`);
    }

    const changesForType = data.forType !== undefined;
    const changesParent = data.parentId !== undefined;
    if (data.parentId === id) {
      throw new BadRequestException(
        'Una categoria no puede ser su propia categoria padre',
      );
    }

    const currentOwnType = this.normalizeForType(
      exists.forType,
      'tipo de la categoria actual',
    );
    const currentParentType = this.normalizeForType(
      exists.parent?.forType,
      'tipo de la categoria padre actual',
    );
    const targetOwnType = changesForType
      ? this.normalizeForType(data.forType)
      : currentOwnType;

    const targetParent = changesParent
      ? data.parentId == null
        ? null
        : await this.findParent(data.parentId)
      : exists.parent;
    const targetParentType = this.normalizeForType(
      targetParent?.forType,
      'tipo de la categoria padre',
    );
    if (targetParent) {
      this.assertParentChildCompatibility(targetParentType, targetOwnType);
    }

    const currentEffectiveType = currentOwnType ?? currentParentType;
    const targetEffectiveType = targetOwnType ?? targetParentType;
    if (
      currentEffectiveType !== targetEffectiveType &&
      (exists._count?.providerCategories ?? 0) > 0
    ) {
      throw new ConflictException(
        'No se puede cambiar el tipo de una categoria con proveedores asociados. Crea una categoria nueva y migra sus asociaciones de forma controlada.',
      );
    }

    if (currentEffectiveType !== targetEffectiveType) {
      await this.assertChildrenCanKeepType(
        id,
        currentEffectiveType,
        targetEffectiveType,
      );
    }

    const { forType: _forType, parentId: _parentId, ...otherData } = data;
    const updateData = {
      ...otherData,
      ...(changesForType ? { forType: targetOwnType } : {}),
      ...(changesParent ? { parentId: data.parentId } : {}),
    };
    const updated = await this.prisma.category.update({
      where: { id },
      data: updateData,
    });
    await this.clearProvidersCache(); // refleja el cambio en proveedores ya
    return updated;
  }

  async toggleCategoryActive(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    const toggled = await this.prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });
    await this.clearProvidersCache();
    return toggled;
  }

  /**
   * Elimina una categoría. Las relaciones `providerCategories` y
   * `offerPostCategories` tienen `onDelete: Cascade` → los proveedores y
   * posts quedan desvinculados (como anuncia la UI). En cambio `children`
   * (subcategorías) y `serviceRequests` son RESTRICT → bloqueamos con un
   * mensaje claro en vez de un 500 de FK.
   */
  async deleteCategory(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { children: true, serviceRequests: true } },
      },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    if (category._count.children > 0) {
      throw new ConflictException(
        'No se puede eliminar: la categoría tiene subcategorías. Muévelas o elimínalas primero.',
      );
    }
    if (category._count.serviceRequests > 0) {
      throw new ConflictException(
        'No se puede eliminar: hay solicitudes de servicio asociadas a esta categoría.',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    await this.clearProvidersCache(); // desaparece de mobile/web de inmediato
    return { success: true, id };
  }

  // Invalida la caché de proveedores (helper compartido en admin-shared).
  private async clearProvidersCache(): Promise<void> {
    return sharedClearProvidersCache(this.cacheManager);
  }

  /** Input aliases normalize to canonical values. Null remains legacy shared. */
  private normalizeForType(
    value: string | null | undefined,
    field = 'forType',
  ): CanonicalProviderType | null {
    if (value == null) return null;

    const normalized = normalizeProviderType(value);
    if (!normalized) {
      throw new BadRequestException(
        `${field} debe ser OFICIO, PROFESIONAL o NEGOCIO`,
      );
    }
    return normalized;
  }

  private async findParent(parentId: number) {
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true, forType: true },
    });
    if (!parent) throw new NotFoundException('Categoria padre no encontrada');
    return parent;
  }

  /** An untyped child inherits its parent. A typed child must match it. */
  private assertParentChildCompatibility(
    parentType: CanonicalProviderType | null,
    childType: CanonicalProviderType | null,
  ): void {
    if (!parentType && childType) {
      throw new ConflictException(
        'Una subcategoria con tipo debe pertenecer a una categoria padre del mismo tipo',
      );
    }
    if (parentType && childType && parentType !== childType) {
      throw new ConflictException(
        'La categoria padre y la subcategoria deben pertenecer al mismo tipo de proveedor',
      );
    }
  }

  /** Protect inherited type changes when a child already has providers. */
  private async assertChildrenCanKeepType(
    categoryId: number,
    currentParentType: CanonicalProviderType | null,
    targetParentType: CanonicalProviderType | null,
  ): Promise<void> {
    const children =
      (await this.prisma.category.findMany({
        where: { parentId: categoryId },
        select: {
          id: true,
          forType: true,
          _count: { select: { providerCategories: true } },
        },
      })) ?? [];

    for (const child of children) {
      const childOwnType = this.normalizeForType(
        child.forType,
        'tipo de una subcategoria existente',
      );
      this.assertParentChildCompatibility(targetParentType, childOwnType);

      const currentChildType = childOwnType ?? currentParentType;
      const targetChildType = childOwnType ?? targetParentType;
      if (
        currentChildType !== targetChildType &&
        (child._count?.providerCategories ?? 0) > 0
      ) {
        throw new ConflictException(
          'No se puede reclasificar una categoria padre porque una subcategoria tiene proveedores asociados',
        );
      }
    }
  }
}
