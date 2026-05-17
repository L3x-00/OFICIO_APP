import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import '../network/dio_client.dart';
import 'package:dio/dio.dart';

/// Maneja permisos, token y recepción de notificaciones push (FCM).
/// Llama a [initialize] una vez tras el login.
class FcmService {
  static final FcmService _instance = FcmService._();
  static FcmService get instance => _instance;
  FcmService._();

  final Dio _dio = DioClient.instance.dio;

  /// Callback ejecutado cuando el usuario TOCA la notificación
  /// (background o terminated). Se setea desde `main.dart` para navegar.
  static void Function(RemoteMessage)? onMessageTap;

  /// Callback ejecutado cuando llega un mensaje en FOREGROUND.
  /// `main.dart` lo usa para inyectar la notificación al NotificationsProvider.
  /// El propio FcmService sigue mostrando el SnackBar.
  static void Function(RemoteMessage)? onForegroundMessage;

  Future<void> initialize() async {
    final messaging = FirebaseMessaging.instance;

    // Permisos (iOS / Android 13+)
    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    debugPrint('[FCM] Permiso: ${settings.authorizationStatus}');

    // Token inicial
    final token = await messaging.getToken();
    debugPrint('[FCM] Token: $token');
    if (token != null) await _sendTokenToBackend(token);

    messaging.onTokenRefresh.listen((newToken) {
      debugPrint('[FCM] Token refrescado: $newToken');
      _sendTokenToBackend(newToken);
    });

    // Foreground: solo delegamos al callback para que el provider
    // inyecte la notif en la lista. El SnackBar fue ELIMINADO porque
    // el WebSocket ya inserta la misma notif en _items (más rápido)
    // y el badge se actualiza — el SnackBar duplicaba visualmente
    // lo que el user veía en el tab Alertas (issue B-1 del audit).
    FirebaseMessaging.onMessage.listen((message) {
      debugPrint('[FCM] foreground: ${message.notification?.title}');
      onForegroundMessage?.call(message);
    });

    // Background tap: el usuario abrió desde la bandeja del sistema.
    // NO llamamos a onForegroundMessage acá — la notif ya está
    // persistida en el backend y loadHistory() la traerá con su id
    // real. Inyectarla acá con id sintético causa DUPLICADO en la
    // lista de Alertas (issue B-7 del audit).
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      debugPrint('[FCM] tap (background): ${message.data}');
      onMessageTap?.call(message);
    });

    // Terminated: app abierta desde notificación. Mismo razonamiento
    // que en background tap — solo navegamos, NO inyectamos.
    final initial = await messaging.getInitialMessage();
    if (initial != null) {
      debugPrint('[FCM] tap (terminated): ${initial.data}');
      // Esperamos a que el árbol esté montado.
      await Future.delayed(const Duration(milliseconds: 500));
      onMessageTap?.call(initial);
    }
  }

  /// Borra el token del dispositivo localmente (Firebase) y notifica al
  /// backend para invalidarlo.
  Future<void> clearToken() async {
    try {
      await _dio.delete('/users/me/device-token');
    } catch (e) {
      debugPrint('[FCM] No se pudo eliminar el token en backend: $e');
    }
    try {
      await FirebaseMessaging.instance.deleteToken();
    } catch (e) {
      debugPrint('[FCM] No se pudo borrar el token local: $e');
    }
  }

  // ── Helpers ────────────────────────────────────────────────

  Future<void> _sendTokenToBackend(String token) async {
    try {
      await _dio.patch('/users/me/device-token', data: {'token': token});
      debugPrint('[FCM] Token enviado al backend');
    } catch (e) {
      debugPrint('[FCM] Error enviando token al backend: $e');
    }
  }

  // Clave de navegador global — inyectada desde main.dart. Se mantiene
  // por compat con onMessageTap del router pero ya no la usa FCM
  // directamente (B-1 quitó el SnackBar foreground).
  // ignore: unused_field
  static GlobalKey<NavigatorState>? _navigatorKey;
  static void setNavigatorKey(GlobalKey<NavigatorState> key) {
    _navigatorKey = key;
  }
}
