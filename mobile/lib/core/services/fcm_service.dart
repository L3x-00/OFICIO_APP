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

    // Foreground: SnackBar + delegar al callback (NotificationsProvider).
    FirebaseMessaging.onMessage.listen((message) {
      debugPrint('[FCM] foreground: ${message.notification?.title}');
      _showForegroundSnack(message);
      onForegroundMessage?.call(message);
    });

    // Background tap: el usuario abrió desde la bandeja.
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      debugPrint('[FCM] tap (background): ${message.data}');
      onForegroundMessage?.call(message); // también va al historial
      onMessageTap?.call(message);
    });

    // Terminated: app abierta desde notificación.
    final initial = await messaging.getInitialMessage();
    if (initial != null) {
      debugPrint('[FCM] tap (terminated): ${initial.data}');
      // Esperamos a que el árbol esté montado.
      await Future.delayed(const Duration(milliseconds: 500));
      onForegroundMessage?.call(initial);
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

  void _showForegroundSnack(RemoteMessage message) {
    final ctx = _navigatorKey?.currentContext;
    if (ctx == null || !ctx.mounted) return;
    final title = message.notification?.title ?? '';
    final body  = message.notification?.body  ?? '';
    if (title.isEmpty && body.isEmpty) return;
    ScaffoldMessenger.of(ctx).showSnackBar(
      SnackBar(
        content: Text('$title${body.isEmpty ? '' : ': $body'}'),
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      await _dio.patch('/users/me/device-token', data: {'token': token});
      debugPrint('[FCM] Token enviado al backend');
    } catch (e) {
      debugPrint('[FCM] Error enviando token al backend: $e');
    }
  }

  // Clave de navegador global — inyectada desde main.dart
  static GlobalKey<NavigatorState>? _navigatorKey;
  static void setNavigatorKey(GlobalKey<NavigatorState> key) {
    _navigatorKey = key;
  }
}
