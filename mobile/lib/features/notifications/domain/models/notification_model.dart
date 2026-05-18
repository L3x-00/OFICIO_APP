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
  bool isRead;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    this.targetProfileType,
    this.isRead = false,
  });

  /// Notificación recibida en vivo por websocket o por FCM (mismo payload).
  factory AppNotification.fromSocket(Map<String, dynamic> data) {
    return AppNotification(
      id:        '${DateTime.now().millisecondsSinceEpoch}_${data['type']}',
      type:      data['type']  as String? ?? 'GENERIC',
      title:     data['title'] as String? ?? 'Notificación',
      body:      data['body']  as String? ?? '',
      createdAt: DateTime.now(),
      targetProfileType: data['targetProfileType'] as String?,
      isRead: false,
    );
  }

  /// Notificación persistida en BD (devuelta por GET /provider-profile/me/notifications).
  /// Backend usa `message` en vez de `body` y `sentAt` en vez de `createdAt`.
  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id:        json['id']?.toString() ?? '${DateTime.now().millisecondsSinceEpoch}',
      type:      json['type']    as String? ?? 'GENERIC',
      title:     json['title']   as String? ?? 'Notificación',
      body:      (json['body'] ?? json['message']) as String? ?? '',
      createdAt: DateTime.tryParse(
                   (json['createdAt'] ?? json['sentAt'])?.toString() ?? '',
                 ) ?? DateTime.now(),
      targetProfileType: json['targetProfileType'] as String?,
      isRead:    json['isRead'] as bool? ?? false,
    );
  }

  IconData get icon {
    return switch (type) {
      'PROVIDER_APPROVED' => Icons.check_circle_rounded,
      'PROVIDER_REJECTED' => Icons.cancel_rounded,
      'NEW_REVIEW'        => Icons.star_rounded,
      'REVIEW_REPLY'      => Icons.chat_bubble_rounded,
      'CHAT_MESSAGE'      => Icons.chat_rounded,
      'PLAN_APROBADO'     => Icons.workspace_premium_rounded,
      'PLAN_RECHAZADO'    => Icons.block_rounded,
      'PASSWORD_CHANGED'  => Icons.lock_rounded,
      'NEW_PROVIDER'      => Icons.person_add_rounded,
      'NEW_OFFER'         => Icons.local_offer_rounded,
      'OFFER_ACCEPTED'    => Icons.task_alt_rounded,
      _                   => Icons.notifications_rounded,
    };
  }

  Color get iconColor {
    return switch (type) {
      'PROVIDER_APPROVED' => const Color(0xFF4CAF50),
      'PROVIDER_REJECTED' => const Color(0xFFF44336),
      'NEW_REVIEW'        => const Color(0xFFFFB300),
      'REVIEW_REPLY'      => const Color(0xFF29B6F6),
      'CHAT_MESSAGE'      => const Color(0xFF25D366),
      'PLAN_APROBADO'     => const Color(0xFF4CAF50),
      'PLAN_RECHAZADO'    => const Color(0xFFF44336),
      'PASSWORD_CHANGED'  => const Color(0xFF2196F3),
      'NEW_PROVIDER'      => const Color(0xFF9C27B0),
      'NEW_OFFER'         => const Color(0xFFE07B39),
      'OFFER_ACCEPTED'    => const Color(0xFF10B981),
      _                   => const Color(0xFF607D8B),
    };
  }
}
