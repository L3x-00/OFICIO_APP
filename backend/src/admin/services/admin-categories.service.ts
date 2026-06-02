import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../prisma/prisma.service.js';

/**
 * CRUD de Categorías — primera pieza extraída del "god object" AdminService
 * (hito M1). AdminService delega aquí vía Facade; el controller no cambia.
 *
 * Mantiene su propia invalidación de caché (`clearProvidersCache`) para ser
 * autónomo: cada mutación de categoría debe propagarse a mobile/web de
 * inmediato. El helper se duplica a propósito porque AdminService aún lo usa
 * para otras mutaciones (proveedores, suscripciones); una futura extracción
 * de un `ProvidersCacheService` compartido lo unificará.
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

  // ── HELPER: INVALIDAR CACHÉ DE PROVEEDORES ───────────────
  // Borrado SELECTIVO por prefijo "providers_*" — ya no usamos flushAll
  // para no purgar caches de otros módulos en el mismo Redis.
  private async clearProvidersCache(): Promise<void> {
    const PATTERN = 'providers_*';
    try {
      const cm = this.cacheManager;
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
}
