import 'package:dio/dio.dart';
import '../utils/logger.dart';
import '../errors/app_exception.dart';

/// Interceptor que maneja automáticamente:
/// 1. Logging de requests/responses
/// 2. Manejo de errores tipados
/// 3. Refresh de tokens JWT (preparado para cuando Auth esté completo)
class ApiInterceptor extends Interceptor {
  // Token de acceso actual (se actualiza desde AuthProvider)
  static String? _accessToken;

  static void setTokens({
    required String accessToken,
    required String refreshToken,
  }) {
    _accessToken = accessToken;
    AppLogger.info('Tokens actualizados en el interceptor');
  }

  static void clearTokens() {
    _accessToken = null;
  }

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) {
    // Inyectar token en cada request si existe
    if (_accessToken != null) {
      options.headers['Authorization'] = 'Bearer $_accessToken';
    }

    AppLogger.network(options.method, options.path, null);
    handler.next(options);
  }

  @override
  void onResponse(
    Response response,
    ResponseInterceptorHandler handler,
  ) {
    AppLogger.network(
      response.requestOptions.method,
      response.requestOptions.path,
      response.statusCode,
    );
    handler.next(response);
  }

  @override
  void onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) {
    AppLogger.error(
      'Error en ${err.requestOptions.path}',
      err.message,
    );

    // Convertir errores Dio en excepciones tipadas
    final appException = _mapDioError(err);

    // Rechazar con nuestra excepción tipada
    handler.reject(
      DioException(
        requestOptions: err.requestOptions,
        error: appException,
        message: appException.message,
        type: err.type,
        response: err.response,
      ),
    );
  }

  AppException _mapDioError(DioException err) {
    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return const NetworkException('Tiempo de conexión agotado');

      case DioExceptionType.connectionError:
        return const NetworkException('Sin conexión a internet');

      case DioExceptionType.badResponse:
        final status = err.response?.statusCode;
        final message = _extractMessage(err.response?.data);

        return switch (status) {
          400 => ValidationException(message),
          401 => const AuthException(),
          403 => const AuthException('No tienes permisos para esto'),
          404 => NotFoundException(message),
          409 => ConflictException(message),
          _   => ServerException(message, statusCode: status),
        };

      default:
        return const NetworkException('Error de conexión desconocido');
    }
  }

  String _extractMessage(dynamic data) {
    if (data == null) return 'Error del servidor';
    if (data is Map) {
      final msg = data['message'];
      if (msg is List && msg.isNotEmpty) {
        // NestJS class-validator devuelve los errores como array
        return msg.first.toString();
      }
      if (msg != null) return msg.toString();
      return data['error']?.toString() ?? 'Error del servidor';
    }
    return data.toString();
  }
}