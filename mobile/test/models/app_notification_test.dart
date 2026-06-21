/// Regresión del deep-linking de notificaciones (bugs 1 y 2): la metadata de
/// acción (chatRoomId / requestId / etc.) DEBE preservarse en `actionData`
/// para que el tile del inbox abra el destino correcto (hilo de chat / mis
/// solicitudes) en vez de caer al fallback.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/notifications/domain/models/notification_model.dart';

void main() {
  group('AppNotification.fromSocket — actionData (deep-link)', () {
    test('CHAT_MESSAGE preserva chatRoomId', () {
      final n = AppNotification.fromSocket({
        'type': 'CHAT_MESSAGE',
        'title': 'Nuevo mensaje',
        'body': 'hola',
        'chatRoomId': 42,
        'senderName': 'Juan',
      });
      expect(n.type, 'CHAT_MESSAGE');
      expect(n.actionData, isNotNull);
      expect(n.actionData!['chatRoomId'], 42);
    });

    test('NEW_OFFER preserva requestId', () {
      final n = AppNotification.fromSocket({
        'type': 'NEW_OFFER',
        'title': 'Nueva postulación para tu necesidad',
        'body': 'S/ 100',
        'requestId': '7',
      });
      expect(n.actionData!['requestId'], '7');
    });

    test('sin metadata de acción → actionData null (cae al fallback)', () {
      final n = AppNotification.fromSocket({
        'type': 'GENERIC',
        'title': 'x',
        'body': 'y',
      });
      expect(n.actionData, isNull);
    });

    test('fromJson (persistida) también extrae actionData si viene', () {
      final n = AppNotification.fromJson({
        'id': 1,
        'type': 'CHAT_MESSAGE',
        'title': 'x',
        'message': 'y',
        'sentAt': DateTime.now().toIso8601String(),
        'chatRoomId': 9,
        'isRead': false,
      });
      expect(n.actionData?['chatRoomId'], 9);
      expect(n.body, 'y'); // mapea message → body
    });
  });
}
