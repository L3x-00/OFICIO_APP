import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service.js';
import { ProvidersController } from './providers.controller.js';
import { PublicProfileController } from './public-profile.controller.js';
import { CacheModule } from '@nestjs/cache-manager';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [
    CacheModule.register(),
    EventsModule,
  ],
  controllers: [ProvidersController, PublicProfileController],
  providers: [ProvidersService],
})
export class ProvidersModule {}