import 'package:flutter/material.dart';

class AppNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final DateTime createdAt;
  bool isRead;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    this.isRead = false,
  });

  factory AppNotification.fromSocket(Map<String, dynamic> data) {
    return AppNotification(
      id:        '${DateTime.now().millisecondsSinceEpoch}_${data['type']}',
      type:      data['type'] as String? ?? 'GENERIC',
      title:     data['title'] as String? ?? 'Notificación',
      body:      data['body']  as String? ?? '',
      createdAt: DateTime.now(),
    );
  }

  IconData get icon {
    return switch (type) {
      'PROVIDER_APPROVED' => Icons.check_circle_rounded,
      'PROVIDER_REJECTED' => Icons.cancel_rounded,
      'NEW_REVIEW'        => Icons.star_rounded,
      'PASSWORD_CHANGED'  => Icons.lock_rounded,
      'NEW_PROVIDER'      => Icons.person_add_rounded,
      _                   => Icons.notifications_rounded,
    };
  }

  Color get iconColor {
    return switch (type) {
      'PROVIDER_APPROVED' => const Color(0xFF4CAF50),
      'PROVIDER_REJECTED' => const Color(0xFFF44336),
      'NEW_REVIEW'        => const Color(0xFFFFB300),
      'PASSWORD_CHANGED'  => const Color(0xFF2196F3),
      'NEW_PROVIDER'      => const Color(0xFF9C27B0),
      _                   => const Color(0xFF607D8B),
    };
  }
}
