/// Regresión del campo de duración en publicar oferta (P1): el repositorio
/// DEBE enviar `durationHours` en el payload de creación, o el backend nunca
/// recibe la duración elegida por el proveedor.
library;

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/provider_dashboard/data/offer_posts_repository.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

void main() {
  late MockDioAdapter adapter;

  setUp(() {
    adapter = installTestBackend();
  });

  Map<String, String> capturedFields() {
    final req = adapter.captured.lastWhere(
      (r) => r.method == 'POST' && r.path.contains('/providers/me/offers'),
    );
    final form = req.data as FormData;
    return Map.fromEntries(form.fields);
  }

  test('createOffer envía durationHours + title + description', () async {
    adapter.on(
      method: 'POST',
      path: RegExp(r'/providers/me/offers'),
      body: {'id': 1},
    );

    final repo = OfferPostsRepository();
    try {
      await repo.createOffer(
        title: 'Oferta de prueba',
        description: 'Descripción suficientemente larga',
        durationHours: 24,
        type: 'OFICIO',
      );
    } catch (_) {
      // El parseo de la respuesta puede fallar (json mínimo): solo nos
      // importa QUÉ se envió, ya capturado antes de la respuesta.
    }

    final fields = capturedFields();
    expect(fields['durationHours'], '24');
    expect(fields['title'], 'Oferta de prueba');
    expect(fields['description'], 'Descripción suficientemente larga');
  });

  test('createOffer sin durationHours NO incluye el campo', () async {
    adapter.on(
      method: 'POST',
      path: RegExp(r'/providers/me/offers'),
      body: {'id': 1},
    );

    final repo = OfferPostsRepository();
    try {
      await repo.createOffer(
        title: 'Otra oferta',
        description: 'Otra descripción larga',
        type: 'NEGOCIO',
      );
    } catch (_) {}

    final fields = capturedFields();
    expect(fields.containsKey('durationHours'), isFalse);
  });
}
