import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';
import '../domain/models/user_model.dart';
import 'auth_local_storage.dart';
import 'saved_accounts_storage.dart';

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

  // ── REGISTRO DE PROVEEDOR (usuario ya autenticado) ───────
  Future<ApiResult<Map<String, dynamic>>> registerProvider({
    required String businessName,
    required String phone,
    required String type,
    String? dni,
    String? description,
    String? address,
    int? categoryId,
    int? localityId,
  }) async {
    try {
      final response = await _dio.post('/auth/register/provider', data: {
        'businessName': businessName,
        'phone':        phone,
        'type':         type,
        if (dni != null && dni.isNotEmpty) 'dni': dni,
        if (description != null && description.isNotEmpty) 'description': description,
        if (address != null && address.isNotEmpty) 'address': address,
        if (categoryId != null) 'categoryId': categoryId,
        if (localityId != null) 'localityId': localityId,
      });
      return Success(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al crear el perfil'),
      );
    }
  }

  // ── RESTAURAR SESIÓN AL INICIAR LA APP ───────────────────
  Future<UserModel?> restoreSession() async {
    try {
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
    } catch (_) {
      // Si el almacenamiento seguro está corrupto o falla, tratar como sin sesión
      await AuthLocalStorage.clearSession().catchError((_) {});
      return null;
    }
  }

  // ── RESTAURAR SESIÓN DESDE CUENTA GUARDADA ──────────────
  Future<ApiResult<UserModel>> loginFromSaved(SavedAccount account) async {
    try {
      final user = UserModel(
        id:        account.userId,
        email:     account.email,
        firstName: account.firstName,
        lastName:  account.lastName,
        role:      'USUARIO',
      );

      await AuthLocalStorage.saveSession(
        accessToken:  account.accessToken,
        refreshToken: account.refreshToken,
        user:         user,
      );

      DioClient.instance.setTokens(
        accessToken:  account.accessToken,
        refreshToken: account.refreshToken,
      );

      return Success(user);
    } catch (e) {
      return Failure(ServerException('Error al restaurar la sesión guardada'));
    }
  }

  // ── LOGOUT ─────────────────────────────────────────────────
  Future<void> logout() async {
    await AuthLocalStorage.clearSession();
    DioClient.instance.clearTokens();
  }
}