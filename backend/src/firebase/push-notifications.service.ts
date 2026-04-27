import { Injectable, Logger } from '@nestjs/common';
import { getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async sendToUser(
    userId: number,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ): Promise<void> {
    if (getApps().length === 0) {
      this.logger.warn('Firebase Admin no inicializado — push omitido');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) return;

    try {
      await getMessaging(getApp()).send({
        token: user.fcmToken,
        notification: { title, body },
        data,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
      this.logger.log(`Push enviado a userId=${userId}`);
    } catch (err: any) {
      // Token inválido o caducado — limpiar para evitar spam
      if (
        err?.errorInfo?.code === 'messaging/registration-token-not-registered' ||
        err?.errorInfo?.code === 'messaging/invalid-registration-token'
      ) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { fcmToken: null },
        });
        this.logger.warn(`FCM token inválido limpiado para userId=${userId}`);
      } else {
        this.logger.error(`Error enviando push a userId=${userId}: ${err?.message}`);
      }
    }
  }
}
