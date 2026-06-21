/// Regresión de reglas de negocio por plan (bug 4 / P3): el límite de fotos
/// GRATIS bajó a 2 y DEBE coincidir con el backend (PHOTO_LIMITS /
/// providers.service). Si alguien lo revierte a 3, este test lo atrapa.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/utils/plan_limits.dart';

void main() {
  group('PlanLimits.photos (debe coincidir con el backend)', () {
    test('GRATIS=2, ESTANDAR=6, PREMIUM=10', () {
      expect(PlanLimits.photos('GRATIS'), 2);
      expect(PlanLimits.photos('gratis'), 2);
      expect(PlanLimits.photos('ESTANDAR'), 6);
      expect(PlanLimits.photos('PREMIUM'), 10);
    });

    test('plan desconocido cae a GRATIS (2)', () {
      expect(PlanLimits.photos('LO_QUE_SEA'), 2);
    });

    test('canAddPhoto respeta el tope GRATIS=2', () {
      expect(PlanLimits.canAddPhoto('GRATIS', 0), true);
      expect(PlanLimits.canAddPhoto('GRATIS', 1), true);
      expect(PlanLimits.canAddPhoto('GRATIS', 2), false);
      expect(PlanLimits.canAddPhoto('PREMIUM', 9), true);
      expect(PlanLimits.canAddPhoto('PREMIUM', 10), false);
    });
  });

  group('PlanLimits — ofertas y duración (P1)', () {
    test('ofertas activas: GRATIS=1, ESTANDAR=4, PREMIUM=8', () {
      expect(PlanLimits.offers('GRATIS'), 1);
      expect(PlanLimits.offers('ESTANDAR'), 4);
      expect(PlanLimits.offers('PREMIUM'), 8);
    });

    test('duración de oferta (h): GRATIS=12, ESTANDAR=24, PREMIUM=72', () {
      expect(PlanLimits.offerDurationHours('GRATIS'), 12);
      expect(PlanLimits.offerDurationHours('ESTANDAR'), 24);
      expect(PlanLimits.offerDurationHours('PREMIUM'), 72);
    });

    test('canPublishOffer respeta el tope de ofertas activas', () {
      expect(PlanLimits.canPublishOffer('GRATIS', 0), true);
      expect(PlanLimits.canPublishOffer('GRATIS', 1), false);
    });
  });
}
