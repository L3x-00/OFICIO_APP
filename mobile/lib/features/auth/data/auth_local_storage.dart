import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../domain/models/user_model.dart';

/// Almacena tokens y datos del usuario de forma segura.
/// Compatible con Android (EncryptedSharedPreferences) e iOS (Keychain).
/// Corregido para Web (IndexedDB) para evitar el error OperationError.
class AuthLocalStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(),
    // CONFIGURACIÓN PARA WEB (Soluciona el error de consola)
    webOptions: WebOptions(
      dbName: 'ConfiServ_SecureStore',
      publicKey: 'confiserv_auth_key_2026',
    ),
  );

  static const _keyAccessToken  = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUser         = 'user_data';

  // ── Guardar sesión completa ────────────────────────────────
  static Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required UserModel user,
  }) async {
    try {
      await Future.wait([
        _storage.write(key: _keyAccessToken,  value: accessToken),
        _storage.write(key: _keyRefreshToken, value: refreshToken),
        _storage.write(key: _keyUser,         value: jsonEncode(user.toJson())),
      ]);
    } catch (e) {
      debugPrint('Error al guardar sesión: $e');
    }
  }

  // ── Leer token de acceso ───────────────────────────────────
  static Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: _keyAccessToken);
    } catch (e) {
      debugPrint('Error leyendo AccessToken: $e');
      return null;
    }
  }

  // ── Leer refresh token ────────────────────────────────────
  static Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: _keyRefreshToken);
    } catch (e) {
      debugPrint('Error leyendo RefreshToken: $e');
      return null;
    }
  }

  // ── Leer usuario guardado ──────────────────────────────────
  static Future<UserModel?> getUser() async {
    try {
      final data = await _storage.read(key: _keyUser);
      if (data == null) return null;
      return UserModel.fromJson(jsonDecode(data) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('Error leyendo datos de usuario: $e');
      return null;
    }
  }

  // ── Limpiar sesión (logout) ────────────────────────────────
  static Future<void> clearSession() async {
    try {
      await Future.wait([
        _storage.delete(key: _keyAccessToken),
        _storage.delete(key: _keyRefreshToken),
        _storage.delete(key: _keyUser),
      ]);
    } catch (e) {
      debugPrint('Error al limpiar sesión: $e');
    }
  }

  // ── Verificar si hay sesión activa ─────────────────────────
  static Future<bool> hasSession() async {
    try {
      final token = await getAccessToken();
      // Si el token no es nulo ni está vacío, hay sesión
      return token != null && token.isNotEmpty;
    } catch (e) {
      // Si hay un error de "OperationError" en Web, devolvemos false
      // para que la app mande al Login en lugar de quedarse cargando.
      debugPrint('Error verificando sesión: $e');
      return false;
    }
  }
}