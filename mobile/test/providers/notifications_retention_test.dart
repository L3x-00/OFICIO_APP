import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/network/socket_service.dart';
import 'package:mobile/features/notifications/domain/models/notification_model.dart';
import 'package:mobile/features/notifications/presentation/providers/notifications_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

void main() {
  late MockDioAdapter adapter;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    adapter = installTestBackend();
  });

  tearDown(() {
    SocketService.instance.disconnect();
  });

  test('purga broadcasts leídos a 5 días y no leídos a 30', () async {
    final now = DateTime.now();
    final stored = [
      _broadcast('read-old', now.subtract(const Duration(days: 6)), true),
      _broadcast('unread-valid', now.subtract(const Duration(days: 20)), false),
      _broadcast('unread-old', now.subtract(const Duration(days: 31)), false),
      _broadcast('read-valid', now.subtract(const Duration(days: 4)), true),
    ];
    SharedPreferences.setMockInitialValues({
      'broadcast_notifs_7': stored
          .map((n) => jsonEncode(n.toLocalJson()))
          .toList(),
    });
    adapter.onGet('/provider-profile/me/notifications', body: <dynamic>[]);
    final provider = NotificationsProvider();

    provider.setUser(userId: 7, role: 'USUARIO');
    await pumpEventQueue(times: 20);

    expect(
      provider.items.map((n) => n.id),
      containsAll(<String>['unread-valid', 'read-valid']),
    );
    expect(provider.items.map((n) => n.id), isNot(contains('read-old')));
    expect(provider.items.map((n) => n.id), isNot(contains('unread-old')));

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getStringList('broadcast_notifs_7'), hasLength(2));
  });

  test('una fila purgada por backend desaparece al refrescar', () async {
    adapter.onGet(
      '/provider-profile/me/notifications',
      body: [
        {
          'id': 91,
          'type': 'GENERIC',
          'title': 'Aviso',
          'message': 'Persistido',
          'sentAt': DateTime.now().toIso8601String(),
          'isRead': true,
        },
      ],
    );
    final provider = NotificationsProvider();
    provider.setUser(userId: 7, role: 'USUARIO');
    await pumpEventQueue(times: 20);
    expect(provider.items.map((n) => n.id), contains('91'));

    adapter.reset();
    adapter.onGet('/provider-profile/me/notifications', body: <dynamic>[]);
    await provider.loadHistory();

    expect(provider.items.map((n) => n.id), isNot(contains('91')));
  });

  test('lectura y descarte de broadcast sobreviven al reinicio', () async {
    adapter.onGet('/provider-profile/me/notifications', body: <dynamic>[]);
    final provider = NotificationsProvider();
    provider.setUser(userId: 7, role: 'USUARIO');
    await pumpEventQueue(times: 20);

    provider.recordBroadcast(_broadcast('broadcast-1', DateTime.now(), false));
    provider.markRead('broadcast-1');
    await pumpEventQueue(times: 10);

    var prefs = await SharedPreferences.getInstance();
    var raw = prefs.getStringList('broadcast_notifs_7')!;
    expect(
      AppNotification.fromLocalJson(
        jsonDecode(raw.single) as Map<String, dynamic>,
      ).isRead,
      true,
    );

    provider.dismiss('broadcast-1');
    await pumpEventQueue(times: 10);
    prefs = await SharedPreferences.getInstance();
    raw = prefs.getStringList('broadcast_notifs_7') ?? const [];
    expect(raw, isEmpty);
  });
}

AppNotification _broadcast(String id, DateTime createdAt, bool isRead) {
  return AppNotification(
    id: id,
    type: 'BROADCAST',
    title: 'Aviso $id',
    body: 'Contenido',
    createdAt: createdAt,
    isRead: isRead,
  );
}
