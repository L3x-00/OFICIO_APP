import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { FirebaseModule } from '../firebase/firebase.module.js';

/**
 * Agenda de Citas. PrismaService y ProviderFeaturesService son globales;
 * FirebaseModule se importa por PushNotificationsService (push al cliente).
 */
@Module({
  imports: [FirebaseModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
