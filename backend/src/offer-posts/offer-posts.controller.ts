import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { OfferPostsService } from './offer-posts.service.js';
import {
  CreateOfferPostDto,
  UpdateOfferPostDto,
} from './dto/create-offer-post.dto.js';
import { ReportOfferDto } from './dto/report-offer.dto.js';
import { memOpts as multerImageConfig } from '../common/multer-image.config.js';
import { FeatureFlag } from '../common/feature-flag.guard.js';
import type { AuthenticatedRequest } from '../common/interfaces/auth-request.js';

// ── RUTAS PÚBLICAS ────────────────────────────────────────────
// Feature OCULTA (2026-07): sin FEATURE_OFERTAS=true responde 404.
// Los controllers ADMIN de abajo NO se flaguean (moderación de historial).
@Controller('offers')
@UseGuards(FeatureFlag('FEATURE_OFERTAS'))
export class OffersPublicController {
  constructor(private service: OfferPostsService) {}

  @Get()
  list(
    @Query('categorySlug') categorySlug?: string,
    @Query('categorySlugs') categorySlugs?: string,
    @Query('providerType') providerType?: string,
    @Query('department') department?: string,
    @Query('province') province?: string,
    @Query('district') district?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listOffers({
      categorySlug,
      categorySlugs,
      providerType,
      department,
      province,
      district,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  report(
    @Param('id', ParseIntPipe) offerId: number,
    @Body() dto: ReportOfferDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.reportOffer(req.user.userId, offerId, dto.reason);
  }
}

// ── RUTAS DE PROVEEDOR ───────────────────────────────────────
// Feature OCULTA (2026-07): ver nota de OffersPublicController.
@Controller('providers/me/offers')
@UseGuards(FeatureFlag('FEATURE_OFERTAS'), JwtAuthGuard, RolesGuard)
@Roles('PROVEEDOR')
export class ProviderOffersController {
  constructor(private service: OfferPostsService) {}

  @Get()
  getMyOffers(
    @Request() req: AuthenticatedRequest,
    @Query('type') type?: string,
  ) {
    return this.service.getMyOffersByUser(req.user.userId, type);
  }

  @Post()
  @UseInterceptors(FileInterceptor('photo', multerImageConfig))
  create(
    @Body() dto: CreateOfferPostDto,
    @Request() req: AuthenticatedRequest,
    @Query('type') type: string,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.service.createOfferByUser(req.user.userId, type, dto, photo);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) offerId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.deleteOfferByUser(req.user.userId, offerId);
  }

  // PATCH /providers/me/offers/:id — editar oferta. Acepta multipart si
  // se reemplaza la foto, o JSON sin foto. resetDuration:true reinicia
  // expiresAt al tope del plan vigente.
  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', multerImageConfig))
  update(
    @Param('id', ParseIntPipe) offerId: number,
    @Body() dto: UpdateOfferPostDto,
    @Request() req: AuthenticatedRequest,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.service.updateOfferByUser(req.user.userId, offerId, dto, photo);
  }
}

// ── RUTAS ADMIN OFERTAS ───────────────────────────────────────
// Listado completo de ofertas (activas/expiradas) con filtros para el
// panel admin: ubicación, tipo de proveedor, slug de categoría. Reusa
// `listOffers` del service pero pasa `includeInactive=true`.
@Controller('admin/offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminOffersController {
  constructor(private service: OfferPostsService) {}

  @Get()
  list(
    @Query('providerType') providerType?: string,
    @Query('department') department?: string,
    @Query('province') province?: string,
    @Query('district') district?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('categorySlugs') categorySlugs?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listOffers({
      providerType,
      department,
      province,
      district,
      categorySlug,
      categorySlugs,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }

  /**
   * Categorías que actualmente tienen ofertas vivas. El admin las muestra
   * como chips de filtro para no exponer toda la taxonomía cuando muchas
   * categorías no tienen ofertas.
   */
  @Get('categories')
  categories() {
    return this.service.getOfferCategories();
  }
}

// ── RUTAS ADMIN ───────────────────────────────────────────────
@Controller('admin/offer-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminOfferReportsController {
  constructor(private service: OfferPostsService) {}

  @Get()
  list(@Query('resolved') resolved?: string) {
    if (resolved === 'true') return this.service.listReports(true);
    if (resolved === 'false') return this.service.listReports(false);
    return this.service.listReports();
  }

  @Post(':id/resolve')
  resolve(
    @Param('id', ParseIntPipe) reportId: number,
    @Body('deactivateOffer') deactivateOffer: boolean,
  ) {
    return this.service.resolveReport(reportId, deactivateOffer ?? false);
  }
}
