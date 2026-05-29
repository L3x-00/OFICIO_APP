import 'package:flutter/material.dart';

/// Modelo unificado para notificaciones recibidas vía:
/// - Socket.io (`fromSocket`) — payload en vivo emitido por el backend
/// - REST `GET /provider-profile/me/notifications` (`fromJson`)
/// - Push FCM (`fromSocket`, ya que comparte la forma del payload)
class AppNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final DateTime createdAt;

  /// Si está presente, indica que la notificación es solo para perfiles de
  /// este tipo (OFICIO|NEGOCIO). Si es null, no filtra.
  final String? targetProfileType;

  /// Avatar para el render del item — usado por CHAT_MESSAGE para
  /// mostrar la foto del remitente en lugar del icono genérico.
  final String? avatarUrl;

  /// Metadata de acción que llega en vivo (socket/FCM). Contiene cosas
  /// como `chatRoomId`, `requestId`, `offerId`, `reviewId` que el botón
  /// del tile usa para navegar al destino específico. Las notif
  /// persistidas (cargadas vía REST) NO tienen esto y caen al fallback
  /// de navegación por tipo.
  final Map<String, dynamic>? actionData;

  /// URL de imagen adjunta a la notificación (típicamente broadcasts del
  /// admin con foto). Si está presente, el tap en el tile del inbox
  /// abre el modal enriquecido en vez de solo marcar leído.
  final String? imageUrl;

  bool isRead;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    this.targetProfileType,
    this.avatarUrl,
    this.actionData,
    this.imageUrl,
    this.isRead = false,
  });

  /// Notificación recibida en vivo por websocket o por FCM (mismo payload).
  factory AppNotification.fromSocket(Map<String, dynamic> data) {
    return AppNotification(
      id: '${DateTime.now().millisecondsSinceEpoch}_${data['type']}',
      type: data['type'] as String? ?? 'GENERIC',
      title: data['title'] as String? ?? 'Notificación',
      body: data['body'] as String? ?? '',
      createdAt: DateTime.now(),
      targetProfileType: data['targetProfileType'] as String?,
      avatarUrl:
          data['avatarUrl'] as String? ?? data['senderAvatarUrl'] as String?,
      actionData: _extractActionData(data),
      imageUrl: _readImageUrl(data),
      isRead: false,
    );
  }

  /// Notificación persistida en BD (devuelta por GET /provider-profile/me/notifications).
  /// Backend usa `message` en vez de `body` y `sentAt` en vez de `createdAt`.
  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id']?.toString() ?? '${DateTime.now().millisecondsSinceEpoch}',
      type: json['type'] as String? ?? 'GENERIC',
      title: json['title'] as String? ?? 'Notificación',
      body: (json['body'] ?? json['message']) as String? ?? '',
      createdAt:
          DateTime.tryParse(
            (json['createdAt'] ?? json['sentAt'])?.toString() ?? '',
          ) ??
          DateTime.now(),
      targetProfileType: json['targetProfileType'] as String?,
      actionData: _extractActionData(json),
      imageUrl: _readImageUrl(json),
      isRead: json['isRead'] as bool? ?? false,
    );
  }

  /// Lee la URL de imagen tolerando los dos nombres que circulan:
  /// `imageUrl` (backend BROADCAST, FCM data) y `image` (alias FCM v1).
  static String? _readImageUrl(Map<String, dynamic> src) {
    final v = src['imageUrl'] ?? src['image'];
    if (v is String && v.isNotEmpty) return v;
    return null;
  }

  /// Serializa para persistir en SharedPreferences. Usado SOLO para las
  /// notificaciones broadcast del admin (que no viven en BD por-usuario):
  /// así sobreviven al cierre de la app y el usuario puede re-abrir el
  /// modal cuantas veces quiera desde "Alertas".
  Map<String, dynamic> toLocalJson() => {
    'id': id,
    'type': type,
    'title': title,
    'body': body,
    'createdAt': createdAt.toIso8601String(),
    'imageUrl': imageUrl,
    'isRead': isRead,
  };

  /// Reconstruye desde el JSON local de SharedPreferences.
  factory AppNotification.fromLocalJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String? ?? '${DateTime.now().millisecondsSinceEpoch}',
      type: json['type'] as String? ?? 'BROADCAST',
      title: json['title'] as String? ?? 'Notificación',
      body: json['body'] as String? ?? '',
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      imageUrl: json['imageUrl'] as String?,
      isRead: json['isRead'] as bool? ?? false,
    );
  }

  /// Copia de las keys de payload que usamos para navegar — las
  /// preservamos como ints porque el destino (go_router) las consume así.
  static Map<String, dynamic>? _extractActionData(Map<String, dynamic> src) {
    final keep = <String, dynamic>{};
    for (final k in const [
      'chatRoomId',
      'roomId',
      'requestId',
      'offerId',
      'providerId',
      'reviewId',
    ]) {
      final v = src[k];
      if (v != null) keep[k] = v;
    }
    return keep.isEmpty ? null : keep;
  }

  IconData get icon {
    return switch (type) {
      'PROVIDER_APPROVED' => Icons.check_circle_rounded,
      'PROVIDER_REJECTED' => Icons.cancel_rounded,
      'NEW_REVIEW' => Icons.star_rounded,
      'REVIEW_REPLY' => Icons.chat_bubble_rounded,
      'CHAT_MESSAGE' => Icons.chat_rounded,
      'PLAN_APROBADO' => Icons.workspace_premium_rounded,
      'PLAN_RECHAZADO' => Icons.block_rounded,
      'PASSWORD_CHANGED' => Icons.lock_rounded,
      'NEW_PROVIDER' => Icons.person_add_rounded,
      'NEW_OFFER' => Icons.local_offer_rounded,
      'OFFER_ACCEPTED' => Icons.task_alt_rounded,
      _ => Icons.notifications_rounded,
    };
  }

  Color get iconColor {
    return switch (type) {
      'PROVIDER_APPROVED' => const Color(0xFF4CAF50),
      'PROVIDER_REJECTED' => const Color(0xFFF44336),
      'NEW_REVIEW' => const Color(0xFFFFB300),
      'REVIEW_REPLY' => const Color(0xFF29B6F6),
      'CHAT_MESSAGE' => const Color(0xFF25D366),
      'PLAN_APROBADO' => const Color(0xFF4CAF50),
      'PLAN_RECHAZADO' => const Color(0xFFF44336),
      'PASSWORD_CHANGED' => const Color(0xFF2196F3),
      'NEW_PROVIDER' => const Color(0xFF9C27B0),
      'NEW_OFFER' => const Color(0xFFE07B39),
      'OFFER_ACCEPTED' => const Color(0xFF10B981),
      _ => const Color(0xFF607D8B),
    };
  }
}
