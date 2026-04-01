import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ProvidersService } from './providers.service.js';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  // GET /providers?categorySlug=electricistas&availability=DISPONIBLE
  @Get()
  findAll(
    @Query('categorySlug') categorySlug?: string,
    @Query('availability') availability?: string,
    @Query('onlyVerified') onlyVerified?: string,
    @Query('search') search?: string,
    @Query('localityId') localityId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.providersService.findAll({
      categorySlug,
      availability,
      onlyVerified: onlyVerified === 'true',
      search,
      localityId: localityId ? parseInt(localityId) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // GET /providers/categories
  @Get('categories')
  getCategories() {
    return this.providersService.getCategories();
  }

  // GET /providers/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.providersService.findOne(id);
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
  // POST /providers/:id/track
  @Post(':id/track')
  trackEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { eventType: string; userId?: number },
  ) {
    return this.providersService.trackEvent(id, body.eventType, body.userId);
  }
}