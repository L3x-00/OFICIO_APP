import { Module } from '@nestjs/common';
import { ProviderProfileService } from './provider-profile.service.js';
import { ProviderProfileController } from './provider-profile.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [AuthModule, EventsModule],
  providers: [ProviderProfileService],
  controllers: [ProviderProfileController],
})
export class ProviderProfileModule {}
