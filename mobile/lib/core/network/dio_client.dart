import 'package:dio/dio.dart';
// ignore: unused_import
import 'package:flutter/foundation.dart';

/// Cliente HTTP centralizado con interceptores
/// Singleton — usar DioClient.instance en toda la app
class DioClient {
  static final DioClient _instance = DioClient._internal();
  static DioClient get instance => _instance;

  late final Dio dio;

  // Cambia esta URL según tu entorno:
  // Android emulator → 10.0.2.2:3000
  // iOS simulator    → localhost:3000
  // Dispositivo real → IP de tu máquina
  final String baseUrl = kIsWeb
      ? 'http://localhost:3000'
      : 'http://10.0.2.2:3000';

  DioClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 15),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    // Interceptor de logs (solo en debug)
    dio.interceptors.add(
      LogInterceptor(requestBody: true, responseBody: true, error: true),
    );
  }

  /// Actualiza el token JWT en los headers
  void setAuthToken(String token) {
    dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void clearAuthToken() {
    dio.options.headers.remove('Authorization');
  }
}
