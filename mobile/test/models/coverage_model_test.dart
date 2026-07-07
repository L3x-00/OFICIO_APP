import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/provider_dashboard/domain/models/coverage_model.dart';

/// Modelo del "Alcance" — parseo de GET/PUT /provider-profile/me/coverage.
void main() {
  group('CoverageModel.fromJson', () {
    test('respuesta completa (plan de pago)', () {
      final model = CoverageModel.fromJson({
        'plan': 'ESTANDAR',
        'maxDistricts': 3,
        'locked': false,
        'home': {
          'id': 2,
          'name': 'El Tambo',
          'department': 'Junín',
          'province': 'Huancayo',
          'district': 'El Tambo',
        },
        'selected': [
          {'id': 1, 'name': 'Huancayo', 'district': 'Huancayo'},
        ],
        'options': [
          {'id': 1, 'name': 'Huancayo', 'district': 'Huancayo'},
          {'id': 3, 'name': 'Chilca', 'district': 'Chilca'},
        ],
      });

      expect(model.plan, 'ESTANDAR');
      expect(model.maxDistricts, 3);
      expect(model.maxExtras, 2);
      expect(model.locked, isFalse);
      expect(model.home?.label, 'El Tambo');
      expect(model.selected.map((l) => l.id), [1]);
      expect(model.options, hasLength(2));
    });

    test('plan GRATIS bloqueado y campos ausentes → defaults seguros', () {
      final model = CoverageModel.fromJson({
        'plan': 'GRATIS',
        'maxDistricts': 1,
        'locked': true,
        'home': null,
      });

      expect(model.locked, isTrue);
      expect(model.maxExtras, 0); // nunca negativo
      expect(model.home, isNull);
      expect(model.selected, isEmpty);
      expect(model.options, isEmpty);
    });

    test('json vacío no revienta (default-deny)', () {
      final model = CoverageModel.fromJson({});
      expect(model.plan, 'GRATIS');
      expect(model.locked, isTrue);
      expect(model.maxDistricts, 1);
    });

    test('label usa district y cae a name si falta', () {
      const withDistrict = CoverageLocality(
        id: 1,
        name: 'x',
        district: 'Chilca',
      );
      const withoutDistrict = CoverageLocality(id: 2, name: 'Huancayo');
      expect(withDistrict.label, 'Chilca');
      expect(withoutDistrict.label, 'Huancayo');
    });
  });
}
