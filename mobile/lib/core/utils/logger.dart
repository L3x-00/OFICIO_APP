import 'package:flutter/foundation.dart';

/// Logger que solo imprime en modo debug
/// En producción no expone datos sensibles
class AppLogger {
  static void info(String message) {
    if (kDebugMode) print('ℹ️  [INFO] $message');
  }

  static void success(String message) {
    if (kDebugMode) print('✅ [OK] $message');
  }

  static void warning(String message) {
    if (kDebugMode) print('⚠️  [WARN] $message');
  }

  static void error(String message, [Object? error]) {
    if (kDebugMode) {
      print('❌ [ERROR] $message');
      if (error != null) print('   Detalle: $error');
    }
  }

  static void network(String method, String url, int? status) {
    if (kDebugMode) {
      final emoji = (status ?? 0) < 400 ? '🌐' : '🔴';
      print('$emoji [NET] $method $url → ${status ?? "?"}');
    }
  }
}