import 'chat_message_model.dart';

/// Resumen de una sala para la bandeja de entrada.
/// Trae la contraparte (cliente o proveedor según el rol del usuario actual)
/// y la última actividad.
class ChatRoomSummary {
  final int id;
  final int clientId;
  final int providerId;
  final DateTime createdAt;

  // Contraparte: cliente
  final ClientPreview client;

  // Contraparte: proveedor
  final ProviderPreview provider;

  // Preview
  final ChatMessageModel? lastMessage;
  final DateTime lastActivityAt;
  final int unreadCount;

  const ChatRoomSummary({
    required this.id,
    required this.clientId,
    required this.providerId,
    required this.createdAt,
    required this.client,
    required this.provider,
    required this.lastMessage,
    required this.lastActivityAt,
    required this.unreadCount,
  });

  /// Resuelve la otra parte respecto al usuario logueado.
  /// `currentUserId` = User.id; el provider lleva su `userId` interno.
  PartyDisplay otherParty(int currentUserId) {
    if (currentUserId == clientId) {
      return PartyDisplay(
        title: provider.businessName,
        subtitle: null,
        avatarUrl: provider.coverUrl,
        isProvider: true,
        userId: provider.userId,
      );
    }
    return PartyDisplay(
      title: '${client.firstName} ${client.lastName}'.trim(),
      subtitle: null,
      avatarUrl: client.avatarUrl,
      isProvider: false,
      userId: clientId,
    );
  }

  factory ChatRoomSummary.fromJson(Map<String, dynamic> json) {
    final client = ClientPreview.fromJson(
      json['client'] as Map<String, dynamic>,
    );
    final provider = ProviderPreview.fromJson(
      json['provider'] as Map<String, dynamic>,
    );
    final lastMsgJson = json['lastMessage'] as Map<String, dynamic>?;
    return ChatRoomSummary(
      id: (json['id'] as num).toInt(),
      clientId: (json['clientId'] as num).toInt(),
      providerId: (json['providerId'] as num).toInt(),
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      client: client,
      provider: provider,
      lastMessage: lastMsgJson != null
          ? ChatMessageModel.fromJson(lastMsgJson)
          : null,
      lastActivityAt:
          DateTime.tryParse(json['lastActivityAt'] as String? ?? '') ??
          DateTime.now(),
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
    );
  }

  ChatRoomSummary copyWith({
    ChatMessageModel? lastMessage,
    DateTime? lastActivityAt,
    int? unreadCount,
  }) {
    return ChatRoomSummary(
      id: id,
      clientId: clientId,
      providerId: providerId,
      createdAt: createdAt,
      client: client,
      provider: provider,
      lastMessage: lastMessage ?? this.lastMessage,
      lastActivityAt: lastActivityAt ?? this.lastActivityAt,
      unreadCount: unreadCount ?? this.unreadCount,
    );
  }
}

class ClientPreview {
  final int id;
  final String firstName;
  final String lastName;
  final String? avatarUrl;

  const ClientPreview({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.avatarUrl,
  });

  factory ClientPreview.fromJson(Map<String, dynamic> json) {
    return ClientPreview(
      id: (json['id'] as num).toInt(),
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
    );
  }
}

class ProviderPreview {
  final int id;

  /// User.id del dueño de este perfil de proveedor — necesario para resolver
  /// quién es la "otra parte" en un chat sin ambigüedad.
  final int userId;
  final String businessName;
  final String? coverUrl;

  const ProviderPreview({
    required this.id,
    required this.userId,
    required this.businessName,
    this.coverUrl,
  });

  factory ProviderPreview.fromJson(Map<String, dynamic> json) {
    final imgs = json['images'] as List?;
    final coverUrl = (imgs != null && imgs.isNotEmpty)
        ? (imgs.first as Map<String, dynamic>)['url'] as String?
        : null;
    return ProviderPreview(
      id: (json['id'] as num).toInt(),
      userId: (json['userId'] as num).toInt(),
      businessName: json['businessName'] as String? ?? '',
      coverUrl: coverUrl,
    );
  }
}

/// Datos UI de la otra parte del chat (cliente o proveedor).
class PartyDisplay {
  final String title;
  final String? subtitle;
  final String? avatarUrl;
  final bool isProvider;

  /// User.id de la contraparte. Para un cliente es su id directo; para un
  /// proveedor, el `userId` dueño del perfil. Permite abrir el perfil
  /// público al tocar el avatar.
  final int? userId;

  const PartyDisplay({
    required this.title,
    this.subtitle,
    this.avatarUrl,
    required this.isProvider,
    this.userId,
  });
}
