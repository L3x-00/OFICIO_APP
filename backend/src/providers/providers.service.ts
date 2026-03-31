import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  // ── LISTAR proveedores con filtros opcionales ────────────
  async findAll(filters: {
    categorySlug?: string;
    availability?: string;
    onlyVerified?: boolean;
    search?: string;
    localityId?: number;
    lat?: number;
    lng?: number;
    page?: number;
    limit?: number;
  }) {
    const {
      categorySlug,
      availability,
      onlyVerified,
      search,
      localityId,
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {
      isVisible: true,
    };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }
    if (availability) {
      where.availability = availability;
    }
    if (onlyVerified) {
      where.isVerified = true;
    }
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (localityId) {
      where.localityId = localityId;
    }

    const skip = (page - 1) * limit;

    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { name: true, slug: true, iconUrl: true } },
          images: { orderBy: { order: 'asc' } },
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
          locality: { select: { name: true } },
        },
        orderBy: { averageRating: 'desc' },
      }),
      this.prisma.provider.count({ where }),
    ]);

    return {
      data: providers,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  // ── OBTENER un proveedor por ID ──────────────────────────
  async findOne(id: number) {
    return this.prisma.provider.findUnique({
      where: { id },
      include: {
        category: { select: { name: true, slug: true } },
        images: { orderBy: { order: 'asc' } },
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        locality: { select: { name: true, department: true } },
        reviews: {
          where: { isVisible: true },
          include: {
            user: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        subscription: {
          select: { plan: true, status: true, endDate: true },
        },
      },
    });
  }

  // ── LISTAR CATEGORÍAS ────────────────────────────────────
  async getCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true, iconUrl: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── REGISTRAR ANALYTIC (click WhatsApp, llamada) ─────────
  async trackEvent(providerId: number, eventType: string, userId?: number) {
    return this.prisma.providerAnalytic.create({
      data: { providerId, eventType, userId },
    });
  }
}