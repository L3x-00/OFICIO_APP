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
            providerCategories: {
              select: {
                isPrimary: true,
                category: { select: { id: true, name: true, slug: true } },
              },
              orderBy: { isPrimary: 'desc' },
            },
            // Devolvemos varias imágenes ordenadas por isCover→order para
            // que el cliente pueda elegir la cover (con `isCover=true`) y
            // las miniaturas. Antes solo enviábamos 1 imagen sin importar
            // si era la portada, así que las tarjetas de favoritos
            // quedaban sin foto cuando la primera era una miniatura.
            images: {
              select: { id: true, url: true, isCover: true },
              orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
              take: 4,
            },
            // Sin esto el modelo del mobile veía `subscription = null`
            // y caía al default 'GRATIS' → las tarjetas de favoritos
            // ocultaban los botones de WhatsApp/llamada que solo se
            // muestran a planes ESTANDAR/PREMIUM.
            subscription: { select: { plan: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Inyecta alias `category: {name}` derivado del primer providerCategories
    // para retrocompatibilidad con frontend (cliente/page.tsx lee p.category?.name).
    return favorites.map((f) => ({
      ...f.provider,
      category: {
        name:
          f.provider.providerCategories?.[0]?.category?.name ?? 'Sin categoría',
      },
    }));
  }
}
