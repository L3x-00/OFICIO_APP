/// Regresión UX de reportar oferta (bug 3): éxito → marca reportada; 409
/// (ya reportado) → marca reportada igual; el estado persiste para que el
/// botón "reportar" nazca deshabilitado en sesiones futuras.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/features/offer_posts/presentation/providers/offers_provider.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

void main() {
  late MockDioAdapter adapter;

  setUp(() {
    adapter = installTestBackend();
    SharedPreferences.setMockInitialValues({});
  });

  group('PublicOffersProvider.reportOffer', () {
    test('éxito → (ok, !already) + oferta marcada como reportada', () async {
      adapter.onPost('/offers/2/report', status: 201, body: {'id': 1});

      final p = PublicOffersProvider();
      final res = await p.reportOffer(2, 'SPAM');

      expect(res.ok, true);
      expect(res.already, false);
      expect(p.isOfferReported(2), true);
    });

    test('409 (ya reportado) → (!ok, already) + oferta marcada', () async {
      adapter.onPost(
        '/offers/3/report',
        status: 409,
        body: {'message': 'Ya reportaste esta oferta'},
      );

      final p = PublicOffersProvider();
      final res = await p.reportOffer(3, 'SPAM');

      expect(res.ok, false);
      expect(res.already, true);
      expect(p.isOfferReported(3), true);
    });

    test('persiste el id reportado en SharedPreferences', () async {
      adapter.onPost('/offers/4/report', status: 201, body: {'id': 2});

      final p = PublicOffersProvider();
      await p.reportOffer(4, 'OTRO');

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getStringList('reported_offer_ids'), contains('4'));
    });

    test('otra oferta NO queda marcada por reportar una distinta', () async {
      adapter.onPost('/offers/5/report', status: 201, body: {'id': 3});
      final p = PublicOffersProvider();
      await p.reportOffer(5, 'SPAM');
      expect(p.isOfferReported(5), true);
      expect(p.isOfferReported(999), false);
    });
  });
}
