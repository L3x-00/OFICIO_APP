import 'package:dio/dio.dart';
import 'api_interceptor.dart';

/// Cliente HTTP singleton con interceptores centralizados
class DioClient {
  static final DioClient _instance = DioClient._internal();
  static DioClient get instance => _instance;

  late final Dio dio;

  // URL configurada en build con --dart-define=API_BASE_URL=https://...
  // Si no se provee, usa la URL de desarrollo local.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.1.65:3000',
  );

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