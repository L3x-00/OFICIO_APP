import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service.js';
import { ProvidersController } from './providers.controller.js';
import { CacheModule } from '@nestjs/cache-manager';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [
    CacheModule.register(),
    EventsModule,
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
})
export class ProvidersModule {}