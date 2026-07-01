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
import type { CreateCatalogProductDto } from './dto/create-catalog-product.dto.js';
import type { UpdateCatalogProductDto } from './dto/update-catalog-product.dto.js';
import type { ReorderItem } from '../common/dto/reorder.dto.js';

const FEATURE = 'catalogo';
const LIMIT_FREE = 5;
const LIMIT_ESTANDAR = 6;

/**
 * Catálogo de Productos. Feature-gate "catalogo". Límites por plan
 * (GRATIS=5, ESTANDAR=6, PREMIUM=∞). Sin "destacado". Categoría libre.
 */
@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: ProviderFeaturesService,
    private readonly minio: MinioService,
  ) {}

  /** Catálogo público agrupado por sección (disponibles antes que agotados). */
  async getPublicCatalog(providerId: number) {
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

    const items = await this.prisma.catalogProduct.findMany({
      where: { providerId },
    });
    const wa = provider.showWhatsapp
      ? (provider.whatsapp ?? provider.whatsappBiz ?? null)
      : null;
    const withLinks = items.map((i) => ({
      ...i,
      whatsappOrderUrl: whatsappOrderUrl(wa, provider.businessName, i.name),
    }));
    return { providerId, sections: groupStorefront(withLinks) };
  }

  async addProduct(
    userId: number,
    providerId: number,
    dto: CreateCatalogProductDto,
  ) {
    await this.assertOwner(userId, providerId);
    await this.features.assertProviderHasFeature(providerId, FEATURE);
    const plan = await this.getPlan(providerId);

    const limit = planItemLimit(plan, LIMIT_FREE, LIMIT_ESTANDAR);
    if (Number.isFinite(limit)) {
      const count = await this.prisma.catalogProduct.count({
        where: { providerId },
      });
      if (count >= limit) {
        throw new HttpException(
          'Alcanzaste el límite de productos de tu plan. Actualiza para añadir más.',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    return this.prisma.catalogProduct.create({
      data: {
        providerId,
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price,
        offerPrice: dto.offerPrice ?? null,
        stock: dto.stock ?? null,
        category: dto.category ?? null,
        photoUrl: dto.photoUrl ?? null,
        isAvailable: dto.isAvailable ?? true,
        order: dto.order ?? 0,
      },
    });
  }

  async updateProduct(
    userId: number,
    providerId: number,
    productId: number,
    dto: UpdateCatalogProductDto,
  ) {
    await this.assertOwner(userId, providerId);
    await this.assertProductBelongs(productId, providerId);
    return this.prisma.catalogProduct.update({
      where: { id: productId },
      data: dto,
    });
  }

  async deleteProduct(userId: number, providerId: number, productId: number) {
    await this.assertOwner(userId, providerId);
    await this.assertProductBelongs(productId, providerId);
    await this.prisma.catalogProduct.delete({ where: { id: productId } });
    return { success: true };
  }

  async toggle(userId: number, providerId: number, productId: number) {
    await this.assertOwner(userId, providerId);
    const product = await this.assertProductBelongs(productId, providerId);
    return this.prisma.catalogProduct.update({
      where: { id: productId },
      data: { isAvailable: !product.isAvailable },
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
      'catalog',
    );
    return { url };
  }

  async reorder(userId: number, providerId: number, items: ReorderItem[]) {
    await this.assertOwner(userId, providerId);
    await this.prisma.$transaction(
      items.map((it) =>
        this.prisma.catalogProduct.updateMany({
          where: { id: it.id, providerId },
          data: { order: it.order },
        }),
      ),
    );
    return { updated: items.length };
  }

  // ── Helpers ────────────────────────────────────────────────

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

  private async assertProductBelongs(productId: number, providerId: number) {
    const product = await this.prisma.catalogProduct.findUnique({
      where: { id: productId },
    });
    if (!product || product.providerId !== providerId) {
      throw new NotFoundException('Producto no encontrado.');
    }
    return product;
  }

  private async getPlan(providerId: number): Promise<string> {
    const sub = await this.prisma.subscription.findFirst({
      where: { providerId },
      select: { plan: true },
    });
    return sub?.plan ?? 'GRATIS';
  }
}
