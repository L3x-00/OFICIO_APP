import 'dart:convert';
import 'package:dio/dio.dart';
import '../utils/logger.dart';
import '../errors/app_exception.dart';
import 'dio_client.dart';
import '../../features/auth/data/auth_local_storage.dart';
import '../../features/auth/data/saved_accounts_storage.dart';

/// Interceptor que maneja automáticamente:
/// 1. Logging de requests/responses
/// 2. Manejo de errores tipados
/// 3. Refresh de tokens JWT en caliente ante un 401
///
/// El refresh en caliente es la pieza que mantiene el chat (y cualquier
/// llamada autenticada) vivo: el access token dura 8h y los tokens de
/// una cuenta guardada (multi-cuenta) pueden estar viejos. Sin esto, al
/// expirar el access token toda petición devolvía 401 y la UX se rompía
/// silenciosamente — el síntoma más visible era el chat ("después de
/// varios mensajes ya no envía" / "al volver no carga").
class ApiInterceptor extends Interceptor {
  // Tokens actuales (se actualizan desde AuthProvider y tras un refresh).
  static String? _accessToken;
  static String? _refreshToken;

  static void setTokens({
    required String accessToken,
    required String refreshToken,
  }) {
    _accessToken  = accessToken;
    _refreshToken = refreshToken;
    AppLogger.info('Tokens actualizados en el interceptor');
  }

  static void clearTokens() {
    _accessToken  = null;
    _refreshToken = null;
  }

  /// Refresh en vuelo — single-flight: si llegan N peticiones con 401 a
  /// la vez, solo se dispara UN POST /auth/refresh y todas esperan el
  /// mismo resultado.
  static Future<bool>? _refreshing;

  /// Dio sin interceptores — usado para el refresh y para reintentar la
  /// petición original. Evita recursión infinita de interceptores.
  static final Dio _bareDio = Dio(
    BaseOptions(
      baseUrl: DioClient.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json',
      },
    ),
  );

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
  ) async {
    final status  = err.response?.statusCode;
    final path    = err.requestOptions.path;
    // No intentamos refrescar sobre los propios endpoints de auth ni
    // sobre una petición que ya reintentamos una vez.
    final isAuthEndpoint = path.contains('/auth/login') ||
        path.contains('/auth/refresh') ||
        path.contains('/auth/register') ||
        path.contains('/auth/social-login');
    final alreadyRetried = err.requestOptions.extra['__retried__'] == true;

    if (status == 401 &&
        !isAuthEndpoint &&
        !alreadyRetried &&
        _refreshToken != null) {
      final refreshed = await _ensureRefreshed();
      if (refreshed) {
        try {
          final opts = err.requestOptions;
          opts.extra['__retried__'] = true;
          opts.headers['Authorization'] = 'Bearer $_accessToken';
          final retried = await _bareDio.fetch(opts);
          handler.resolve(retried);
          return;
        } catch (_) {
          // El reintento también falló — cae al mapeo de error normal.
        }
      }
    }

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

  /// Garantiza un único refresh concurrente. Devuelve true si los tokens
  /// quedaron renovados.
  static Future<bool> _ensureRefreshed() {
    _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
    return _refreshing!;
  }

  static Future<bool> _doRefresh() async {
    final rt = _refreshToken;
    if (rt == null) return false;
    try {
      final res = await _bareDio.post(
        '/auth/refresh',
        data: {'refreshToken': rt},
      );
      final data   = res.data as Map<String, dynamic>;
      final at     = data['accessToken']  as String;
      final newRt  = data['refreshToken'] as String;

      _accessToken  = at;
      _refreshToken = newRt;

      // Persistir para que la sesión sobreviva al cierre de la app.
      await AuthLocalStorage.updateTokens(accessToken: at, refreshToken: newRt);

      // El refresh token rota (single-use en el backend): si la cuenta
      // activa está guardada (multi-cuenta), hay que actualizar también
      // su copia — de lo contrario, al cambiar a ella otra vez su token
      // viejo ya estaría revocado y la sesión moriría.
      final uid = _userIdFromJwt(at);
      if (uid != null) {
        await SavedAccountsStorage.updateTokensForUser(
          userId:       uid,
          accessToken:  at,
          refreshToken: newRt,
        );
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Decodifica el `sub` (userId) del payload de un JWT sin librerías.
  static int? _userIdFromJwt(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      var payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      while (payload.length % 4 != 0) {
        payload += '=';
      }
      final map = jsonDecode(utf8.decode(base64.decode(payload)))
          as Map<String, dynamic>;
      final sub = map['sub'];
      return sub is int ? sub : int.tryParse(sub.toString());
    } catch (_) {
      return null;
    }
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
          401 => AuthException(
              message.isNotEmpty && message != 'Unauthorized'
                  ? message
                  : 'Tu sesión ha expirado. Vuelve a iniciar sesión.',
            ),
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
