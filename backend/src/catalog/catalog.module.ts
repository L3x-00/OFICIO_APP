import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

/**
 * Catálogo de Productos. PrismaService, ProviderFeaturesService y MinioService
 * son globales → no se importan aquí.
 */
@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
