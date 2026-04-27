import { Module } from '@nestjs/common';
import { SubastasService } from './subastas.service.js';
import { SubastasController } from './subastas.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { EventsModule } from '../events/events.module.js';
import { FirebaseModule } from '../firebase/firebase.module.js';

@Module({
  imports: [PrismaModule, EventsModule, FirebaseModule],
  controllers: [SubastasController],
  providers: [SubastasService],
  exports: [SubastasService],
})
export class SubastasModule {}
