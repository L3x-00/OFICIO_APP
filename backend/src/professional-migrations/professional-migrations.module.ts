import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { EventsModule } from '../events/events.module.js';
import { FirebaseModule } from '../firebase/firebase.module.js';
import {
  AdminProfessionalMigrationsController,
  ProfessionalMigrationsController,
} from './professional-migrations.controller.js';
import { ProfessionalMigrationsService } from './professional-migrations.service.js';

@Module({
  imports: [PrismaModule, EventsModule, FirebaseModule],
  controllers: [
    ProfessionalMigrationsController,
    AdminProfessionalMigrationsController,
  ],
  providers: [ProfessionalMigrationsService],
  exports: [ProfessionalMigrationsService],
})
export class ProfessionalMigrationsModule {}
