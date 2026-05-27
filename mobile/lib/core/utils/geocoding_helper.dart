import 'package:geocoding/geocoding.dart';

/// Convierte coordenadas (lat, lng) en una dirección legible para humanos.
/// Ejemplo: "-12.879, -76.213" → "Jr. Domingo Ríos, El Tambo"
class GeocodingHelper {
  /// Obtiene la dirección a partir de latitud y longitud.
  /// Retorna un String legible o null si falla.
  static Future<String?> getAddressFromCoordinates(
    double lat,
    double lng,
  ) async {
    try {
      // Llama a la API de Nominatim (OpenStreetMap) - Es GRATIS
      List<Placemark> placemarks = await placemarkFromCoordinates(lat, lng);

      if (placemarks.isNotEmpty) {
        final place = placemarks.first;

        // Construimos la dirección pieza por pieza
        final parts = <String>[
          if (place.street?.isNotEmpty ?? false) place.street!,
          if (place.subLocality?.isNotEmpty ?? false) place.subLocality!,
          if (place.locality?.isNotEmpty ?? false) place.locality!,
          if (place.subAdministrativeArea?.isNotEmpty ?? false)
            place.subAdministrativeArea!,
        ];

        // Unimos las partes con coma
        if (parts.isNotEmpty) {
          return parts.join(', ');
        }
      }
      return null;
    } catch (e) {
      // Si no hay internet o el servicio falla, devolvemos null
      // para que la app siga funcionando con coordenadas
      return null;
    }
  }
}
