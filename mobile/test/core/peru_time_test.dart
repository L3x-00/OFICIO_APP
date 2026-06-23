/// Tests del helper de hora de Perú (UTC-5). Incluye el caso de la ventana
/// UTC tras medianoche (que en el backend causó un bug de fecha +1 día).
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/utils/peru_time.dart';

void main() {
  group('peruLocal', () {
    test('resta 5h: 02:00 UTC del día 24 → 21:00 del día 23 en Perú', () {
      final p = peruLocal(DateTime.utc(2026, 6, 24, 2, 0));
      expect(p.day, 23);
      expect(p.hour, 21);
    });
  });

  group('formato', () {
    test('fmtPeruDateTime con ISO Z (ventana UTC tras medianoche)', () {
      // 02:00 UTC del 24 = 21:00 del 23 en Perú.
      expect(fmtPeruDateTime('2026-06-24T02:00:00.000Z'), '23/06/2026 21:00');
    });
    test('fmtPeruTime convierte correctamente', () {
      // 13:30 UTC = 08:30 Perú.
      expect(fmtPeruTime('2026-06-25T13:30:00.000Z'), '08:30');
    });
    test('fmtPeruDate', () {
      expect(fmtPeruDate('2026-06-25T13:30:00.000Z'), '25/06/2026');
    });
  });

  group('peruDatePlus', () {
    test('suma días dentro del mes', () {
      expect(peruDatePlus('2026-06-10', 3), '2026-06-13');
    });
    test('cruza de mes', () {
      expect(peruDatePlus('2026-06-30', 2), '2026-07-02');
    });
    test('+0 devuelve el mismo día', () {
      expect(peruDatePlus('2026-06-23', 0), '2026-06-23');
    });
  });
}
