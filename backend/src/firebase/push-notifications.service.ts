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
        err?.errorInfo?.code ===
          'messaging/registration-token-not-registered' ||
        err?.errorInfo?.code === 'messaging/invalid-registration-token'
      ) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { fcmToken: null },
        });
        this.logger.warn(`FCM token inválido limpiado para userId=${userId}`);
      } else {
        this.logger.error(
          `Error enviando push a userId=${userId}: ${err?.message}`,
        );
      }
    }
  }

  /**
   * Broadcast a TODOS los usuarios con `fcmToken` no nulo. Fire-and-forget:
   * el caller (admin) recibe el conteo de tokens encolados de inmediato y
   * el envío real corre en background. Limpia tokens inválidos al detectar
   * `registration-token-not-registered` / `invalid-registration-token`.
   *
   * - `imageUrl` se incluye como `data.imageUrl` (Flutter lo abre con
   *   `flutter_local_notifications` o el handler de FCM nativo) y también
   *   en el bloque `android.notification.imageUrl` para que el sistema
   *   renderice la cabecera con la foto sin tocar el cliente.
   */
  async broadcast(args: {
    title: string;
    body: string;
    imageUrl?: string | null;
    data?: Record<string, string>;
  }): Promise<{ enqueued: number }> {
    if (getApps().length === 0) {
      this.logger.warn('Firebase Admin no inicializado — broadcast omitido');
      return { enqueued: 0 };
    }

    const users = await this.prisma.user.findMany({
      where: { fcmToken: { not: null }, isActive: true },
      select: { id: true, fcmToken: true },
    });

    const tokens = users
      .filter((u): u is { id: number; fcmToken: string } => !!u.fcmToken)
      .map((u) => ({ userId: u.id, token: u.fcmToken }));

    this.logger.log(
      `[broadcast] solicitud "${args.title}" — ${tokens.length} token(s) FCM encontrados${
        args.imageUrl ? ' (con imagen)' : ''
      }`,
    );

    if (tokens.length === 0) {
      this.logger.warn(
        '[broadcast] no hay tokens FCM activos en BD — ningún dispositivo recibirá la push',
      );
      return { enqueued: 0 };
    }

    // Fire-and-forget — no bloqueamos la respuesta HTTP al admin.
    this._dispatchBroadcast(tokens, {
      title: args.title,
      body: args.body,
      imageUrl: args.imageUrl ?? null,
      data: args.data ?? {},
    }).catch((e) =>
      this.logger.error(`broadcast falló en background: ${e?.message ?? e}`),
    );

    return { enqueued: tokens.length };
  }

  private async _dispatchBroadcast(
    targets: Array<{ userId: number; token: string }>,
    payload: {
      title: string;
      body: string;
      imageUrl: string | null;
      data: Record<string, string>;
    },
  ): Promise<void> {
    const messaging = getMessaging(getApp());
    // Lotes de 500 — sendEach limita a 500 mensajes por llamada.
    const CHUNK = 500;
    let invalidated = 0;
    for (let i = 0; i < targets.length; i += CHUNK) {
      const slice = targets.slice(i, i + CHUNK);
      const messages = slice.map((t) => ({
        token: t.token,
        notification: payload.imageUrl
          ? {
              title: payload.title,
              body: payload.body,
              imageUrl: payload.imageUrl,
            }
          : { title: payload.title, body: payload.body },
        data: {
          ...payload.data,
          type: payload.data.type ?? 'BROADCAST',
          ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
        },
        android: {
          priority: 'high' as const,
          notification: payload.imageUrl
            ? { imageUrl: payload.imageUrl }
            : undefined,
        },
        apns: {
          payload: { aps: { sound: 'default', 'mutable-content': 1 } },
          ...(payload.imageUrl
            ? { fcmOptions: { imageUrl: payload.imageUrl } }
            : {}),
        },
      }));
      try {
        // `sendEach` (HTTP v1 API). `sendAll` usaba el endpoint /batch
        // de la API legacy de FCM que Google apagó en junio 2024 → ya
        // devuelve 404 en producción. La firma y la respuesta
        // (BatchResponse con `.responses[]`) son idénticas, así que el
        // manejo de tokens inválidos abajo no cambia.
        const res = await messaging.sendEach(messages);
        this.logger.log(
          `[broadcast] lote ${i / CHUNK}: éxito=${res.successCount}, fallo=${res.failureCount}`,
        );
        // Limpiar tokens inválidos detectados en este lote.
        for (let j = 0; j < res.responses.length; j++) {
          const r = res.responses[j];
          if (r.success) continue;
          const code = (r.error as any)?.errorInfo?.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            const userId = slice[j].userId;
            this.prisma.user
              .update({ where: { id: userId }, data: { fcmToken: null } })
              .catch(() => null);
            invalidated++;
          } else if (code) {
            // Otro tipo de error (auth, quota, payload) — lo logueamos
            // explícito para que el admin pueda diagnosticar por qué
            // los dispositivos no recibieron la push.
            this.logger.warn(
              `[broadcast] userId=${slice[j].userId} push falló: ${code} — ${r.error?.message ?? ''}`,
            );
          }
        }
      } catch (err: any) {
        this.logger.error(
          `[broadcast] sendEach lote ${i / CHUNK} falló: ${err?.message ?? err}`,
        );
      }
    }
    this.logger.log(
      `[broadcast] finalizado: ${targets.length} tokens, ${invalidated} inválidos limpiados`,
    );
  }
}
