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

  // ── Conectar al servidor ────────────────────────────────────
  void connect(String baseUrl) {
    if (_socket != null && _socket!.connected) return;

    _socket = sio.io(
      baseUrl,
      sio.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .disableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(2000)
          .setReconnectionAttempts(10)
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('[Socket] Conectado al servidor');
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
