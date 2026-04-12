import 'package:dio/dio.dart';
import 'api_interceptor.dart';

/// Cliente HTTP singleton con interceptores centralizados
class DioClient {
  static final DioClient _instance = DioClient._internal();
  static DioClient get instance => _instance;

  late final Dio dio;

  // Para Flutter Web en Chrome → localhost
  // Para dispositivo físico → IP de tu máquina (ej: 192.168.1.X)
  static const String baseUrl = 'http://192.168.1.65:3000';

  DioClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept':        'application/json',
        },
      ),
    );

    // Interceptor principal: auth + logs + errores tipados
    dio.interceptors.add(ApiInterceptor());
  }

  /// Actualiza los tokens después del login
  void setTokens({
    required String accessToken,
    required String refreshToken,
  }) {
    ApiInterceptor.setTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }

  void clearTokens() => ApiInterceptor.clearTokens();
}