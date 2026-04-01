import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../domain/models/user_model.dart';

/// Almacena tokens y datos del usuario de forma segura
/// Usa el Keychain de iOS y EncryptedSharedPreferences en Android
class AuthLocalStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _keyAccessToken  = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUser         = 'user_data';

  // Guardar sesión completa
  static Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required UserModel user,
  }) async {
    await Future.wait([
      _storage.write(key: _keyAccessToken,  value: accessToken),
      _storage.write(key: _keyRefreshToken, value: refreshToken),
      _storage.write(key: _keyUser,         value: jsonEncode(user.toJson())),
    ]);
  }

  // Leer token de acceso
  static Future<String?> getAccessToken() =>
      _storage.read(key: _keyAccessToken);

  // Leer refresh token
  static Future<String?> getRefreshToken() =>
      _storage.read(key: _keyRefreshToken);

  // Leer usuario guardado
  static Future<UserModel?> getUser() async {
    final data = await _storage.read(key: _keyUser);
    if (data == null) return null;
    return UserModel.fromJson(jsonDecode(data) as Map<String, dynamic>);
  }

  // Limpiar sesión (logout)
  static Future<void> clearSession() async {
    await Future.wait([
      _storage.delete(key: _keyAccessToken),
      _storage.delete(key: _keyRefreshToken),
      _storage.delete(key: _keyUser),
    ]);
  }

  // Verificar si hay sesión activa
  static Future<bool> hasSession() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}