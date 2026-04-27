import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service.js';
import { PushNotificationsService } from './push-notifications.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [FirebaseService, PushNotificationsService],
  exports: [FirebaseService, PushNotificationsService],
})
export class FirebaseModule {}
