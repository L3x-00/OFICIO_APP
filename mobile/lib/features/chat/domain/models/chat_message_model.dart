/// Estado de entrega del mensaje (espejo del enum del backend).
/// `failed` es solo cliente: el envío al server falló y el mensaje
/// queda visible para reintentar (antes se borraba silenciosamente).
enum MessageStatus { sending, sent, delivered, read, failed }

extension MessageStatusX on MessageStatus {
  String get apiName => switch (this) {
        MessageStatus.sending   => 'SENT', // mientras está pending no se envía al server
        MessageStatus.sent      => 'SENT',
        MessageStatus.delivered => 'DELIVERED',
        MessageStatus.read      => 'READ',
        MessageStatus.failed    => 'SENT', // nunca llegó al server
      };

  static MessageStatus fromApi(String value) => switch (value.toUpperCase()) {
        'SENT'      => MessageStatus.sent,
        'DELIVERED' => MessageStatus.delivered,
        'READ'      => MessageStatus.read,
        _           => MessageStatus.sent,
      };
}

class ChatMessageModel {
  /// `null` mientras el mensaje está optimista (todavía no responde el server).
  final int? id;
  final int chatRoomId;
  final int senderId;
  final String content;
  final MessageStatus status;
  final DateTime createdAt;
  /// Sólo se usa para reemplazar mensajes optimistas con la respuesta real.
  final String? clientTempId;

  const ChatMessageModel({
    this.id,
    required this.chatRoomId,
    required this.senderId,
    required this.content,
    required this.status,
    required this.createdAt,
    this.clientTempId,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id:         (json['id'] as num?)?.toInt(),
      chatRoomId: (json['chatRoomId'] as num).toInt(),
      senderId:   (json['senderId']   as num).toInt(),
      content:    json['content'] as String? ?? '',
      status:     MessageStatusX.fromApi(json['status'] as String? ?? 'SENT'),
      createdAt:  DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  ChatMessageModel copyWith({
    int? id,
    MessageStatus? status,
    String? clientTempId,
  }) {
    return ChatMessageModel(
      id:           id ?? this.id,
      chatRoomId:   chatRoomId,
      senderId:     senderId,
      content:      content,
      status:       status ?? this.status,
      createdAt:    createdAt,
      clientTempId: clientTempId ?? this.clientTempId,
    );
  }

  /// Identidad estable: id real si existe, si no el clientTempId.
  String get key => id?.toString() ?? clientTempId ?? '${createdAt.toIso8601String()}_$senderId';
}
