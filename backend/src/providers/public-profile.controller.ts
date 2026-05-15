import { Controller, Get, Param, NotFoundException, Patch, Body, UseGuards, Request, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { slugify, uniqueSlug } from '../common/slug.util.js';

/**
 * Endpoints públicos del perfil Vanity URL.
 *
 *   GET /profiles/:slug         — datos minimal para la tarjeta web/SSR.
 *   PATCH /profiles/me/slug     — el proveedor edita su slug (una sola vez).
 *
 * El payload de GET es minimalista por diseño: solo lo necesario para
 * pintar la tarjeta de presentación (nombre, profesión, rating, foto,
 * categorías) y para que el meta-tagger del frontend genere og:image,
 * og:title y og:description sin pegarle a múltiples endpoints.
 */
@Controller('profiles')
export class PublicProfileController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /profiles/:slug — público, sin autenticación. Indexable por Google.
   *
   * Filtra `isVisible: true` para no exponer proveedores PENDIENTES o
   * RECHAZADOS. Si no hay match, 404 — el frontend devuelve la página
   * "Perfil no encontrado".
   */
  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { slug, isVisible: true },
      select: {
        id:                   true,
        slug:                 true,
        businessName:         true,
        description:          true,
        type:                 true,
        averageRating:        true,
        totalReviews:         true,
        totalRecommendations: true,
        isVerified:           true,
        isTrusted:            true,
        hasHomeService:       true,
        phone:                true,
        whatsapp:             true,
        website:              true,
        instagram:            true,
        tiktok:               true,
        facebook:             true,
        images: {
          where:   { isCover: true },
          select:  { url: true },
          take:    1,
        },
        providerCategories: {
          select: { category: { select: { name: true, slug: true } } },
        },
        locality: { select: { name: true, department: true, province: true, district: true } },
        subscription: { select: { plan: true, status: true } },
      },
    });

    if (!provider) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const cover = provider.images[0]?.url ?? null;
    const categories = provider.providerCategories.map((pc) => pc.category);

    // Reshape para SSR-friendly. Omite IDs internos del frontend público.
    return {
      slug:                 provider.slug,
      businessName:         provider.businessName,
      description:          provider.description,
      type:                 provider.type,
      averageRating:        provider.averageRating,
      totalReviews:         provider.totalReviews,
      totalRecommendations: provider.totalRecommendations,
      isVerified:           provider.isVerified,
      isTrusted:            provider.isTrusted,
      hasHomeService:       provider.hasHomeService,
      coverUrl:             cover,
      categories,
      locality:             provider.locality,
      plan:                 provider.subscription?.plan ?? 'GRATIS',
      // Datos de contacto solo para abrir WhatsApp / llamada desde la
      // tarjeta web — no exponemos el id numérico ni el email.
      contact: {
        phone:    provider.phone,
        whatsapp: provider.whatsapp,
        website:  provider.website,
        instagram: provider.instagram,
        tiktok:    provider.tiktok,
        facebook:  provider.facebook,
      },
    };
  }

  /**
   * PATCH /profiles/me/slug — el dueño edita su slug. Permitido UNA sola
   * vez (gate por `slugEditedAt`). El admin puede cambiarlo cuantas veces
   * quiera vía un endpoint separado (no incluido aquí).
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me/slug')
  async editMySlug(
    @Request() req: any,
    @Body() body: { providerId: number; slug: string },
  ) {
    const desired = slugify(body.slug ?? '');
    if (!desired || desired.length < 3) {
      throw new BadRequestException('El slug debe tener al menos 3 caracteres.');
    }

    const provider = await this.prisma.provider.findFirst({
      where: { id: body.providerId, userId: req.user.userId },
      select: { id: true, slug: true, slugEditedAt: true },
    });
    if (!provider) throw new NotFoundException('Perfil no encontrado.');
    if (provider.slugEditedAt) {
      throw new ConflictException(
        'Ya editaste tu URL una vez. Contacta soporte si necesitas otro cambio.',
      );
    }

    const finalSlug = await uniqueSlug(desired, async (candidate) => {
      if (candidate === provider.slug) return false;
      const hit = await this.prisma.provider.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return Boolean(hit) && hit!.id !== provider.id;
    });

    return this.prisma.provider.update({
      where: { id: provider.id },
      data:  { slug: finalSlug, slugEditedAt: new Date() },
      select: { id: true, slug: true, slugEditedAt: true },
    });
  }
}
