import { Module } from '@nestjs/common';
import { QuotationsController } from './quotations.controller.js';
import { QuotationsService } from './quotations.service.js';
import { FirebaseModule } from '../firebase/firebase.module.js';

/**
 * Cotización. PrismaService, ProviderFeaturesService y MinioService son
 * globales; FirebaseModule se importa por PushNotificationsService.
 */
@Module({
  imports: [FirebaseModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
