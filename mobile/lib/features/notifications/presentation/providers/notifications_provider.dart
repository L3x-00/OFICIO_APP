import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/network/socket_service.dart';
import '../../domain/models/notification_model.dart';

class NotificationsProvider extends ChangeNotifier {
  final Dio _dio = DioClient.instance.dio;

  final List<AppNotification> _items = [];
  int? _currentUserId;
  String? _currentUserRole;
  /// Tipo de perfil activo (OFICIO|NEGOCIO). Si es null, no filtramos.
  String? _activeProfileType;

  bool _loadingHistory = false;
  bool get loadingHistory => _loadingHistory;

  List<AppNotification> get items => List.unmodifiable(_items);
  int get unreadCount => _items.where((n) => !n.isRead).length;

  /// Llamar tras el login. Empieza a filtrar notificaciones por usuario/rol y
  /// dispara la carga del historial persistido.
  void setUser({
    required int userId,
    required String role,
    String? activeProfileType,
  }) {
    if (_currentUserId != null && _currentUserId != userId) {
      _items.clear();
    }
    _currentUserId      = userId;
    _currentUserRole    = role;
    _activeProfileType  = activeProfileType;
    SocketService.instance.addNotificationListener(_onNotification);
    notifyListeners();

    // Cargar historial desde el backend (no bloquea — UI ya está visible).
    loadHistory();
  }

  /// Permite cambiar el tipo de perfil activo cuando el dashboard cambia
  /// entre OFICIO y NEGOCIO sin desloguear.
  void setActiveProfileType(String? type) {
    if (_activeProfileType == type) return;
    _activeProfileType = type;
    notifyListeners();
  }

  void clearUser() {
    SocketService.instance.removeNotificationListener(_onNotification);
    _currentUserId      = null;
    _currentUserRole    = null;
    _activeProfileType  = null;
    _items.clear();
    notifyListeners();
  }

  /// Trae el historial persistido para el provider del usuario autenticado.
  /// Falla silenciosa: si el usuario es cliente puro sin provider, no rompe.
  Future<void> loadHistory() async {
    if (_currentUserId == null || _loadingHistory) return;
    _loadingHistory = true;
    notifyListeners();
    try {
      final res = await _dio.get('/provider-profile/me/notifications');
      final raw = res.data;
      final list = (raw is Map && raw['data'] is List)
          ? (raw['data'] as List)
          : (raw is List ? raw : const []);

      final fetched = list
          .whereType<Map<String, dynamic>>()
          .map(AppNotification.fromJson)
          .where(_passesFilters)
          .toList();

      _mergeWithExisting(fetched);
    } on DioException catch (e) {
      if (kDebugMode) debugPrint('[Notifications] loadHistory: ${e.message}');
    } catch (e) {
      if (kDebugMode) debugPrint('[Notifications] loadHistory: $e');
    } finally {
      _loadingHistory = false;
      notifyListeners();
    }
  }

  /// Inyecta una notificación recibida desde FCM (foreground o tap) en la
  /// lista para que aparezca en la pantalla de "Alertas".
  void addLocal(AppNotification notification) {
    if (!_passesFilters(notification)) return;
    // Evita duplicar si ya entró por websocket con el mismo id.
    if (_items.any((n) => n.id == notification.id)) return;
    _items.insert(0, notification);
    notifyListeners();
  }

  void _onNotification(Map<String, dynamic> data) {
    final notification = AppNotification.fromSocket(data);
    final targetUserId = data['targetUserId'];
    final targetRole   = data['targetRole']        as String?;
    final targetType   = data['targetProfileType'] as String?;

    if (!_passesTargets(
      targetUserId: targetUserId,
      targetRole:   targetRole,
      targetType:   targetType,
    )) {
      return;
    }

    _items.insert(0, notification);
    notifyListeners();
  }

  // ── Filtros ─────────────────────────────────────────────────

  bool _passesFilters(AppNotification n) {
    return _passesTargets(
      targetUserId: null, // ya viene filtrada del backend (es del provider del user)
      targetRole:   null,
      targetType:   n.targetProfileType,
    );
  }

  bool _passesTargets({
    Object? targetUserId,
    String? targetRole,
    String? targetType,
  }) {
    if (targetUserId != null) {
      final id = targetUserId is int
          ? targetUserId
          : int.tryParse(targetUserId.toString());
      if (id != _currentUserId) return false;
    }
    if (targetRole != null && targetRole != _currentUserRole) return false;
    if (targetType != null &&
        _activeProfileType != null &&
        targetType != _activeProfileType) {
      return false;
    }
    return true;
  }

  void _mergeWithExisting(List<AppNotification> fetched) {
    // Mantenemos las notificaciones in-memory que aún no están en el server
    // (ej. recién recibidas por socket entre logins).
    final existing = List<AppNotification>.from(_items);
    _items
      ..clear()
      ..addAll(fetched);
    for (final old in existing) {
      if (!_items.any((n) => n.id == old.id)) {
        _items.add(old);
      }
    }
    _items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  // ── Acciones del usuario ────────────────────────────────────

  Future<void> markAllRead() async {
    // Optimistic update
    for (final n in _items) {
      n.isRead = true;
    }
    notifyListeners();
    // Persist to backend (fire-and-forget; UI already updated)
    try {
      await _dio.patch('/provider-profile/me/notifications/read-all');
    } on DioException catch (e) {
      if (kDebugMode) debugPrint('[Notifications] markAllRead: ${e.message}');
    }
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
