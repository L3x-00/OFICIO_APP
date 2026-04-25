import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path/path.dart' as p;
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
        avatarUrl: data['avatarUrl'] as String?,
        phone:     data['phone']     as String?,
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

  // ── SOCIAL LOGIN (Firebase idToken) ──────────────────────
  Future<ApiResult<UserModel>> socialLogin(String idToken) async {
    try {
      final response = await _dio.post('/auth/social-login', data: {'idToken': idToken});
      final data = response.data as Map<String, dynamic>;

      final user = UserModel(
        id:        data['userId'] as int,
        email:     data['email']     as String? ?? '',
        firstName: data['firstName'] as String? ?? '',
        lastName:  data['lastName']  as String? ?? '',
        role:      data['role']      as String? ?? 'USUARIO',
        avatarUrl: data['avatarUrl'] as String?,
        phone:     data['phone']     as String?,
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
            : ServerException(e.message ?? 'Error en login social'),
      );
    }
  }

  // ── REGISTRO ──────────────────────────────────────────────
  // Devuelve pendingId para usar en verifyOtp. NO crea sesión aún.
  Future<ApiResult<Map<String, dynamic>>> register({
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
        'phone': ?phone,
      });
      return Success(Map<String, dynamic>.from(response.data as Map));
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
    String? whatsapp,
    // OFICIO
    String? dni,
    // NEGOCIO
    String? ruc,
    String? nombreComercial,
    String? razonSocial,
    bool hasDelivery = false,
    bool plenaCoordinacion = false,
    // comunes
    String? description,
    String? address,
    int? categoryId,
    int? localityId,
    Map<String, dynamic>? scheduleJson,
  }) async {
    try {
      final response = await _dio.post('/auth/register/provider', data: {
        'businessName': businessName,
        'phone':        phone,
        'type':         type,
        if (whatsapp != null && whatsapp.isNotEmpty) 'whatsapp': whatsapp,
        if (dni != null && dni.isNotEmpty) 'dni': dni,
        if (ruc != null && ruc.isNotEmpty) 'ruc': ruc,
        if (nombreComercial != null && nombreComercial.isNotEmpty) 'nombreComercial': nombreComercial,
        if (razonSocial != null && razonSocial.isNotEmpty) 'razonSocial': razonSocial,
        if (type == 'NEGOCIO') 'hasDelivery': hasDelivery,
        if (type == 'NEGOCIO' && hasDelivery) 'plenaCoordinacion': plenaCoordinacion,
        if (description != null && description.isNotEmpty) 'description': description,
        if (address != null && address.isNotEmpty) 'address': address,
        'categoryId': ?categoryId,
        'localityId': ?localityId,
        if (scheduleJson != null && scheduleJson.isNotEmpty) 'scheduleJson': scheduleJson,
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
      // Inyectar tokens primero para que las llamadas autenticadas funcionen
      DioClient.instance.setTokens(
        accessToken:  account.accessToken,
        refreshToken: account.refreshToken,
      );

      // Obtener datos frescos del backend (incluye avatarUrl, role real, etc.)
      UserModel user;
      try {
        final response = await _dio.get('/users/me');
        final data = response.data as Map<String, dynamic>;
        user = UserModel(
          id:        data['id']        as int,
          email:     data['email']     as String,
          firstName: data['firstName'] as String? ?? account.firstName,
          lastName:  data['lastName']  as String? ?? account.lastName,
          role:      data['role']      as String? ?? 'USUARIO',
          avatarUrl: data['avatarUrl'] as String?,
          phone:     data['phone']     as String?,
        );
      } catch (_) {
        // Si el backend no responde, usar datos locales como fallback
        user = UserModel(
          id:        account.userId,
          email:     account.email,
          firstName: account.firstName,
          lastName:  account.lastName,
          role:      'USUARIO',
        );
      }

      await AuthLocalStorage.saveSession(
        accessToken:  account.accessToken,
        refreshToken: account.refreshToken,
        user:         user,
      );

      return Success(user);
    } catch (e) {
      return Failure(ServerException('Error al restaurar la sesión guardada'));
    }
  }

  // ── ESTADO DEL PROVEEDOR ────────────────────────────────────
  /// Devuelve si el usuario autenticado ya tiene perfil de proveedor y su estado
  Future<ApiResult<Map<String, dynamic>>> getMyProviderStatus() async {
    try {
      final response = await _dio.get('/users/my-provider-status');
      return Success(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al obtener estado del proveedor'),
      );
    }
  }

  // ── ACTUALIZAR PERFIL ─────────────────────────────────────
  Future<ApiResult<UserModel>> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
    String? department,
    String? province,
    String? district,
  }) async {
    try {
      final response = await _dio.patch('/users/profile', data: {
        'firstName':  ?firstName,
        'lastName':   ?lastName,
        'phone':      ?phone,
        'department': ?department,
        'province':   ?province,
        'district':   ?district,
      });
      final data = response.data as Map<String, dynamic>;
      final user = UserModel.fromJson({...data, 'id': data['id']});
      return Success(user);
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al actualizar el perfil'),
      );
    }
  }

  // ── ACTUALIZAR FOTO DE PERFIL ─────────────────────────────
  Future<ApiResult<String>> updateProfilePicture(File image) async {
    try {
      final formData = FormData.fromMap({
        'avatar': await MultipartFile.fromFile(
          image.path,
          filename: p.basename(image.path),
        ),
      });
      final response = await _dio.patch(
        '/users/profile-picture',
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );
      final avatarUrl = (response.data as Map<String, dynamic>)['avatarUrl'] as String;
      return Success(avatarUrl);
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al subir la imagen'),
      );
    }
  }

  // ── CAMBIAR CONTRASEÑA ─────────────────────────────────────
  Future<ApiResult<String>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _dio.patch('/users/change-password', data: {
        'currentPassword': currentPassword,
        'newPassword':     newPassword,
      });
      final msg = (response.data as Map<String, dynamic>)['message'] as String;
      return Success(msg);
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al cambiar la contraseña'),
      );
    }
  }

  // ── OLVIDÉ MI CONTRASEÑA ───────────────────────────────────
  Future<ApiResult<Map<String, dynamic>>> forgotPassword(String email) async {
    try {
      final response = await _dio.post('/auth/forgot-password', data: {'email': email});
      return Success(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al solicitar recuperación'),
      );
    }
  }

  // ── RESTABLECER CONTRASEÑA ────────────────────────────────
  Future<ApiResult<String>> resetPassword({
    required String email,
    required String token,
    required String newPassword,
  }) async {
    try {
      final response = await _dio.post('/auth/reset-password', data: {
        'email':       email,
        'token':       token,
        'newPassword': newPassword,
      });
      final msg = (response.data as Map<String, dynamic>)['message'] as String;
      return Success(msg);
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al restablecer la contraseña'),
      );
    }
  }

  // ── ENVIAR OTP ────────────────────────────────────────────
  Future<ApiResult<Map<String, dynamic>>> sendOtp(int userId) async {
    try {
      final response = await _dio.post('/auth/send-otp', data: {'userId': userId});
      return Success(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al enviar el código'),
      );
    }
  }

  // ── VERIFICAR OTP (registro pendiente) ───────────────────
  // Valida OTP, backend crea el usuario y devuelve tokens + datos.
  // Aquí guardamos la sesión completa.
  Future<ApiResult<UserModel>> verifyOtp({
    required String pendingId,
    required String code,
  }) async {
    try {
      final response = await _dio.post('/auth/verify-otp', data: {
        'pendingId': pendingId,
        'code':      code,
      });

      final data         = response.data as Map<String, dynamic>;
      final accessToken  = data['accessToken']  as String;
      final refreshToken = data['refreshToken'] as String;

      final user = UserModel(
        id:        data['userId']    as int,
        email:     data['email']     as String? ?? '',
        firstName: data['firstName'] as String? ?? '',
        lastName:  data['lastName']  as String? ?? '',
        role:      data['role']      as String? ?? 'USUARIO',
        phone:     data['phone']     as String?,
        avatarUrl: data['avatarUrl'] as String?,
      );

      await AuthLocalStorage.saveSession(
        accessToken:  accessToken,
        refreshToken: refreshToken,
        user:         user,
      );
      DioClient.instance.setTokens(
        accessToken:  accessToken,
        refreshToken: refreshToken,
      );

      return Success(user);
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Código inválido o expirado'),
      );
    }
  }

  // ── REENVIAR OTP (registro pendiente) ─────────────────────
  Future<ApiResult<Map<String, dynamic>>> resendOtp(String pendingId) async {
    try {
      final response = await _dio.post('/auth/resend-otp', data: {'pendingId': pendingId});
      return Success(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al reenviar código'),
      );
    }
  }

  // ── LOGOUT ─────────────────────────────────────────────────
  // ── REFRESH TOKENS ────────────────────────────────────────
  /// Intercambia el refresh token almacenado por un par nuevo.
  /// Útil tras aprobación de proveedor para obtener JWT con role:PROVEEDOR.
  Future<ApiResult<UserModel>> refreshTokens() async {
    try {
      final storedRefresh = await AuthLocalStorage.getRefreshToken();
      if (storedRefresh == null) {
        return Failure(ServerException('No hay refresh token almacenado'));
      }

      final response = await _dio.post('/auth/refresh', data: {
        'refreshToken': storedRefresh,
      });

      final data = response.data as Map<String, dynamic>;
      final accessToken  = data['accessToken']  as String;
      final refreshToken = data['refreshToken'] as String;
      final role         = data['role']         as String? ?? 'USUARIO';

      // Restaurar usuario local con el nuevo rol y guardar sesión completa
      final current = await AuthLocalStorage.getUser();
      final updated = current?.copyWith(role: role) ??
          UserModel(id: data['userId'] as int, email: '', firstName: '', lastName: '', role: role);

      DioClient.instance.setTokens(
        accessToken:  accessToken,
        refreshToken: refreshToken,
      );
      await AuthLocalStorage.saveSession(
        accessToken:  accessToken,
        refreshToken: refreshToken,
        user:         updated,
      );

      return Success(updated);
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al refrescar token'),
      );
    }
  }

  Future<void> logout() async {
    await AuthLocalStorage.clearSession();
    DioClient.instance.clearTokens();
  }
}