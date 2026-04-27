import 'package:flutter/foundation.dart';
import '../../../../core/network/socket_service.dart';
import '../../domain/models/notification_model.dart';

class NotificationsProvider extends ChangeNotifier {
  final List<AppNotification> _items = [];
  int? _currentUserId;
  String? _currentUserRole;

  List<AppNotification> get items => List.unmodifiable(_items);
  int get unreadCount => _items.where((n) => !n.isRead).length;

  /// Llamar tras el login para empezar a filtrar notificaciones por usuario/rol.
  void setUser({required int userId, required String role}) {
    // Si es un usuario diferente, limpiar datos del anterior
    if (_currentUserId != null && _currentUserId != userId) {
      _items.clear();
    }
    _currentUserId = userId;
    _currentUserRole = role;
    SocketService.instance.addNotificationListener(_onNotification);
    notifyListeners();
  }

  /// Llamar al cerrar sesión — desconecta el socket pero preserva items.
  void clearUser() {
    SocketService.instance.removeNotificationListener(_onNotification);
    _currentUserId = null;
    _currentUserRole = null;
    // No se borran _items para que persistan al volver a iniciar sesión
    notifyListeners();
  }

  void _onNotification(Map<String, dynamic> data) {
    final targetUserId = data['targetUserId'];
    final targetRole   = data['targetRole']   as String?;

    // Filtrar: si la notificación es para un usuario específico, verificar
    if (targetUserId != null) {
      final id = targetUserId is int ? targetUserId : int.tryParse(targetUserId.toString());
      if (id != _currentUserId) return;
    }

    // Filtrar: si es para un rol específico, verificar
    if (targetRole != null && targetRole != _currentUserRole) return;

    // Si no hay filtro de usuario ni de rol, es para todos
    final notification = AppNotification.fromSocket(data);
    _items.insert(0, notification);
    notifyListeners();
  }

  void markAllRead() {
    for (final n in _items) {
      n.isRead = true;
    }
    notifyListeners();
  }

  void markRead(String id) {
    final n = _items.where((n) => n.id == id).firstOrNull;
    if (n != null && !n.isRead) {
      n.isRead = true;
      notifyListeners();
    }
  }

  void dismiss(String id) {
    _items.removeWhere((n) => n.id == id);
    notifyListeners();
  }
}
