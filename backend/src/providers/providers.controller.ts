import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ProvidersService } from './providers.service.js';
import { Throttle } from '@nestjs/throttler';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { TrackEventDto } from './dto/track-event.dto.js';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  // Cachea el listado general de proveedores por 30 segundos.
  // El valor va en MILISEGUNDOS: Keyv (cache-manager v6/Prisma v7) interpreta
  // el TTL en ms, no en segundos. Con `30` las claves expiraban en 30 ms.
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @Get()
  findAll(
    @Query('categorySlug') categorySlug?: string,
    @Query('parentCategorySlug') parentCategorySlug?: string,
    @Query('availability') availability?: string,
    @Query('search') search?: string,
    @Query('localityId') localityId?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('verified') verified?: string,
    @Query('location') location?: string,
    @Query('department') department?: string,
    @Query('province') province?: string,
    @Query('district') district?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.providersService.findAll({
      categorySlug,
      parentCategorySlug,
      availability,
      search,
      localityId: localityId ? parseInt(localityId) : undefined,
      type,
      sortBy,
      verified: verified !== undefined ? verified === 'true' : undefined,
      location,
      department,
      province,
      district,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // SIN caché: los cambios de categoría desde el admin deben verse de
  // inmediato en mobile/web. El catálogo es pequeño y la query es barata.
  @Get('categories')
  getCategories(@Query('type') type?: string) {
    return this.providersService.getCategories(type);
  }

  @Get('admin/metrics')
  async getAdminMetrics() {
    return this.providersService.getAdminMetrics();
  }

  @Get('admin/grace-providers')
  async getGraceProviders() {
    return this.providersService.getGraceProviders();
  }

  // GET /providers/featured-grouped — home agrupada (carruseles por categoría).
  // Cache 60s: es una vista de portada, frecuente y de baja mutabilidad.
  // Ruta estática declarada ANTES de `:id` para que no la capture el param.
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000)
  @Get('featured-grouped')
  getFeaturedGrouped() {
    return this.providersService.getFeaturedGrouped();
  }

  // GET /providers/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.providersService.findOne(id);
  }

  // Este endpoint: máximo 10 eventos por minuto por IP
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post(':id/track')
  trackEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: TrackEventDto,
  ) {
    return this.providersService.trackEvent(id, body.eventType, body.userId);
  }

  // Máximo 5 recomendaciones por minuto por IP (anti-spam)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post(':id/recommend')
  addRecommendation(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId') userId: number,
  ) {
    return this.providersService.addRecommendation(+userId, id);
  }

  // POST /providers/report-issue — Proveedor reporta un problema de plataforma
  @Post('report-issue')
  createPlatformIssue(@Body() body: { userId: number; description: string }) {
    return this.providersService.createPlatformIssue(
      +body.userId,
      body.description,
    );
  }

  // POST /providers/:id/report — Cliente reporta un proveedor
  @Post(':id/report')
  createReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userId: number; reason: string; description?: string },
  ) {
    return this.providersService.createReport({
      providerId: id,
      userId: +body.userId,
      reason: body.reason,
      description: body.description,
    });
  }

  // GET /providers/:id/recommendation-status?userId=X
  @Get(':id/recommendation-status')
  getRecommendationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId') userId: string,
  ) {
    return this.providersService.getRecommendationStatus(+userId, id);
  }

  // POST /providers/:id/recommend-toggle
  @Post(':id/recommend-toggle')
  toggleRecommendation(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId') userId: number,
  ) {
    return this.providersService.toggleRecommendation(+userId, id);
  }
}
