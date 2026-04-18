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

  // Cachea el listado general de proveedores por 2 minutos
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
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
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // Cachea el listado de categorías por 10 minutos
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600)
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

  @Get('admin/analytics')
  async getAnalytics(@Query('days') days: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.providersService.getAnalyticsSummary(daysNum);
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

  // POST /providers/:id/report — Cliente reporta un proveedor
  @Post(':id/report')
  createReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userId: number; reason: string; description?: string },
  ) {
    return this.providersService.createReport({
      providerId:  id,
      userId:      +body.userId,
      reason:      body.reason,
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
