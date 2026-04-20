import { Module } from '@nestjs/common';
import { TrustValidationController } from './trust-validation.controller.js';
import { TrustValidationService } from './trust-validation.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [TrustValidationController],
  providers: [TrustValidationService],
  exports: [TrustValidationService],
})
export class TrustValidationModule {}
