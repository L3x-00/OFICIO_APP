import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';

/**
 * Carta Digital. PrismaService, ProviderFeaturesService y MinioService son
 * globales → no se importan aquí.
 */
@Module({
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
