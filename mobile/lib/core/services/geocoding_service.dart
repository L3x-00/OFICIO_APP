import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Resultado de geocodificación inversa adaptado al sistema de ubicaciones del Perú.
class GeocodingResult {
  final String department;
  final String province;
  final String district;

  const GeocodingResult({
    required this.department,
    required this.province,
    required this.district,
  });
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
  static Future<GeocodingResult?> reverseGeocode(double lat, double lng) async {
    final key = _cacheKey(lat, lng);
    if (_cache.containsKey(key)) {
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
        address['city']         as String? ??
        address['municipality'] as String?,
      );
      final district = _clean(
        address['city']    as String? ??
        address['town']    as String? ??
        address['village'] as String? ??
        address['suburb']  as String?,
      );

      if (department == null || province == null || district == null) {
        debugPrint('[Geocoding] Campos incompletos: dept=$department, prov=$province, dist=$district');
        return null;
      }

      final result = GeocodingResult(
        department: department,
        province:   province,
        district:   district,
      );
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
