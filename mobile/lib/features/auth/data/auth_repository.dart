import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';
import '../domain/models/user_model.dart';
import 'auth_local_storage.dart';

class AuthRepository {
  final Dio _dio = DioClient.instance.dio;

  // ── LOGIN ─────────────────────────────────────────────────
  Future<ApiResult<UserModel>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email':    email,
        'password': password,
      });

      final data = response.data as Map<String, dynamic>;
      final accessToken  = data['accessToken']  as String;
      final refreshToken = data['refreshToken'] as String;

      // Construir modelo de usuario desde la respuesta
      final user = UserModel(
        id:        data['userId'] as int,
        email:     email,
        firstName: data['firstName'] as String? ?? '',
        lastName:  data['lastName']  as String? ?? '',
        role:      data['role']      as String? ?? 'USUARIO',
      );

      // Guardar en almacenamiento seguro
      await AuthLocalStorage.saveSession(
        accessToken:  accessToken,
        refreshToken: refreshToken,
        user:         user,
      );

      // Inyectar tokens en el cliente HTTP
      DioClient.instance.setTokens(
        accessToken:  accessToken,
        refreshToken: refreshToken,
      );

      return Success(user);
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al iniciar sesión'),
      );
    }
  }

  // ── REGISTRO ──────────────────────────────────────────────
  Future<ApiResult<UserModel>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    try {
      final response = await _dio.post('/auth/register', data: {
        'email':     email,
        'password':  password,
        'firstName': firstName,
        'lastName':  lastName,
        if (phone != null) 'phone': phone,
      });

      final data = response.data as Map<String, dynamic>;
      final user = UserModel(
        id:        data['userId'] as int,
        email:     email,
        firstName: firstName,
        lastName:  lastName,
        role:      'USUARIO',
      );

      await AuthLocalStorage.saveSession(
        accessToken:  data['accessToken']  as String,
        refreshToken: data['refreshToken'] as String,
        user:         user,
      );

      DioClient.instance.setTokens(
        accessToken:  data['accessToken']  as String,
        refreshToken: data['refreshToken'] as String,
      );

      return Success(user);
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al registrarse'),
      );
    }
  }

  // ── RESTAURAR SESIÓN AL INICIAR LA APP ───────────────────
  Future<UserModel?> restoreSession() async {
    final hasSession = await AuthLocalStorage.hasSession();
    if (!hasSession) return null;

    final accessToken  = await AuthLocalStorage.getAccessToken();
    final refreshToken = await AuthLocalStorage.getRefreshToken();
    final user         = await AuthLocalStorage.getUser();

    if (accessToken != null && refreshToken != null) {
      DioClient.instance.setTokens(
        accessToken:  accessToken,
        refreshToken: refreshToken,
      );
    }

    return user;
  }

  // ── LOGOUT ─────────────────────────────────────────────────
  Future<void> logout() async {
    await AuthLocalStorage.clearSession();
    DioClient.instance.clearTokens();
  }
}