import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { clearProvidersCache as sharedClearProvidersCache } from './admin-shared.js';

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
    return this.prisma.category.findMany({
      include: {
        children: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
        parent: { select: { id: true, name: true } },
        _count: { select: { providerCategories: true } },
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(data: {
    name: string;
    slug: string;
    iconUrl?: string;
    parentId?: number;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: data.slug },
    });
    if (existing)
      throw new ConflictException(`El slug '${data.slug}' ya está en uso`);

    const created = await this.prisma.category.create({ data });
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
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Categoría no encontrada');

    if (data.slug && data.slug !== exists.slug) {
      const slugTaken = await this.prisma.category.findUnique({
        where: { slug: data.slug },
      });
      if (slugTaken)
        throw new ConflictException(`El slug '${data.slug}' ya está en uso`);
    }

    const updated = await this.prisma.category.update({ where: { id }, data });
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
}
