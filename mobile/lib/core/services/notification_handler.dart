import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import '../../shared/widgets/notification_modal.dart';
import 'fcm_service.dart';

/// Punto único para abrir el modal de notificación enriquecido desde:
///
///   • Tap en la notif del sistema con app en background/terminated
///     (`FirebaseMessaging.onMessageOpenedApp` + `getInitialMessage`).
///   • Tap en una notif desde la pantalla "Alertas" cuando trae imagen.
///
/// El handler tolera ser invocado antes de que el árbol esté listo:
/// si no hay overlay disponible (app recién despertando de terminated),
/// programa el show en el próximo frame con `addPostFrameCallback`.
class NotificationHandler {
  NotificationHandler._();

  /// Extrae title/body/imageUrl del `RemoteMessage` que entrega
  /// firebase_messaging y abre el modal. El payload del backend pone
  /// la URL en `data.imageUrl` (ver `push-notifications.service.ts`).
  static Future<void> showFromRemoteMessage(RemoteMessage message) async {
    final notif = message.notification;
    final data = message.data;
    final title = notif?.title ?? (data['title'] as String?) ?? 'Notificación';
    final body = notif?.body ?? (data['body'] as String?) ?? '';
    final imageUrl = _extractImageUrl(message);
    await _showOnNextOverlay(title: title, body: body, imageUrl: imageUrl);
  }

  /// Versión "primitiva" — útil cuando ya tenés los strings parseados
  /// (p.ej. desde una `AppNotification` del provider).
  static Future<void> show(
    BuildContext context, {
    required String title,
    required String body,
    String? imageUrl,
  }) {
    return NotificationModal.show(
      context,
      title: title,
      body: body,
      imageUrl: imageUrl,
    );
  }

  /// Las imágenes pueden venir en `notification.android.imageUrl`,
  /// `notification.apple.imageUrl` o como string en `data.imageUrl`.
  /// Devolvemos el primer match no vacío.
  static String? _extractImageUrl(RemoteMessage m) {
    final fromAndroid = m.notification?.android?.imageUrl;
    if (fromAndroid != null && fromAndroid.isNotEmpty) return fromAndroid;
    final fromApple = m.notification?.apple?.imageUrl;
    if (fromApple != null && fromApple.isNotEmpty) return fromApple;
    final fromData = m.data['imageUrl'];
    if (fromData is String && fromData.isNotEmpty) return fromData;
    return null;
  }

  /// Resuelve el contexto del navigatorKey. Si todavía no está montado
  /// (app abriendo desde terminated), espera al primer post-frame.
  static Future<void> _showOnNextOverlay({
    required String title,
    required String body,
    String? imageUrl,
  }) async {
    final ctx = FcmService.navigatorKey?.currentContext;
    if (ctx != null && ctx.mounted) {
      await NotificationModal.show(
        ctx,
        title: title,
        body: body,
        imageUrl: imageUrl,
      );
      return;
    }
    // App recién despertando — diferimos al próximo frame.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final later = FcmService.navigatorKey?.currentContext;
      if (later == null || !later.mounted) return;
      NotificationModal.show(
        later,
        title: title,
        body: body,
        imageUrl: imageUrl,
      );
    });
  }
}
