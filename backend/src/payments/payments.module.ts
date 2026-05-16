import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { EventsModule } from '../events/events.module.js';
import { FirebaseModule } from '../firebase/firebase.module.js';

@Module({
  imports: [PrismaModule, EventsModule, FirebaseModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
