import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Resultado de geocodificación inversa adaptado al sistema de ubicaciones del Perú.
///
/// Los campos son nullables porque Nominatim no siempre devuelve los tres
/// niveles (zonas rurales suelen carecer de `province`/`county`). Aún con
/// campos parciales, el resultado se considera válido si al menos hay
/// `district` o `province` — eso basta para refrescar la pill del header.
class GeocodingResult {
  final String? department;
  final String? province;
  final String? district;

  const GeocodingResult({
    this.department,
    this.province,
    this.district,
  });

  bool get isEmpty => department == null && province == null && district == null;
}

/// Geocodificación inversa usando Nominatim (OpenStreetMap) — sin API key.
/// Incluye caché en memoria con clave redondeada a 3 decimales (~111m de precisión)
/// para evitar llamadas repetidas a Nominatim en cada tick del stream GPS.
class GeocodingService {
  static const _baseUrl   = 'https://nominatim.openstreetmap.org/reverse';
  static const _userAgent = 'OficioApp/1.0';
  static const _timeout   = Duration(seconds: 10);

  // Clave: "lat3,lng3" (redondeado a 3 decimales ≈ 111m de celda)
  static final Map<String, GeocodingResult> _cache = {};

  static String _cacheKey(double lat, double lng) =>
      '${lat.toStringAsFixed(3)},${lng.toStringAsFixed(3)}';

  /// Convierte coordenadas GPS en departamento, provincia y distrito del Perú.
  /// Retorna `null` si la API falla o no encuentra resultados.
  /// Devuelve resultado cacheado si la celda ya fue consultada.
  static Future<GeocodingResult?> reverseGeocode(double lat, double lng, {bool force = false}) async {
    final key = _cacheKey(lat, lng);
    if (!force && _cache.containsKey(key)) {
      debugPrint('[Geocoding] Cache hit: $key');
      return _cache[key];
    }

    final uri = Uri.parse(_baseUrl).replace(queryParameters: {
      'format':          'json',
      'lat':             lat.toString(),
      'lon':             lng.toString(),
      'zoom':            '10',
      'accept-language': 'es',
    });

    debugPrint('[Geocoding] Solicitando: $uri');

    try {
      final response = await http.get(
        uri,
        headers: {'User-Agent': _userAgent},
      ).timeout(_timeout);

      if (kDebugMode) {
        debugPrint('[Geocoding] Status: ${response.statusCode}');
        debugPrint('[Geocoding] Body: ${response.body}');
      }

      if (response.statusCode != 200) return null;

      final json    = jsonDecode(response.body) as Map<String, dynamic>;
      final address = json['address'] as Map<String, dynamic>?;
      if (address == null) return null;

      final department = _clean(
        address['state']    as String? ??
        address['region']   as String?,
      );
      final province = _clean(
        address['province']     as String? ??
        address['county']       as String? ??
        address['region']       as String? ??
        address['city']         as String? ??
        address['municipality'] as String?,
      );
      final district = _clean(
        address['city']    as String? ??
        address['town']    as String? ??
        address['village'] as String? ??
        address['suburb']  as String?,
      );

      final result = GeocodingResult(
        department: department,
        province:   province,
        district:   district,
      );
      if (result.isEmpty) {
        debugPrint('[Geocoding] Sin campos utilizables: dept=$department, prov=$province, dist=$district');
        return null;
      }
      _cache[key] = result;
      return result;
    } catch (e) {
      debugPrint('[Geocoding] Error: $e');
      return null;
    }
  }

  static String? _clean(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    return value
        .replaceFirst(RegExp(r'^(?:Departamento|Región|Provincia) de ', caseSensitive: false), '')
        .trim();
  }
}
