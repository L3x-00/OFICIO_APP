import { Global, Module } from '@nestjs/common';
import { ProviderFeaturesService } from './provider-features.service.js';

/**
 * Módulo @Global: el feature-gating por categoría lo consumen varios módulos
 * (agenda, carta digital, catálogo, cotización) + el endpoint público de
 * features. Global evita re-importarlo en cada uno. PrismaService ya es global.
 */
@Global()
@Module({
  providers: [ProviderFeaturesService],
  exports: [ProviderFeaturesService],
})
export class ProviderFeaturesModule {}
