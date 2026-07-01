import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProviderFeaturesService } from '../common/provider-features.service.js';
import { MinioService } from '../common/minio.service.js';
import {
  planItemLimit,
  whatsappOrderUrl,
  groupStorefront,
} from '../common/storefront.helpers.js';
import { MENU_SECTIONS } from './dto/create-menu-item.dto.js';
import type { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import type { UpdateMenuItemDto } from './dto/update-menu-item.dto.js';
import type { ReorderItem } from '../common/dto/reorder.dto.js';

const FEATURE = 'carta_digital';
const LIMIT_FREE = 5;
const LIMIT_ESTANDAR = 6;

/**
 * Carta Digital. Feature-gate "carta_digital". Límites por plan
 * (GRATIS=5, ESTANDAR=6, PREMIUM=∞). `isFeatured` (menú del día) solo PREMIUM.
 */
@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: ProviderFeaturesService,
    private readonly minio: MinioService,
  ) {}

  /** Carta pública agrupada por sección (destacados primero, agotados al final). */
  async getPublicMenu(providerId: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        businessName: true,
        whatsapp: true,
        whatsappBiz: true,
        showWhatsapp: true,
      },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado.');

    const items = await this.prisma.menuItem.findMany({
      where: { providerId },
    });
    const wa = provider.showWhatsapp
      ? (provider.whatsapp ?? provider.whatsappBiz ?? null)
      : null;
    const withLinks = items.map((i) => ({
      ...i,
      whatsappOrderUrl: whatsappOrderUrl(wa, provider.businessName, i.name),
    }));
    return {
      providerId,
      sections: groupStorefront(withLinks, [...MENU_SECTIONS]),
    };
  }

  async addItem(userId: number, providerId: number, dto: CreateMenuItemDto) {
    await this.assertOwner(userId, providerId);
    await this.features.assertProviderHasFeature(providerId, FEATURE);
    const plan = await this.getPlan(providerId);

    if (dto.isFeatured) this.assertPremium(plan);

    const limit = planItemLimit(plan, LIMIT_FREE, LIMIT_ESTANDAR);
    if (Number.isFinite(limit)) {
      const count = await this.prisma.menuItem.count({ where: { providerId } });
      if (count >= limit) {
        throw new HttpException(
          'Alcanzaste el límite de platos de tu plan. Actualiza para añadir más.',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    return this.prisma.menuItem.create({
      data: {
        providerId,
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price,
        offerPrice: dto.offerPrice ?? null,
        category: dto.category ?? null,
        photoUrl: dto.photoUrl ?? null,
        isAvailable: dto.isAvailable ?? true,
        isFeatured: dto.isFeatured ?? false,
        order: dto.order ?? 0,
      },
    });
  }

  async updateItem(
    userId: number,
    providerId: number,
    itemId: number,
    dto: UpdateMenuItemDto,
  ) {
    await this.assertOwner(userId, providerId);
    await this.assertItemBelongs(itemId, providerId);
    if (dto.isFeatured) {
      this.assertPremium(await this.getPlan(providerId));
    }
    return this.prisma.menuItem.update({ where: { id: itemId }, data: dto });
  }

  async deleteItem(userId: number, providerId: number, itemId: number) {
    await this.assertOwner(userId, providerId);
    await this.assertItemBelongs(itemId, providerId);
    await this.prisma.menuItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  async toggle(userId: number, providerId: number, itemId: number) {
    await this.assertOwner(userId, providerId);
    const item = await this.assertItemBelongs(itemId, providerId);
    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable: !item.isAvailable },
    });
  }

  async uploadPhoto(
    userId: number,
    providerId: number,
    file: Express.Multer.File,
  ) {
    await this.assertOwner(userId, providerId);
    await this.features.assertProviderHasFeature(providerId, FEATURE);
    if (!file) throw new BadRequestException('No se recibió ninguna imagen.');
    const url = await this.minio.uploadFile(
      file.buffer,
      file.originalname,
      'menu',
    );
    return { url };
  }

  async reorder(userId: number, providerId: number, items: ReorderItem[]) {
    await this.assertOwner(userId, providerId);
    await this.prisma.$transaction(
      items.map((it) =>
        this.prisma.menuItem.updateMany({
          where: { id: it.id, providerId },
          data: { order: it.order },
        }),
      ),
    );
    return { updated: items.length };
  }

  // ── Helpers ────────────────────────────────────────────────

  private assertPremium(plan: string): void {
    if (plan !== 'PREMIUM') {
      throw new HttpException(
        'El menú del día (destacado) es exclusivo del plan Premium.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  private async assertOwner(userId: number, providerId: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, userId: true },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado.');
    if (provider.userId !== userId) {
      throw new ForbiddenException('No eres el dueño de este proveedor.');
    }
    return provider;
  }

  private async assertItemBelongs(itemId: number, providerId: number) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.providerId !== providerId) {
      throw new NotFoundException('Plato no encontrado.');
    }
    return item;
  }

  private async getPlan(providerId: number): Promise<string> {
    const sub = await this.prisma.subscription.findFirst({
      where: { providerId },
      select: { plan: true },
    });
    return sub?.plan ?? 'GRATIS';
  }
}
