Agrega un servicio de geocodificación inversa en la app Flutter para que, al obtener las coordenadas GPS del dispositivo, se conviertan en departamento, provincia y distrito reales del usuario. Usa la API gratuita de Nominatim (OpenStreetMap). No se necesita API Key ni configuración adicional.

1. Crea el archivo `mobile/lib/core/services/geocoding_service.dart` con una clase `GeocodingService` que tenga un método estático `reverseGeocode(double lat, double lng)` que:
   - Llame a `https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=10&accept-language=es`.
   - Añada un header `User-Agent: OficioApp/1.0` (buena práctica con Nominatim).
   - Tenga un timeout de 10 segundos.
   - Devuelva un mapa con las claves `department`, `province`, `district` extraídas de la respuesta JSON (usa los campos `address.state`, `address.province`, `address.city` o `address.town` según la estructura de la respuesta).
   - Si la API falla o no encuentra resultados, retorne `null` o lance una excepción controlada.

2. Modifica el código donde se muestra la ubicación del usuario durante el registro o en el onboarding (por ejemplo en `onboarding_screen.dart` o en `location_picker_sheet.dart`) para que, después de obtener `latitude` y `longitude` con `geolocator`, llame a este nuevo servicio y muestre el resultado real en lugar del fallback fijo "Junín - Huancayo - Huancayo".
   - Si el servicio falla, mantén el comportamiento actual (mostrar la localidad por defecto o permitir selección manual).

3. Añade logs temporales para depurar: imprime en consola la URL solicitada y la respuesta obtenida.

4. No modifiques el backend ni la base de datos. Solo es una mejora del frontend Flutter.