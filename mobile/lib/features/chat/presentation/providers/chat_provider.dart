import 'package:flutter/foundation.dart';
import '../../../../core/network/socket_service.dart';
import '../../data/chat_repository.dart';
import '../../domain/models/chat_message_model.dart';
import '../../domain/models/chat_room_model.dart';

/// Estado global del chat: bandeja de entrada + mensajes por sala +
/// suscripción a eventos WebSocket. La UI lee de aquí; los repositorios
/// son detalle privado.
class ChatProvider extends ChangeNotifier {
  final ChatRepository _repo = ChatRepository();

  /// Salas del usuario actual, ordenadas por última actividad (desc).
  List<ChatRoomSummary> _rooms = [];
  /// Mensajes por sala (cargamos sólo bajo demanda en ChatScreen).
  final Map<int, List<ChatMessageModel>> _messagesByRoom = {};
  /// Sala que el usuario tiene actualmente abierta — para auto-marcar leídos.
  int? _activeRoomId;
  /// User.id del logueado — necesario para identificar mensajes propios.
  int? _currentUserId;

  /// Rol activo de la bandeja: `client` o `provider`. null = no filtrar.
  String? _activeScope;
  /// Tipo de perfil de proveedor activo (OFICIO|NEGOCIO) cuando
  /// `_activeScope == 'provider'`. null = sin filtro de tipo.
  String? _activeProviderType;

  bool _loadingRooms = false;
  String? _error;

  // ── Estado de paginación de historial por sala ─────────────
  final Map<int, _RoomPagingState> _paging = {};

  // ── Public getters ─────────────────────────────────────────
  List<ChatRoomSummary> get rooms => List.unmodifiable(_rooms);
  bool get isLoadingRooms => _loadingRooms;
  String? get error => _error;
  int? get currentUserId => _currentUserId;
  int get totalUnread => _rooms.fold(0, (sum, r) => sum + r.unreadCount);

  List<ChatMessageModel> messagesOf(int roomId) =>
      List.unmodifiable(_messagesByRoom[roomId] ?? const []);

  bool isLoadingHistory(int roomId) => _paging[roomId]?.loading ?? false;
  bool hasMoreHistory(int roomId)   => _paging[roomId]?.hasMore  ?? true;

  // ── Listeners externos al socket ───────────────────────────
  void Function(Map<String, dynamic>)? _onNewMessage;
  void Function(Map<String, dynamic>)? _onMessagesRead;

  // ── Lifecycle ──────────────────────────────────────────────

  /// Inicializa el estado para el usuario logueado y registra los listeners.
  /// Idempotente: llamarlo varias veces sólo refresca el userId.
  Future<void> initialize(int userId) async {
    if (_currentUserId != userId) {
      // Cambio de cuenta: limpiar todo
      _rooms = [];
      _messagesByRoom.clear();
      _paging.clear();
      _activeRoomId = null;
    }
    _currentUserId = userId;
    _attachSocketListeners();
    await loadRooms();
  }

  void _attachSocketListeners() {
    // Quitar listeners previos para evitar duplicados al reconectar
    if (_onNewMessage != null) {
      SocketService.instance.removeChatMessageListener(_onNewMessage!);
    }
    if (_onMessagesRead != null) {
      SocketService.instance.removeChatReadListener(_onMessagesRead!);
    }

    _onNewMessage = _handleIncomingMessage;
    _onMessagesRead = _handleMessagesRead;
    SocketService.instance.addChatMessageListener(_onNewMessage!);
    SocketService.instance.addChatReadListener(_onMessagesRead!);
  }

  @override
  void dispose() {
    if (_onNewMessage != null) {
      SocketService.instance.removeChatMessageListener(_onNewMessage!);
    }
    if (_onMessagesRead != null) {
      SocketService.instance.removeChatReadListener(_onMessagesRead!);
    }
    super.dispose();
  }

  // ── Loaders ────────────────────────────────────────────────

  Future<void> loadRooms() async {
    if (_currentUserId == null) return;
    _loadingRooms = true;
    _error = null;
    notifyListeners();
    try {
      _rooms = await _repo.getMyRooms(
        scope:        _activeScope,
        providerType: _activeProviderType,
      );
    } catch (e) {
      _error = 'No se pudieron cargar las conversaciones.';
      debugPrint('[Chat] loadRooms error: $e');
    } finally {
      _loadingRooms = false;
      notifyListeners();
    }
  }

  /// Cambia la bandeja activa y refresca. `scope = 'client'` muestra solo
  /// las conversaciones donde el user es el cliente; `'provider'` filtra
  /// las que pertenecen a su perfil de proveedor (opcionalmente acotado
  /// a `providerType` OFICIO/NEGOCIO para mantener bandejas separadas
  /// entre los dos perfiles del mismo usuario).
  ///
  /// Idempotente: si el scope/type no cambió, no recarga.
  Future<void> setScope({String? scope, String? providerType}) async {
    if (_activeScope == scope && _activeProviderType == providerType) return;
    _activeScope        = scope;
    _activeProviderType = providerType;
    // Limpia el cache local — cada bandeja vive en su propio set de
    // salas, no queremos arrastrar las del scope anterior mientras
    // refrescamos.
    _rooms = [];
    _messagesByRoom.clear();
    _paging.clear();
    notifyListeners();
    await loadRooms();
  }

  /// Siembra inicial con el `lastMessage` del resumen mientras cargamos
  /// el historial completo (parpadeo cero al abrir la sala).
  void seedMessagesFromLast(int roomId) {
    final idx = _rooms.indexWhere((e) => e.id == roomId);
    if (idx == -1) {
      _messagesByRoom.putIfAbsent(roomId, () => []);
      return;
    }
    final last = _rooms[idx].lastMessage;
    if (last == null) {
      _messagesByRoom.putIfAbsent(roomId, () => []);
      return;
    }
    final existing = _messagesByRoom[roomId] ?? [];
    if (existing.any((m) => m.id == last.id)) return;
    _messagesByRoom[roomId] = [last];
  }

  // ── Historial paginado ─────────────────────────────────────

  /// Carga la primera página del historial. Si ya está cargado y `force`
  /// es false, no hace nada (idempotente). Reemplaza la lista entera con
  /// los datos del backend, conservando los mensajes optimistas pendientes.
  Future<void> loadRoomHistory(int roomId, {bool force = false}) async {
    final state = _paging.putIfAbsent(roomId, _RoomPagingState.initial);
    if (state.loading) return;
    if (!force && state.loadedFirstPage) return;

    state.loading = true;
    notifyListeners();
    try {
      final res = await _repo.getRoomMessages(roomId, page: 1, limit: 30);
      // Backend devuelve DESC; UI necesita ASC (antiguos arriba)
      final asc = res.items.reversed.toList();

      // Conservar los mensajes optimistas que aún no tienen `id`
      final pending = (_messagesByRoom[roomId] ?? const <ChatMessageModel>[])
          .where((m) => m.id == null)
          .toList();

      _messagesByRoom[roomId] = [...asc, ...pending];
      state
        ..loadedFirstPage = true
        ..nextPage        = 2
        ..hasMore         = res.hasMore;
    } catch (e) {
      debugPrint('[Chat] loadRoomHistory error: $e');
      _error = 'No se pudo cargar el historial.';
    } finally {
      state.loading = false;
      notifyListeners();
    }
  }

  /// Carga la siguiente página (mensajes más antiguos) y los antepone.
  /// Devuelve la cantidad de mensajes añadidos para que la UI ajuste el
  /// scroll y mantenga la posición visual.
  Future<int> loadMoreHistory(int roomId) async {
    final state = _paging[roomId];
    if (state == null || !state.loadedFirstPage) return 0;
    if (state.loading || !state.hasMore) return 0;

    state.loading = true;
    notifyListeners();
    try {
      final res = await _repo.getRoomMessages(
        roomId,
        page:  state.nextPage,
        limit: 30,
      );
      final asc = res.items.reversed.toList();
      // Filtrar los que ya tenemos por id
      final current = _messagesByRoom[roomId] ?? const <ChatMessageModel>[];
      final knownIds = current.map((m) => m.id).whereType<int>().toSet();
      final fresh = asc.where((m) => m.id == null || !knownIds.contains(m.id))
          .toList();

      _messagesByRoom[roomId] = [...fresh, ...current];
      state
        ..nextPage = state.nextPage + 1
        ..hasMore  = res.hasMore;
      return fresh.length;
    } catch (e) {
      debugPrint('[Chat] loadMoreHistory error: $e');
      return 0;
    } finally {
      state.loading = false;
      notifyListeners();
    }
  }

  // ── Active room (para auto-read) ───────────────────────────

  void setActiveRoom(int? roomId) {
    _activeRoomId = roomId;
  }

  // ── Crear / abrir sala ─────────────────────────────────────

  /// Idempotente: si ya hay una sala con ese cliente y proveedor, la devuelve.
  /// SIEMPRE refresca la bandeja después — antes solo lo hacía si la sala
  /// no estaba cacheada, pero el dato expandido (client/provider con
  /// avatar+nombre) podía estar desactualizado en cache → header del
  /// ChatScreen sin foto/nombre hasta el siguiente refresh.
  Future<int> openRoom({
    required int clientId,
    required int providerId,
  }) async {
    final basic = await _repo.getOrCreateRoom(
      clientId: clientId,
      providerId: providerId,
    );
    await loadRooms();
    return basic.id;
  }

  // ── Enviar mensaje (con optimistic update) ─────────────────

  Future<void> sendMessage({
    required int roomId,
    required String content,
  }) async {
    final senderId = _currentUserId;
    if (senderId == null) throw StateError('Usuario no inicializado');
    final trimmed = content.trim();
    if (trimmed.isEmpty) return;

    final tempId = 'tmp_${DateTime.now().microsecondsSinceEpoch}';
    final optimistic = ChatMessageModel(
      id:           null,
      chatRoomId:   roomId,
      senderId:     senderId,
      content:      trimmed,
      status:       MessageStatus.sending,
      createdAt:    DateTime.now(),
      clientTempId: tempId,
    );
    _appendMessage(roomId, optimistic);
    notifyListeners();

    try {
      final saved = await _repo.sendMessage(
        chatRoomId: roomId,
        senderId:   senderId,
        content:    trimmed,
      );
      _replaceTempMessage(roomId, tempId, saved);
    } catch (e) {
      // El envío falló: NO borramos el mensaje — lo dejamos visible en
      // estado `failed` para que el usuario pueda tocarlo y reintentar.
      // Antes se eliminaba con _removeTempMessage → el user veía sus
      // mensajes "desaparecer" al enviarlos.
      debugPrint('[Chat] sendMessage error: $e');
      _markTempFailed(roomId, tempId);
      _error = 'No se pudo enviar el mensaje. Tócalo para reintentar.';
    } finally {
      notifyListeners();
    }
  }

  /// Reintenta un mensaje que quedó en estado `failed`. Idempotente: si
  /// el mensaje ya no existe o no está fallido, no hace nada.
  Future<void> retryMessage(int roomId, String clientTempId) async {
    final list = _messagesByRoom[roomId];
    if (list == null) return;
    final idx = list.indexWhere((m) => m.clientTempId == clientTempId);
    if (idx == -1 || list[idx].status != MessageStatus.failed) return;

    final senderId = _currentUserId;
    if (senderId == null) return;

    final msg = list[idx];
    list[idx] = msg.copyWith(status: MessageStatus.sending);
    notifyListeners();

    try {
      final saved = await _repo.sendMessage(
        chatRoomId: roomId,
        senderId:   senderId,
        content:    msg.content,
      );
      _replaceTempMessage(roomId, clientTempId, saved);
    } catch (e) {
      debugPrint('[Chat] retryMessage error: $e');
      _markTempFailed(roomId, clientTempId);
      _error = 'No se pudo enviar el mensaje. Tócalo para reintentar.';
    } finally {
      notifyListeners();
    }
  }

  // ── Marcar como leído ──────────────────────────────────────

  Future<void> markRoomAsRead(int roomId) async {
    if (_currentUserId == null) return;
    try {
      final updated = await _repo.markRoomAsRead(roomId);
      if (updated > 0) {
        // Reflejar en estado local
        _rooms = _rooms
            .map((r) => r.id == roomId ? r.copyWith(unreadCount: 0) : r)
            .toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[Chat] markRoomAsRead error: $e');
    }
  }

  // ── WebSocket handlers ─────────────────────────────────────

  void _handleIncomingMessage(Map<String, dynamic> raw) {
    if (_currentUserId == null) return;
    try {
      final msg = ChatMessageModel.fromJson(raw);

      // Ignoramos eco de nuestros propios mensajes (ya los manejó sendMessage)
      if (msg.senderId == _currentUserId) return;

      _appendMessage(msg.chatRoomId, msg);

      // Actualizar resumen de la sala
      final idx = _rooms.indexWhere((r) => r.id == msg.chatRoomId);
      final isActive = _activeRoomId == msg.chatRoomId;

      if (idx != -1) {
        final room = _rooms[idx];
        _rooms[idx] = room.copyWith(
          lastMessage:    msg,
          lastActivityAt: msg.createdAt,
          unreadCount:    isActive ? room.unreadCount : room.unreadCount + 1,
        );
        // Reordenar por última actividad
        _rooms.sort((a, b) => b.lastActivityAt.compareTo(a.lastActivityAt));
      } else {
        // Sala nueva: refrescar bandeja
        loadRooms();
      }

      // Si la sala está abierta, automáticamente marcar como leído
      if (isActive) {
        markRoomAsRead(msg.chatRoomId);
      }
      notifyListeners();
    } catch (e) {
      debugPrint('[Chat] _handleIncomingMessage parse error: $e');
    }
  }

  void _handleMessagesRead(Map<String, dynamic> raw) {
    final roomId = (raw['roomId'] as num?)?.toInt();
    if (roomId == null) return;

    final list = _messagesByRoom[roomId];
    if (list == null) return;

    final myId = _currentUserId;
    if (myId == null) return;

    var changed = false;
    final updated = list.map((m) {
      // Sólo actualizamos los mensajes que enviamos NOSOTROS — son los que
      // el receptor acaba de leer.
      if (m.senderId == myId && m.status != MessageStatus.read) {
        changed = true;
        return m.copyWith(status: MessageStatus.read);
      }
      return m;
    }).toList();

    if (changed) {
      _messagesByRoom[roomId] = updated;
      notifyListeners();
    }
  }

  // ── Helpers internos ───────────────────────────────────────

  void _appendMessage(int roomId, ChatMessageModel msg) {
    final list = _messagesByRoom.putIfAbsent(roomId, () => []);
    // Evitar duplicados si el mismo id llega vía WS y vía respuesta REST
    if (msg.id != null && list.any((m) => m.id == msg.id)) return;
    list.add(msg);
  }

  void _replaceTempMessage(
    int roomId,
    String tempId,
    ChatMessageModel saved,
  ) {
    final list = _messagesByRoom[roomId];
    if (list == null) return;
    final idx = list.indexWhere((m) => m.clientTempId == tempId);
    if (idx == -1) {
      list.add(saved);
    } else {
      list[idx] = saved;
    }

    // Actualizar resumen de la sala
    final rIdx = _rooms.indexWhere((r) => r.id == roomId);
    if (rIdx != -1) {
      _rooms[rIdx] = _rooms[rIdx].copyWith(
        lastMessage:    saved,
        lastActivityAt: saved.createdAt,
      );
      _rooms.sort((a, b) => b.lastActivityAt.compareTo(a.lastActivityAt));
    }
  }

  /// Marca el mensaje optimista como `failed` (no lo borra) para que la
  /// UI lo muestre con opción de reintento.
  void _markTempFailed(int roomId, String tempId) {
    final list = _messagesByRoom[roomId];
    if (list == null) return;
    final idx = list.indexWhere((m) => m.clientTempId == tempId);
    if (idx != -1) {
      list[idx] = list[idx].copyWith(status: MessageStatus.failed);
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  /// Limpia estado al cerrar sesión.
  void clear() {
    if (_onNewMessage != null) {
      SocketService.instance.removeChatMessageListener(_onNewMessage!);
      _onNewMessage = null;
    }
    if (_onMessagesRead != null) {
      SocketService.instance.removeChatReadListener(_onMessagesRead!);
      _onMessagesRead = null;
    }
    _rooms = [];
    _messagesByRoom.clear();
    _paging.clear();
    _activeRoomId = null;
    _currentUserId = null;
    _error = null;
    notifyListeners();
  }
}

/// Estado de paginación interno por sala. Mutable: se modifica in-place
/// para evitar reasignaciones en el `Map`.
class _RoomPagingState {
  bool loading;
  bool loadedFirstPage;
  int nextPage;
  bool hasMore;

  _RoomPagingState({
    required this.loading,
    required this.loadedFirstPage,
    required this.nextPage,
    required this.hasMore,
  });

  factory _RoomPagingState.initial() => _RoomPagingState(
        loading:         false,
        loadedFirstPage: false,
        nextPage:        1,
        hasMore:         true,
      );
}
