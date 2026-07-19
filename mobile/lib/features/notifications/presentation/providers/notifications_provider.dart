import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/network/socket_service.dart';
import '../../domain/models/notification_model.dart';

class NotificationsProvider extends ChangeNotifier {
  static const _readRetention = Duration(days: 5);
  static const _unreadRetention = Duration(days: 30);

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

  /// Broadcasts del admin persistidos localmente. El backend NO guarda
  /// una fila por-usuario para los broadcasts masivos (sería caro y no
  /// hay columna `imageUrl`), así que los almacenamos en
  /// SharedPreferences para que sobrevivan al cierre de la app y el
  /// usuario pueda re-abrir el modal desde "Alertas" cuantas veces
  /// quiera. Clave: `broadcast_notifs_{userId}`.
  final List<AppNotification> _broadcasts = [];

  List<AppNotification> get items => List.unmodifiable(_items);
  int get unreadCount => _items.where((n) => !n.isRead).length;

  String _readKey(int userId) => 'read_notifs_$userId';
  String _broadcastKey(int userId) => 'broadcast_notifs_$userId';

  /// Una notif es "broadcast persistible" si trae imagen o es del tipo
  /// que emite el panel admin masivamente.
  static bool _isBroadcast(AppNotification n) =>
      n.type == 'BROADCAST' || (n.imageUrl != null && n.imageUrl!.isNotEmpty);

  static bool _isWithinRetention(AppNotification notification, DateTime now) {
    final age = now.difference(notification.createdAt);
    if (age.isNegative) return true;
    return age <= (notification.isRead ? _readRetention : _unreadRetention);
  }

  static bool _isPersistedServerNotification(AppNotification notification) =>
      int.tryParse(notification.id) != null;

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
    await prefs.setStringList(
      _readKey(_currentUserId!),
      _readOverrides.toList(),
    );
  }

  // ── Persistencia local de broadcasts ────────────────────────

  Future<void> _loadBroadcasts(int userId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_broadcastKey(userId)) ?? const [];
    final parsed = raw
        .map((s) {
          try {
            return AppNotification.fromLocalJson(
              jsonDecode(s) as Map<String, dynamic>,
            );
          } catch (_) {
            return null;
          }
        })
        .whereType<AppNotification>()
        .toList();
    final now = DateTime.now();
    final retained = parsed.where((n) => _isWithinRetention(n, now)).toList();
    _broadcasts
      ..clear()
      ..addAll(retained);

    if (retained.length != raw.length) {
      await prefs.setStringList(
        _broadcastKey(userId),
        retained.map((n) => jsonEncode(n.toLocalJson())).toList(),
      );
    }
  }

  Future<void> _persistBroadcasts() async {
    if (_currentUserId == null) return;
    final prefs = await SharedPreferences.getInstance();
    // Cap a 50 más recientes — evita crecer sin límite.
    final capped = _broadcasts.take(50).toList();
    await prefs.setStringList(
      _broadcastKey(_currentUserId!),
      capped.map((n) => jsonEncode(n.toLocalJson())).toList(),
    );
  }

  /// Registra un broadcast recibido (foreground inbound o tap en
  /// background) — lo agrega al inbox + lo persiste local. Idempotente:
  /// dedup por (title+body) en ±5s evita doble entrada entre canales.
  void recordBroadcast(AppNotification n) {
    if (_currentUserId == null) return;
    if (_isRecentDuplicate(n)) return;
    _broadcasts.insert(0, n);
    _items.insert(0, n);
    _persistBroadcasts();
    notifyListeners();
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
      _broadcasts.clear();
    }
    _currentUserId = userId;
    _currentUserRole = role;
    _activeProfileType = activeProfileType;
    SocketService.instance.addNotificationListener(_onNotification);
    notifyListeners();

    // Hidratar overrides de leídos + broadcasts persistidos antes de
    // pedir el historial. Los broadcasts viven solo en local (no en BD),
    // así que se siembran acá para que aparezcan en "Alertas" tras
    // reabrir la app.
    Future.wait([_loadReadOverrides(userId), _loadBroadcasts(userId)]).then((
      _,
    ) {
      // Sembrar broadcasts en la lista visible (sin duplicar).
      for (final b in _broadcasts) {
        if (!_items.any((n) => n.id == b.id)) _items.insert(0, b);
      }
      _items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
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
    _currentUserId = null;
    _currentUserRole = null;
    _activeProfileType = null;
    _items.clear();
    _broadcasts.clear();
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
    // Broadcast del admin → persistir local para que sobreviva al
    // cierre de la app (no vive en BD por-usuario).
    if (_isBroadcast(notification)) {
      _broadcasts.insert(0, notification);
      _persistBroadcasts();
    }
    notifyListeners();
  }

  void _onNotification(Map<String, dynamic> data) {
    final notification = AppNotification.fromSocket(data);
    final targetUserId = data['targetUserId'];
    final targetRole = data['targetRole'] as String?;
    final targetType = data['targetProfileType'] as String?;

    if (!_passesTargets(
      targetUserId: targetUserId,
      targetRole: targetRole,
      targetType: targetType,
    )) {
      return;
    }

    if (_isRecentDuplicate(notification)) return;

    _items.insert(0, notification);
    if (_isBroadcast(notification)) {
      _broadcasts.insert(0, notification);
      _persistBroadcasts();
    }
    notifyListeners();
  }

  /// Dedup robusto socket↔FCM↔BD. Los IDs incluyen timestamp y nunca
  /// matchearán entre canales, así que comparamos por (title + body)
  /// dentro de una ventana de 5 segundos. NO comparamos `type`: la misma
  /// notificación llega con type distinto según el canal (la persistida
  /// en BD usa 'APROBADO', la de socket/FCM 'PROVIDER_APPROVED'), y
  /// compararlo dejaba pasar duplicados.
  bool _isRecentDuplicate(AppNotification incoming) {
    final cutoff = DateTime.now().subtract(const Duration(seconds: 5));
    return _items.any(
      (n) =>
          n.title == incoming.title &&
          n.body == incoming.body &&
          n.createdAt.isAfter(cutoff),
    );
  }

  // ── Filtros ─────────────────────────────────────────────────

  bool _passesFilters(AppNotification n) {
    return _passesTargets(
      targetUserId:
          null, // ya viene filtrada del backend (es del provider del user)
      targetRole: null,
      targetType: n.targetProfileType,
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
    // (title + body) con alguna del server dentro de ±60s — ese local
    // es la "versión efímera" del server; preferimos el server (tiene
    // id real para markRead). NO comparamos `type`: el mismo aviso
    // llega con type distinto según el canal (BD 'APROBADO' vs
    // socket 'PROVIDER_APPROVED') y eso dejaba pasar duplicados.
    final existing = List<AppNotification>.from(_items);
    _items
      ..clear()
      ..addAll(fetched);

    bool dupOfServer(AppNotification local) {
      for (final s in fetched) {
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
      // Si una fila numérica ya no vino del servidor, fue eliminada o purgada.
      // Solo preservamos eventos efímeros de socket/FCM y broadcasts locales.
      if (_isPersistedServerNotification(old)) continue;
      if (!_isWithinRetention(old, DateTime.now())) continue;
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
    await Future.wait([_persistReadOverrides(), _persistBroadcasts()]);
    // Persist to backend (fire-and-forget; UI already updated)
    try {
      await _dio.patch('/provider-profile/me/notifications/read-all');
    } on DioException catch (e) {
      if (kDebugMode) debugPrint('[Notifications] markAllRead: ${e.message}');
    }
  }

  Future<void> markRead(String id) async {
    final n = _items.where((n) => n.id == id).firstOrNull;
    if (n != null && !n.isRead) {
      n.isRead = true;
      _readOverrides.add(id);
      notifyListeners();
      await _persistReadOverrides();
      if (_isBroadcast(n)) {
        await _persistBroadcasts();
        return;
      }
      if (!_isPersistedServerNotification(n)) return;
      try {
        await _dio.patch('/provider-profile/me/notifications/$id/read');
      } on DioException catch (e) {
        if (kDebugMode) debugPrint('[Notifications] markRead: ${e.message}');
      }
    }
  }

  void dismiss(String id) {
    _items.removeWhere((n) => n.id == id);
    final removedBroadcast = _broadcasts.any((n) => n.id == id);
    _broadcasts.removeWhere((n) => n.id == id);
    _readOverrides.remove(id);
    notifyListeners();
    _persistReadOverrides();
    if (removedBroadcast) _persistBroadcasts();
  }
}
