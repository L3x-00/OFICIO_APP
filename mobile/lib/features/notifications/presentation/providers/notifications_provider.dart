import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
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

  /// Set local de IDs marcados como leídos por el usuario. Persistido en
  /// SharedPreferences para que un PATCH `read-all` no se "olvide" cuando
  /// el backend tarde en propagar el estado: la siguiente carga seguirá
  /// viendo los items como leídos hasta que el server confirme.
  ///
  /// Clave: `read_notifs_{userId}` → JSON list de ids serializables.
  final Set<String> _readOverrides = <String>{};

  List<AppNotification> get items => List.unmodifiable(_items);
  int get unreadCount => _items.where((n) => !n.isRead).length;

  String _readKey(int userId) => 'read_notifs_$userId';

  Future<void> _loadReadOverrides(int userId) async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getStringList(_readKey(userId)) ?? const [];
    _readOverrides
      ..clear()
      ..addAll(stored);
  }

  Future<void> _persistReadOverrides() async {
    if (_currentUserId == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_readKey(_currentUserId!), _readOverrides.toList());
  }

  /// Llamar tras el login. Empieza a filtrar notificaciones por usuario/rol y
  /// dispara la carga del historial persistido.
  void setUser({
    required int userId,
    required String role,
    String? activeProfileType,
  }) {
    if (_currentUserId != null && _currentUserId != userId) {
      _items.clear();
      _readOverrides.clear();
    }
    _currentUserId      = userId;
    _currentUserRole    = role;
    _activeProfileType  = activeProfileType;
    SocketService.instance.addNotificationListener(_onNotification);
    notifyListeners();

    // Hidratar el set local de IDs leídos antes de pedir el historial — así
    // si el backend devuelve isRead=false por una latencia del PATCH, el
    // override local lo corrige al instante.
    _loadReadOverrides(userId).then((_) {
      _applyOverrides();
      notifyListeners();
      loadHistory();
    });
  }

  /// Aplica `_readOverrides` sobre `_items` — usar tras merge desde server
  /// o tras agregar items locales para no "olvidar" lecturas previas.
  void _applyOverrides() {
    for (final n in _items) {
      if (_readOverrides.contains(n.id)) n.isRead = true;
    }
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
      _applyOverrides();
    } on DioException catch (e) {
      if (kDebugMode) debugPrint('[Notifications] loadHistory: ${e.message}');
    } catch (e) {
      if (kDebugMode) debugPrint('[Notifications] loadHistory: $e');
    } finally {
      _loadingHistory = false;
      notifyListeners();
    }
  }

  /// Inyecta una notificación recibida desde FCM en la lista para que
  /// aparezca en la pantalla de "Alertas". Solo se llama en FOREGROUND
  /// — el tap en background/terminated abre la app via deep link y la
  /// notif ya está persistida en el backend (loadHistory la trae).
  ///
  /// B-4: validamos targetUserId si viene en el data del FCM — defensa
  /// contra el caso edge de tokens FCM cross-contaminados.
  void addLocal(AppNotification notification, {Object? targetUserId}) {
    if (targetUserId != null) {
      final id = targetUserId is int
          ? targetUserId
          : int.tryParse(targetUserId.toString());
      if (id != _currentUserId) return;
    }
    if (!_passesFilters(notification)) return;
    if (_isRecentDuplicate(notification)) return;
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

    if (_isRecentDuplicate(notification)) return;

    _items.insert(0, notification);
    notifyListeners();
  }

  /// Dedup robusto socket↔FCM. Los IDs incluyen timestamp y nunca matchearán
  /// entre canales, así que comparamos por (type + title + body) dentro de
  /// una ventana de 5 segundos. Si el approval llega por socket y FCM en
  /// foreground, solo se inserta una vez.
  bool _isRecentDuplicate(AppNotification incoming) {
    final cutoff = DateTime.now().subtract(const Duration(seconds: 5));
    return _items.any((n) =>
      n.type == incoming.type &&
      n.title == incoming.title &&
      n.body == incoming.body &&
      n.createdAt.isAfter(cutoff));
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
    // Mantenemos las notificaciones in-memory que aún no están en el
    // server (ej. recién recibidas por socket entre logins).
    //
    // B-7: las del socket/FCM tienen id sintético "{millis}_TYPE", las
    // del server tienen id numérico. Match por id falla → duplicado.
    // Fix: además de id, descartamos locales que coincidan en
    // (type + title + body) con alguna del server dentro de ±60s —
    // ese local es la "versión efímera" del server; preferimos el
    // server (tiene id real para markRead).
    final existing = List<AppNotification>.from(_items);
    _items
      ..clear()
      ..addAll(fetched);

    bool dupOfServer(AppNotification local) {
      for (final s in fetched) {
        if (s.type != local.type) continue;
        if (s.title != local.title) continue;
        if (s.body != local.body) continue;
        final diff = s.createdAt.difference(local.createdAt).inSeconds.abs();
        if (diff <= 60) return true;
      }
      return false;
    }

    for (final old in existing) {
      if (_items.any((n) => n.id == old.id)) continue;
      if (dupOfServer(old)) continue;
      _items.add(old);
    }
    _items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  // ── Acciones del usuario ────────────────────────────────────

  Future<void> markAllRead() async {
    // Optimistic update + override persistente para sobrevivir reloads.
    for (final n in _items) {
      n.isRead = true;
      _readOverrides.add(n.id);
    }
    notifyListeners();
    await _persistReadOverrides();
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
      _readOverrides.add(id);
      notifyListeners();
      _persistReadOverrides();
    }
  }

  void dismiss(String id) {
    _items.removeWhere((n) => n.id == id);
    notifyListeners();
  }
}
