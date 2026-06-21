/// Regresión del fix de caché de imágenes (gap 6/1): la cacheKey DEBE ser
/// estable aunque el backend re-firme la URL con un X-Amz-Signature distinto
/// en cada respuesta. Si esto se rompe, el invitado vuelve a re-descargar todo.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';

void main() {
  group('AppNetworkImage.stableCacheKey', () {
    const base = 'https://acc.r2.cloudflarestorage.com/bucket/providers/1.jpg';

    test('misma imagen con firmas distintas → MISMA key', () {
      final a = AppNetworkImage.stableCacheKey(
        '$base?X-Amz-Signature=AAA&X-Amz-Date=20240101T0000Z&X-Amz-Expires=604800',
      );
      final b = AppNetworkImage.stableCacheKey(
        '$base?X-Amz-Signature=BBB&X-Amz-Date=20240202T0000Z&X-Amz-Expires=604800',
      );
      expect(a, b);
      expect(a, base);
      expect(a.toLowerCase().contains('x-amz'), isFalse);
    });

    test('conserva query params que NO son de presign', () {
      final k = AppNetworkImage.stableCacheKey(
        'https://cdn/img.jpg?v=2&X-Amz-Signature=Z&Expires=10',
      );
      expect(k, 'https://cdn/img.jpg?v=2');
    });

    test('URL sin query (thumb del CDN) → sin cambios', () {
      const u = 'https://img.oficioapp.org.pe/providers/1_thumb.webp';
      expect(AppNetworkImage.stableCacheKey(u), u);
    });

    test('URL vacía o inválida no crashea', () {
      expect(AppNetworkImage.stableCacheKey(''), '');
      expect(AppNetworkImage.stableCacheKey('basura ::: no-url'), isNotNull);
    });
  });
}
