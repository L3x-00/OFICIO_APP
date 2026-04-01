import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async toggle(userId: number, providerId: number) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_providerId: { userId, providerId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { userId_providerId: { userId, providerId } },
      });
      return { isFavorite: false };
    } else {
      await this.prisma.favorite.create({
        data: { userId, providerId },
      });
      return { isFavorite: true };
    }
  }

  async getUserFavorites(userId: number) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        provider: {
          include: {
            category: { select: { name: true } },
            images:   { orderBy: { order: 'asc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => f.provider);
  }
}