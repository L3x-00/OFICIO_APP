/// Regresión: el toggle "Mostrar asistente Ofi" (Perfil > Preferencias)
/// debe persistir en SharedPreferences y notificar a los listeners de
/// [ProvidersProvider] para que el FAB de la pantalla principal reaccione
/// sin necesidad de recrear la pantalla.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/core/network/socket_service.dart';
import 'package:mobile/features/providers_list/presentation/providers/providers_provider.dart';

import '../helpers/test_setup.dart';

void main() {
  setUp(() {
    installTestBackend();
    SharedPreferences.setMockInitialValues({});
  });

  tearDown(() => SocketService.instance.disconnect());

  test('ofiFabVisible por defecto es true (Ofi visible)', () {
    final p = ProvidersProvider();
    expect(p.ofiFabVisible, true);
  });

  test(
    'setOfiFabVisible(false) actualiza el getter, notifica y persiste',
    () async {
      final p = ProvidersProvider();
      var notified = false;
      p.addListener(() => notified = true);

      await p.setOfiFabVisible(false);

      expect(p.ofiFabVisible, false);
      expect(notified, true);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getBool('ofi_fab_visible'), false);
    },
  );

  test(
    'loadPreferences() restaura ofiFabVisible guardado en una sesión previa',
    () async {
      SharedPreferences.setMockInitialValues({'ofi_fab_visible': false});
      final p = ProvidersProvider();
      // Antes de cargar, conserva el default en memoria.
      expect(p.ofiFabVisible, true);

      await p.loadPreferences();

      expect(p.ofiFabVisible, false);
    },
  );
}
