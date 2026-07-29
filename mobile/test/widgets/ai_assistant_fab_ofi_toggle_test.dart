/// Regresión: el toggle "Mostrar asistente Ofi" (Perfil > Preferencias)
/// debe ocultar/mostrar [AiAssistantFab] EN VIVO. El tab Home usa
/// `AutomaticKeepAliveClientMixin`, así que su `State` nunca se recrea al
/// navegar a Perfil y volver — el bug original leía SharedPreferences una
/// sola vez en `initState()` y el FAB quedaba congelado con el valor
/// inicial. El fix mueve la preferencia a [ProvidersProvider]
/// (ChangeNotifier global) y el FAB la lee con `context.watch`.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/core/network/socket_service.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/ai_assistant/presentation/ai_assistant_fab.dart';
import 'package:mobile/features/ai_assistant/presentation/ofi_avatar.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/providers_list/presentation/providers/providers_provider.dart';

import '../helpers/test_setup.dart';

/// Doble de AuthProvider que NO toca repo/red/socket — solo simula un
/// cliente puro autenticado (sin perfil de proveedor), que es el único
/// caso donde el toggle de Ofi aplica. El AuthProvider real dispara una
/// conexión de socket real en login() (ver login_screen_test.dart), algo
/// que no hace falta ni queremos en este test.
class _FakeAuth extends ChangeNotifier implements AuthProvider {
  @override
  bool get isAuthenticated => true;
  @override
  bool get hasOficioProfile => false;
  @override
  bool get hasNegocioProfile => false;

  @override
  // ignore: no_such_method
  dynamic noSuchMethod(Invocation invocation) => null;
}

void main() {
  setUp(() {
    installTestBackend();
    SharedPreferences.setMockInitialValues({});
  });

  tearDown(() => SocketService.instance.disconnect());

  testWidgets(
    'setOfiFabVisible oculta/muestra el FAB reactivamente para un cliente puro',
    (tester) async {
      final auth = _FakeAuth();
      final prov = ProvidersProvider();

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: auth),
            ChangeNotifierProvider<ProvidersProvider>.value(value: prov),
          ],
          child: MaterialApp(
            theme: AppThemeColors.buildLight(),
            home: const Scaffold(body: AiAssistantFab()),
          ),
        ),
      );
      await tester.pump();

      // Por defecto (ofiFabVisible=true) el FAB se renderiza.
      expect(find.byType(OfiAvatar), findsOneWidget);

      // El usuario desactiva "Mostrar asistente Ofi" desde Perfil.
      await prov.setOfiFabVisible(false);
      await tester.pump();

      expect(find.byType(OfiAvatar), findsNothing);

      // Lo reactiva.
      await prov.setOfiFabVisible(true);
      await tester.pump();

      expect(find.byType(OfiAvatar), findsOneWidget);

      // Desmonta para cancelar los timers/tickers internos del FAB antes de
      // que termine el test (evita "pending timer" de flutter_test).
      await tester.pumpWidget(const SizedBox());
    },
  );
}
