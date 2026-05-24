/// Widget tests del `ChatScreen`.
///
/// El widget consume `ChatProvider` y carga estado real al iniciar
/// (`loadRoomHistory`, `markRoomAsRead`, etc). Mockamos la red con
/// `installTestBackend()` para controlar las respuestas; envolvemos el
/// árbol en MultiProvider con un ChatProvider real ya inicializado a
/// un userId conocido.
///
/// Validamos:
///   • Render del header con el `seedTitle` cuando la sala no está
///     cacheada todavía.
///   • Render del banner de retención ("historial se limpia 7 días").
///   • Render de mensajes propios vs ajenos: cuando `senderId ==
///     currentUserId` el bubble alinea a la derecha; cuando es de la
///     otra parte, a la izquierda. Validamos por contenido + presencia.
///   • Render del input compose + botón enviar.
///   • Empty state cuando no hay mensajes.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/chat/presentation/providers/chat_provider.dart';
import 'package:mobile/features/chat/presentation/screens/chat_screen.dart';
import 'package:provider/provider.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

const _myUserId   = 100;
const _otherUserId = 200;

/// Sala mock con un mensaje propio y uno ajeno (para validar la
/// dirección de bubbles).
Map<String, dynamic> _roomJson({int id = 1}) => {
  'id': id,
  'clientId':   _myUserId,
  'providerId': 7,
  'createdAt': '2026-05-01T00:00:00Z',
  'lastActivityAt': '2026-05-01T12:00:00Z',
  'unreadCount': 0,
  'client': {
    'id': _myUserId, 'firstName': 'Yo', 'lastName': 'Test', 'avatarUrl': null,
  },
  'provider': {
    'id': 7, 'userId': _otherUserId,
    'businessName': 'Plomería Pérez',
    'images': <dynamic>[
      <String, dynamic>{'url': 'https://img/x.jpg', 'isCover': true},
    ],
  },
  'lastMessage': null,
};

Map<String, dynamic> _msgJson({
  required int id,
  required int senderId,
  required String content,
  int chatRoomId = 1,
}) => {
  'id': id, 'chatRoomId': chatRoomId, 'senderId': senderId,
  'content': content, 'status': 'SENT',
  'createdAt': '2026-05-01T12:00:00Z',
};

Widget _harness({
  required ChatProvider chat,
  int roomId = 1,
  String? seedTitle,
}) =>
    MultiProvider(
      providers: [
        ChangeNotifierProvider<ChatProvider>.value(value: chat),
      ],
      child: MaterialApp(
        theme: AppThemeColors.buildLight(),
        home:  Scaffold(body: ChatScreen(roomId: roomId, seedTitle: seedTitle)),
      ),
    );

void main() {
  late MockDioAdapter adapter;

  setUp(() {
    adapter = installTestBackend();
  });

  testWidgets('Header con seedTitle aparece mientras la sala no está cacheada', (tester) async {
    // Sin rooms en el cache y sin historial — solo seedTitle.
    adapter.onGet('/chat/rooms/mine', body: <dynamic>[]);
    adapter.on(method: 'GET', path: RegExp(r'^/chat/rooms/1/messages$'), body: {
      'items': <dynamic>[], 'page': 1, 'limit': 30, 'total': 0, 'hasMore': false,
    });
    adapter.on(method: 'PATCH', path: RegExp(r'^/chat/rooms/1/read$'),
        body: {'updated': 0});

    final chat = ChatProvider();
    await chat.initialize(_myUserId);

    await tester.pumpWidget(_harness(chat: chat, seedTitle: 'Plomería Seed'));
    // Múltiples pumps: initState dispara loadRoomHistory via post-frame.
    await tester.pump();
    await tester.pump();

    expect(find.text('Plomería Seed'), findsOneWidget);
    // Banner de retención SIEMPRE visible en el chat.
    expect(find.textContaining('historial se limpia'), findsOneWidget);
  });

  testWidgets('Empty state cuando la sala no tiene mensajes', (tester) async {
    adapter.onGet('/chat/rooms/mine', body: <dynamic>[_roomJson(id: 1)]);
    adapter.on(method: 'GET', path: RegExp(r'^/chat/rooms/1/messages$'), body: {
      'items': <dynamic>[], 'page': 1, 'limit': 30, 'total': 0, 'hasMore': false,
    });
    adapter.on(method: 'PATCH', path: RegExp(r'^/chat/rooms/1/read$'),
        body: {'updated': 0});

    final chat = ChatProvider();
    await chat.initialize(_myUserId);

    await tester.pumpWidget(_harness(chat: chat));
    await tester.pump();
    await tester.pump();

    expect(find.text('Inicia la conversación'), findsOneWidget);
  });

  testWidgets('Renderiza mensajes propios y ajenos con su contenido', (tester) async {
    adapter.onGet('/chat/rooms/mine', body: <dynamic>[_roomJson(id: 1)]);
    adapter.on(method: 'GET', path: RegExp(r'^/chat/rooms/1/messages$'), body: {
      'items': <dynamic>[
        // Backend manda DESC (más reciente primero).
        _msgJson(id: 3, senderId: _otherUserId, content: 'Respuesta del otro'),
        _msgJson(id: 2, senderId: _myUserId,    content: 'Mensaje propio'),
        _msgJson(id: 1, senderId: _otherUserId, content: 'Saludo inicial'),
      ],
      'page': 1, 'limit': 30, 'total': 3, 'hasMore': false,
    });
    adapter.on(method: 'PATCH', path: RegExp(r'^/chat/rooms/1/read$'),
        body: {'updated': 2});

    final chat = ChatProvider();
    await chat.initialize(_myUserId);

    await tester.pumpWidget(_harness(chat: chat));
    // Permitimos al post-frame callback cargar historial + render.
    await tester.pump();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    // Los 3 mensajes están en el árbol.
    expect(find.text('Saludo inicial'),       findsOneWidget);
    expect(find.text('Mensaje propio'),       findsOneWidget);
    expect(find.text('Respuesta del otro'),   findsOneWidget);
  });

  testWidgets('Input + botón send presentes con icono correcto', (tester) async {
    adapter.onGet('/chat/rooms/mine', body: <dynamic>[_roomJson(id: 1)]);
    adapter.on(method: 'GET', path: RegExp(r'^/chat/rooms/1/messages$'), body: {
      'items': <dynamic>[], 'page': 1, 'limit': 30, 'total': 0, 'hasMore': false,
    });
    adapter.on(method: 'PATCH', path: RegExp(r'^/chat/rooms/1/read$'),
        body: {'updated': 0});

    final chat = ChatProvider();
    await chat.initialize(_myUserId);

    await tester.pumpWidget(_harness(chat: chat));
    await tester.pump();
    await tester.pump();

    // Input para escribir.
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Escribe un mensaje…'), findsOneWidget);
    // Botón send con icono.
    expect(find.byIcon(Icons.send_rounded), findsOneWidget);
  });
}
