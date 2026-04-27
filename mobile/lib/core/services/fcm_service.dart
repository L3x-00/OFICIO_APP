import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import '../network/dio_client.dart';
import 'package:dio/dio.dart';

/// Maneja permisos, token y recepción de notificaciones push (FCM).
/// Llama a [initialize] una vez al arrancar la app (después de login).
class FcmService {
  static final FcmService _instance = FcmService._();
  static FcmService get instance => _instance;
  FcmService._();

  final Dio _dio = DioClient.instance.dio;

  // Callback para navegar desde notificaciones en background/terminated
  static void Function(RemoteMessage)? onMessageTap;

  Future<void> initialize(BuildContext context) async {
    final messaging = FirebaseMessaging.instance;

    // Solicitar permisos (iOS / Android 13+)
    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    debugPrint('[FCM] Permiso: ${settings.authorizationStatus}');

    // Obtener token y enviarlo al backend
    final token = await messaging.getToken();
    debugPrint('[FCM] Token: $token');
    if (token != null) await _sendTokenToBackend(token);

    // Actualizar token si cambia
    messaging.onTokenRefresh.listen((newToken) {
      debugPrint('[FCM] Token refrescado: $newToken');
      _sendTokenToBackend(newToken);
    });

    // Primer plano: mostrar SnackBar
    FirebaseMessaging.onMessage.listen((message) {
      debugPrint('[FCM] Mensaje en primer plano: ${message.notification?.title}');
      final ctx = _navigatorKey?.currentContext;
      if (ctx != null && ctx.mounted) {
        ScaffoldMessenger.of(ctx).showSnackBar(
          SnackBar(
            content: Text(
              '${message.notification?.title ?? ''}: ${message.notification?.body ?? ''}',
            ),
            duration: const Duration(seconds: 4),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    });

    // Background: usuario toca la notificación
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      debugPrint('[FCM] Notificación tocada desde background: ${message.data}');
      onMessageTap?.call(message);
    });

    // Terminated: app abierta desde notificación
    final initial = await messaging.getInitialMessage();
    if (initial != null) {
      debugPrint('[FCM] App abierta desde notificación terminada: ${initial.data}');
      // Delay para que el árbol de widgets esté montado
      await Future.delayed(const Duration(milliseconds: 500));
      onMessageTap?.call(initial);
    }
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
