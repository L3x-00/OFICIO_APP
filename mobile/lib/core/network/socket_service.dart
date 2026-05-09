import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as sio;

/// Servicio singleton para la conexión WebSocket con el backend.
///
/// Escucha el evento `userDeactivated` que el servidor emite cuando un
/// administrador desactiva una cuenta desde el panel. Cada componente
/// interesado registra/elimina su callback con [addDeactivationListener].
///
/// También escucha el evento `notification` genérico y distribuye a
/// cualquier listener registrado vía [addNotificationListener].
class SocketService {
  static final SocketService _instance = SocketService._internal();
  static SocketService get instance => _instance;

  sio.Socket? _socket;
  final List<void Function(int userId)> _deactivationListeners = [];
  final List<void Function(Map<String, dynamic>)> _notificationListeners = [];

  SocketService._internal();

  bool get isConnected => _socket?.connected ?? false;

  // ── Reconectar para un usuario específico (login / cambio de cuenta) ───
  /// Fuerza desconexión total y reconexión fresca.
  /// AHORA REQUIERE el token JWT para que el backend permita la conexión.
  void reconnectForUser(String baseUrl, int userId, String token) {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _connect(baseUrl, token);
  }

  // ── Conectar al servidor (primera vez o tras reconnectForUser) ─────────
  /// AHORA REQUIERE el token JWT.
  void connect(String baseUrl, String token) {
    if (_socket != null && _socket!.connected) return;
    _connect(baseUrl, token);
  }

  void _connect(String baseUrl, String token) {
    _socket = sio.io(
      baseUrl,
      sio.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .disableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(2000)
          .setReconnectionAttempts(10)
          .setAuth({'token': token}) // <--- 🛡️ Enviamos el JWT
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('[Socket] Conectado al servidor (Autenticado)');
      // 🛡️ Ya NO emitimos 'joinRoom' manualmente. El backend lo hace automáticamente.
    });

    _socket!.onDisconnect((_) {
      debugPrint('[Socket] Desconectado del servidor');
    });

    _socket!.onError((e) {
      debugPrint('[Socket] Error: $e');
    });

    // Evento: el admin desactivó a un usuario
    _socket!.on('userDeactivated', (data) {
      try {
        final map = data as Map<String, dynamic>;
        final rawId = map['userId'];
        final userId = rawId is int ? rawId : int.tryParse(rawId.toString());
        if (userId == null) return;

        // Copiar la lista antes de iterar para evitar errores de modificación concurrente
        for (final listener in List<void Function(int)>.from(_deactivationListeners)) {
          listener(userId);
        }
      } catch (e) {
        debugPrint('[Socket] Error procesando userDeactivated: $e');
      }
    });

    // Evento: notificación genérica
    _socket!.on('notification', (data) {
      try {
        final map = Map<String, dynamic>.from(data as Map);
        for (final listener in List<void Function(Map<String, dynamic>)>.from(_notificationListeners)) {
          listener(map);
        }
      } catch (e) {
        debugPrint('[Socket] Error procesando notification: $e');
      }
    });

    _socket!.connect();
  }

  // ── Emitir eventos al servidor ────────────────────────────
  /// Emite un evento genérico al servidor si el socket está conectado.
  void emit(String event, dynamic data) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit(event, data);
      debugPrint('[Socket] Evento emitido: $event');
    } else {
      debugPrint('[Socket] No se pudo emitir $event — socket no conectado');
    }
  }

  // ── Suscripción a eventos ──────────────────────────────────
  void addDeactivationListener(void Function(int userId) listener) {
    if (!_deactivationListeners.contains(listener)) {
      _deactivationListeners.add(listener);
    }
  }

  void removeDeactivationListener(void Function(int userId) listener) {
    _deactivationListeners.remove(listener);
  }

  void addNotificationListener(void Function(Map<String, dynamic>) listener) {
    if (!_notificationListeners.contains(listener)) {
      _notificationListeners.add(listener);
    }
  }

  void removeNotificationListener(void Function(Map<String, dynamic>) listener) {
    _notificationListeners.remove(listener);
  }

  // ── Desconectar (logout) ───────────────────────────────────
  void disconnect() {
    _deactivationListeners.clear();
    _notificationListeners.clear();
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    debugPrint('[Socket] Desconectado y limpiado');
  }
}