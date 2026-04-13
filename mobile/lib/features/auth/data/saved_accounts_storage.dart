import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Modelo de cuenta guardada en el dispositivo
class SavedAccount {
  final int userId;
  final String email;
  final String firstName;
  final String lastName;
  final String accessToken;
  final String refreshToken;

  const SavedAccount({
    required this.userId,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.accessToken,
    required this.refreshToken,
  });

  String get fullName => '$firstName $lastName';
  String get initial => firstName.isNotEmpty ? firstName[0].toUpperCase() : '?';

  factory SavedAccount.fromJson(Map<String, dynamic> json) => SavedAccount(
        userId:       json['userId']       as int,
        email:        json['email']        as String,
        firstName:    json['firstName']    as String,
        lastName:     json['lastName']     as String,
        accessToken:  json['accessToken']  as String,
        refreshToken: json['refreshToken'] as String,
      );

  Map<String, dynamic> toJson() => {
        'userId':       userId,
        'email':        email,
        'firstName':    firstName,
        'lastName':     lastName,
        'accessToken':  accessToken,
        'refreshToken': refreshToken,
      };
}

enum SaveAccountResult { ok, limitReached }

/// Gestiona hasta [maxAccounts] cuentas guardadas en almacenamiento seguro.
/// Si el email ya existe, actualiza los tokens. Si se llega al límite y
/// el email es nuevo, devuelve [SaveAccountResult.limitReached].
class SavedAccountsStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(),
    webOptions: WebOptions(
      dbName:    'ConfiServ_SecureStore',
      publicKey: 'confiserv_auth_key_2026',
    ),
  );

  static const _key        = 'saved_accounts';
  static const maxAccounts = 3;

  // ── Leer todas las cuentas ────────────────────────────────
  static Future<List<SavedAccount>> getAll() async {
    try {
      final raw = await _storage.read(key: _key);
      if (raw == null || raw.isEmpty) return [];
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => SavedAccount.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('SavedAccountsStorage.getAll error: $e');
      return [];
    }
  }

  // ── Agregar o actualizar (si el email ya existe) ──────────
  static Future<SaveAccountResult> addOrUpdate(SavedAccount account) async {
    try {
      final accounts = await getAll();

      final idx = accounts.indexWhere((a) => a.email == account.email);
      if (idx != -1) {
        // Actualiza tokens del email existente
        accounts[idx] = account;
        await _persist(accounts);
        return SaveAccountResult.ok;
      }

      if (accounts.length >= maxAccounts) {
        return SaveAccountResult.limitReached;
      }

      accounts.add(account);
      await _persist(accounts);
      return SaveAccountResult.ok;
    } catch (e) {
      debugPrint('SavedAccountsStorage.addOrUpdate error: $e');
      return SaveAccountResult.ok; // fallo silencioso
    }
  }

  // ── Eliminar por email ────────────────────────────────────
  static Future<void> remove(String email) async {
    try {
      final accounts = await getAll();
      accounts.removeWhere((a) => a.email == email);
      await _persist(accounts);
    } catch (e) {
      debugPrint('SavedAccountsStorage.remove error: $e');
    }
  }

  // ── Borrar todas ──────────────────────────────────────────
  static Future<void> clear() async {
    try {
      await _storage.delete(key: _key);
    } catch (e) {
      debugPrint('SavedAccountsStorage.clear error: $e');
    }
  }

  // ── Persistir lista ───────────────────────────────────────
  static Future<void> _persist(List<SavedAccount> accounts) async {
    await _storage.write(
      key:   _key,
      value: jsonEncode(accounts.map((a) => a.toJson()).toList()),
    );
  }
}
