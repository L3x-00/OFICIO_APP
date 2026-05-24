/// Tests del `ChatProvider`.
///
/// Cubre:
///   • initialize → carga rooms.
///   • loadRoomHistory → paginación + preserva mensajes optimistas.
///   • sendMessage path feliz → optimistic insert + replace por server.
///   • sendMessage failure → mensaje queda visible con status FAILED
///     (obs 3 / regresión "se borran los mensajes al enviar").
///   • retryMessage → reintenta y reemplaza al recibir respuesta.
///   • markRoomAsRead → flag local + count en rooms.
///   • openRoom idempotencia.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/chat/domain/models/chat_message_model.dart';
import 'package:mobile/features/chat/presentation/providers/chat_provider.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

void main() {
  late MockDioAdapter adapter;

  /// Helper: shape mínimo de ChatRoomSummary para los mocks.
  Map<String, dynamic> roomJson({
    int id = 1,
    int clientId = 100,
    int providerId = 200,
    Map<String, dynamic>? lastMessage,
    int unreadCount = 0,
  }) =>
      {
        'id': id,
        'clientId': clientId,
        'providerId': providerId,
        'createdAt': '2026-05-01T00:00:00Z',
        'lastActivityAt': '2026-05-01T00:00:00Z',
        'unreadCount': unreadCount,
        'client': {
          'id': clientId, 'firstName': 'Carlos', 'lastName': 'Ramos',
          'avatarUrl': null,
        },
        'provider': {
          'id': providerId, 'userId': 7,
          'businessName': 'Plomería Pérez',
          'images': <dynamic>[
            <String, dynamic>{'url': 'https://img/cover.jpg', 'isCover': true},
          ],
        },
        'lastMessage': lastMessage,
      };

  /// Helper: mensaje crudo del backend.
  Map<String, dynamic> msgJson({
    required int id,
    int chatRoomId = 1,
    int senderId = 100,
    String content = 'hi',
    String status = 'SENT',
  }) =>
      {
        'id': id,
        'chatRoomId': chatRoomId,
        'senderId': senderId,
        'content': content,
        'status': status,
        'createdAt': '2026-05-01T12:00:00Z',
      };

  setUp(() {
    adapter = installTestBackend();
  });

  // ─────────────────────────────────────────────────────────────
  group('initialize() + loadRooms()', () {
    test('rellena rooms y queda con currentUserId seteado', () async {
      adapter.onGet('/chat/rooms/mine',
          body: <dynamic>[roomJson(id: 1), roomJson(id: 2)]);

      final p = ChatProvider();
      await p.initialize(100);

      expect(p.currentUserId, 100);
      expect(p.rooms, hasLength(2));
      expect(p.isLoadingRooms, false);
      expect(p.error, isNull);
    });

    test('error en loadRooms setea error y no rompe', () async {
      adapter.onGet('/chat/rooms/mine', status: 500);
      final p = ChatProvider();
      await p.initialize(100);

      expect(p.rooms, isEmpty);
      expect(p.error, isNotNull);
      expect(p.isLoadingRooms, false);
    });

    test('cambio de cuenta (otro userId) limpia state previo', () async {
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[roomJson(id: 1)]);
      final p = ChatProvider();
      await p.initialize(100);
      expect(p.rooms, hasLength(1));

      // Cambio de cuenta.
      adapter.reset();
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[roomJson(id: 5)]);
      await p.initialize(/*otro userId=*/ 200);

      expect(p.currentUserId, 200);
      expect(p.rooms, hasLength(1));
      expect(p.rooms.first.id, 5);
      // El cache de mensajes del usuario anterior se limpió:
      expect(p.messagesOf(1), isEmpty);
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('loadRoomHistory + paginación', () {
    test('1ra página rellena messages en orden ASC (backend manda DESC)', () async {
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[roomJson(id: 1)]);
      adapter.on(
        method: 'GET',
        path: RegExp(r'^/chat/rooms/1/messages$'),
        body: {
          'items': <dynamic>[
            // Backend manda DESC (más reciente primero):
            msgJson(id: 3, content: 'msg 3'),
            msgJson(id: 2, content: 'msg 2'),
            msgJson(id: 1, content: 'msg 1'),
          ],
          'page': 1, 'limit': 30, 'total': 3, 'hasMore': false,
        },
      );

      final p = ChatProvider();
      await p.initialize(100);
      await p.loadRoomHistory(1);

      final msgs = p.messagesOf(1);
      expect(msgs, hasLength(3));
      // ASC en la UI (antiguos primero).
      expect(msgs.first.content, 'msg 1');
      expect(msgs.last.content, 'msg 3');
      expect(p.hasMoreHistory(1), false);
    });

    test('idempotente: 2 llamadas no recarga ni duplica', () async {
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[roomJson(id: 1)]);
      adapter.on(
        method: 'GET',
        path: RegExp(r'^/chat/rooms/1/messages$'),
        body: {
          'items': <dynamic>[msgJson(id: 1)],
          'page': 1, 'limit': 30, 'total': 1, 'hasMore': false,
        },
      );

      final p = ChatProvider();
      await p.initialize(100);
      await p.loadRoomHistory(1);
      await p.loadRoomHistory(1); // segunda vez — no debe duplicar

      expect(p.messagesOf(1), hasLength(1));
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('sendMessage', () {
    test('path feliz: optimistic insert → reemplaza con respuesta del server', () async {
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[roomJson(id: 1)]);
      adapter.onPost('/chat/messages', body: msgJson(id: 42, content: 'hola'));

      final p = ChatProvider();
      await p.initialize(100);
      await p.sendMessage(roomId: 1, content: 'hola');

      final msgs = p.messagesOf(1);
      expect(msgs, hasLength(1));
      expect(msgs.first.id, 42);
      expect(msgs.first.status, MessageStatus.sent);
      expect(msgs.first.content, 'hola');
    });

    test('failure: mensaje NO se borra — queda en status FAILED para reintentar', () async {
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[roomJson(id: 1)]);
      adapter.onPost('/chat/messages', status: 500,
          body: {'message': 'server boom'});

      final p = ChatProvider();
      await p.initialize(100);
      await p.sendMessage(roomId: 1, content: 'no se envía');

      // Antes del fix obs 3 desaparecía; ahora persiste como FAILED.
      final msgs = p.messagesOf(1);
      expect(msgs, hasLength(1));
      expect(msgs.first.status, MessageStatus.failed);
      expect(msgs.first.content, 'no se envía');
      expect(p.error, isNotNull);
    });

    test('contenido vacío o solo whitespace NO crea mensaje', () async {
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[roomJson(id: 1)]);
      final p = ChatProvider();
      await p.initialize(100);

      await p.sendMessage(roomId: 1, content: '');
      await p.sendMessage(roomId: 1, content: '   ');

      expect(p.messagesOf(1), isEmpty);
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('retryMessage', () {
    test('reintenta un mensaje FAILED y queda SENT al éxito', () async {
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[roomJson(id: 1)]);

      // 1ra llamada: falla.
      adapter.onPost('/chat/messages', status: 500);
      final p = ChatProvider();
      await p.initialize(100);
      await p.sendMessage(roomId: 1, content: 'reintenta');

      final failedMsgs = p.messagesOf(1);
      expect(failedMsgs.first.status, MessageStatus.failed);
      final tempId = failedMsgs.first.clientTempId!;

      // 2da llamada: éxito.
      adapter.reset();
      adapter.onPost('/chat/messages',
          body: msgJson(id: 99, content: 'reintenta'));
      await p.retryMessage(1, tempId);

      final after = p.messagesOf(1);
      expect(after, hasLength(1));
      expect(after.first.id, 99);
      expect(after.first.status, MessageStatus.sent);
    });

    test('retry sobre mensaje no-FAILED es no-op', () async {
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[roomJson(id: 1)]);
      adapter.onPost('/chat/messages', body: msgJson(id: 5));
      final p = ChatProvider();
      await p.initialize(100);
      await p.sendMessage(roomId: 1, content: 'ok');

      final tempId = p.messagesOf(1).first.clientTempId; // null tras success

      // Sin tempId no hay nada que reintentar — opera silenciosamente.
      await p.retryMessage(1, tempId ?? 'no_existe');
      expect(p.messagesOf(1).first.status, MessageStatus.sent);
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('markRoomAsRead', () {
    test('actualiza unreadCount=0 en la sala local cuando server confirma updated>0', () async {
      adapter.onGet('/chat/rooms/mine',
          body: <dynamic>[roomJson(id: 1, unreadCount: 3)]);
      adapter.on(
        method: 'PATCH',
        path: RegExp(r'^/chat/rooms/1/read$'),
        body: {'updated': 3},
      );

      final p = ChatProvider();
      await p.initialize(100);
      expect(p.rooms.first.unreadCount, 3);
      expect(p.totalUnread, 3);

      await p.markRoomAsRead(1);

      expect(p.rooms.first.unreadCount, 0);
      expect(p.totalUnread, 0);
    });

    test('updated=0 no cambia el estado local', () async {
      adapter.onGet('/chat/rooms/mine',
          body: <dynamic>[roomJson(id: 1, unreadCount: 0)]);
      adapter.on(
        method: 'PATCH',
        path: RegExp(r'^/chat/rooms/1/read$'),
        body: {'updated': 0},
      );

      final p = ChatProvider();
      await p.initialize(100);
      await p.markRoomAsRead(1);

      expect(p.rooms.first.unreadCount, 0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('openRoom (POST /chat/rooms — idempotente en backend)', () {
    test('refresca rooms tras crear/abrir la sala', () async {
      adapter.onPost('/chat/rooms', body: {
        'id': 88, 'clientId': 100, 'providerId': 200,
        'createdAt': '2026-05-01T00:00:00Z',
      });
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[roomJson(id: 88)]);

      final p = ChatProvider();
      await p.initialize(100);
      final id = await p.openRoom(clientId: 100, providerId: 200);

      expect(id, 88);
      expect(p.rooms, hasLength(1));
      expect(p.rooms.first.id, 88);
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('setScope filtro de bandeja', () {
    test('scope=provider llama GET con query scope=provider y refresca lista', () async {
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[roomJson(id: 1)]);
      final p = ChatProvider();
      await p.initialize(100);

      adapter.reset();
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[
        roomJson(id: 9, providerId: 200),
      ]);
      await p.setScope(scope: 'provider', providerType: 'OFICIO');

      // Verificar que la query incluyó scope=provider.
      final last = adapter.captured.last;
      expect(last.path, '/chat/rooms/mine');
      expect(last.queryParameters['scope'], 'provider');
      expect(last.queryParameters['type'], 'OFICIO');
      expect(p.rooms.first.id, 9);
    });

    test('idempotente: 2do setScope con mismos args NO recarga', () async {
      adapter.onGet('/chat/rooms/mine', body: <dynamic>[]);
      final p = ChatProvider();
      await p.initialize(100);

      final beforeCount = adapter.captured.length;
      await p.setScope(scope: 'client');
      await p.setScope(scope: 'client'); // mismo scope
      // 1ra llamada hace request, la 2da no.
      // Mínimo: solo se sumó 1 al contador en lugar de 2.
      expect(adapter.captured.length, beforeCount + 1);
    });
  });
}
