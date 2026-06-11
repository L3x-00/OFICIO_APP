import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Caché local genérico (Offline-First) sobre `shared_preferences`.
///
/// Guarda cada entrada como un sobre JSON `{ savedAt, data }`:
///   • `savedAt`: epoch ms del momento de guardado (para calcular expiración).
///   • `data`   : el objeto serializado por el `toJson` del caller.
///
/// 100% best-effort: si `shared_preferences` no está disponible (p. ej. en
/// tests sin mock) o el JSON está corrupto, `getData` devuelve null y
/// `setData` es no-op — el caller cae a la red sin romperse.
class LocalCacheService {
  /// Instancia compartida (la implementación de shared_preferences ya la
  /// memoiza internamente, así que esto no recarga del disco cada vez).
  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  /// Lee la entrada `key`. Devuelve null si: no existe, está corrupta, o su
  /// antigüedad supera [maxAge]. Si es válida, la parsea con [fromJson].
  ///
  /// Para leer caché EXPIRADO como contingencia (sin internet), pasar un
  /// [maxAge] muy grande (ver repos).
  Future<T?> getData<T>(
    String key,
    T Function(Map<String, dynamic>) fromJson, {
    Duration maxAge = const Duration(hours: 6),
  }) async {
    try {
      final prefs = await _prefs;
      final raw = prefs.getString(key);
      if (raw == null) return null;

      final envelope = jsonDecode(raw);
      if (envelope is! Map<String, dynamic>) return null;

      final savedAt = envelope['savedAt'];
      if (savedAt is! int) return null;

      final ageMs = DateTime.now().millisecondsSinceEpoch - savedAt;
      if (ageMs > maxAge.inMilliseconds) return null; // expirado

      final data = envelope['data'];
      if (data is! Map) return null;
      return fromJson(Map<String, dynamic>.from(data));
    } catch (_) {
      // Caché corrupto o plugin no disponible → tratar como miss.
      return null;
    }
  }

  /// Guarda [data] (serializada con [toJson]) junto con el timestamp actual.
  Future<void> setData<T>(
    String key,
    T data,
    Map<String, dynamic> Function(T) toJson,
  ) async {
    try {
      final prefs = await _prefs;
      final envelope = <String, dynamic>{
        'savedAt': DateTime.now().millisecondsSinceEpoch,
        'data': toJson(data),
      };
      await prefs.setString(key, jsonEncode(envelope));
    } catch (_) {
      // Best-effort: si falla el guardado, no rompemos el flujo.
    }
  }

  /// Borra una entrada (útil para invalidación manual).
  Future<void> remove(String key) async {
    try {
      final prefs = await _prefs;
      await prefs.remove(key);
    } catch (_) {}
  }
}
