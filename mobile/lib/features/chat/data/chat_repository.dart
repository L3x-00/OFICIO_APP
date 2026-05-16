import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../domain/models/chat_message_model.dart';
import '../domain/models/chat_room_model.dart';

class ChatRepository {
  final Dio _dio = DioClient.instance.dio;

  /// POST /chat/rooms — idempotente. Devuelve la sala (creada o existente).
  Future<ChatRoomBasic> getOrCreateRoom({
    required int clientId,
    required int providerId,
  }) async {
    final res = await _dio.post('/chat/rooms', data: {
      'clientId':   clientId,
      'providerId': providerId,
    });
    return ChatRoomBasic.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  /// POST /chat/messages
  Future<ChatMessageModel> sendMessage({
    required int chatRoomId,
    required int senderId,
    required String content,
  }) async {
    final res = await _dio.post('/chat/messages', data: {
      'chatRoomId': chatRoomId,
      'senderId':   senderId,
      'content':    content,
    });
    return ChatMessageModel.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  /// GET /chat/rooms/mine?scope=&type= — bandeja filtrada por rol
  /// (`client` | `provider`) y opcionalmente por tipo de perfil
  /// (`OFICIO`|`NEGOCIO`). Sin scope devuelve todo (compat).
  Future<List<ChatRoomSummary>> getMyRooms({
    String? scope,
    String? providerType,
  }) async {
    final res = await _dio.get(
      '/chat/rooms/mine',
      queryParameters: {
        if (scope != null && scope.isNotEmpty)                 'scope': scope,
        if (providerType != null && providerType.isNotEmpty)   'type':  providerType,
      },
    );
    final list = res.data as List;
    return list
        .map((e) => ChatRoomSummary.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  /// PATCH /chat/rooms/:roomId/read — marca como leídos los mensajes recibidos.
  Future<int> markRoomAsRead(int roomId) async {
    final res = await _dio.patch('/chat/rooms/$roomId/read');
    final data = Map<String, dynamic>.from(res.data as Map);
    return (data['updated'] as num?)?.toInt() ?? 0;
  }

  /// GET /chat/rooms/:roomId/messages — historial paginado.
  /// El backend ordena `createdAt DESC` (más recientes primero); el caller
  /// decide cómo presentarlos (la UI invierte para render cronológico).
  Future<ChatMessagesPage> getRoomMessages(
    int roomId, {
    int page = 1,
    int limit = 30,
  }) async {
    final res = await _dio.get(
      '/chat/rooms/$roomId/messages',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = Map<String, dynamic>.from(res.data as Map);
    final list = (data['items'] as List?)
            ?.map((e) => ChatMessageModel.fromJson(
                  Map<String, dynamic>.from(e as Map),
                ))
            .toList() ??
        const [];
    return ChatMessagesPage(
      items:   list,
      page:    (data['page']    as num?)?.toInt() ?? page,
      limit:   (data['limit']   as num?)?.toInt() ?? limit,
      total:   (data['total']   as num?)?.toInt() ?? list.length,
      hasMore: data['hasMore'] as bool? ?? false,
    );
  }
}

/// Wrapper de respuesta paginada del historial.
class ChatMessagesPage {
  final List<ChatMessageModel> items;
  final int page;
  final int limit;
  final int total;
  final bool hasMore;

  const ChatMessagesPage({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
    required this.hasMore,
  });
}

/// Forma mínima que devuelve POST /chat/rooms (sin client/provider expandidos).
class ChatRoomBasic {
  final int id;
  final int clientId;
  final int providerId;
  final DateTime createdAt;

  const ChatRoomBasic({
    required this.id,
    required this.clientId,
    required this.providerId,
    required this.createdAt,
  });

  factory ChatRoomBasic.fromJson(Map<String, dynamic> json) {
    return ChatRoomBasic(
      id:         (json['id']         as num).toInt(),
      clientId:   (json['clientId']   as num).toInt(),
      providerId: (json['providerId'] as num).toInt(),
      createdAt:  DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}
