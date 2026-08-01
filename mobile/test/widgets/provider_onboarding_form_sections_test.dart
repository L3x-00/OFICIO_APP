/// Regresión del refactor de `ProviderOnboardingForm` (separación de
/// diseño/lógica en `widgets/onboarding_*_section.dart`) + el cambio
/// visual pedido: PROFESIONAL divide "Información Básica" en 2 secciones
/// ("Información Básica" + "Perfil Profesional"), mostrando 3 secciones
/// de acordeón en vez de 2. Oficio/Negocio deben seguir con 2 secciones,
/// sin cambios.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/screens/onboarding/provider_onboarding_form.dart';

import '../helpers/test_setup.dart';

/// Doble mínimo — el smoke test solo monta el formulario y toca el header
/// de sus propias secciones, nunca llega a leer AuthProvider.
class _FakeAuth extends ChangeNotifier implements AuthProvider {
  @override
  // ignore: no_such_method
  dynamic noSuchMethod(Invocation invocation) => null;
}

Widget _harness(String providerType) {
  return ChangeNotifierProvider<AuthProvider>.value(
    value: _FakeAuth(),
    child: MaterialApp(
      theme: AppThemeColors.buildLight(),
      home: ProviderOnboardingForm(
        providerType: providerType,
        isStandalone: true,
      ),
    ),
  );
}

void main() {
  setUp(() {
    // Stub explícito de /providers/categories: sin él, initState() dispara
    // una llamada real (aunque sea al mock) que deja un timer interno de
    // Dio pendiente al terminar el test ("A Timer is still pending").
    installTestBackend().onGet('/providers/categories', body: []);
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('OFICIO: 2 secciones, sin "Perfil Profesional"', (tester) async {
    await tester.pumpWidget(_harness('OFICIO'));
    await tester.pumpAndSettle();

    expect(find.text('Información Básica'), findsOneWidget);
    expect(find.text('Detalles del Servicio'), findsOneWidget);
    expect(find.text('Perfil Profesional'), findsNothing);
  });

  testWidgets('NEGOCIO: 2 secciones, sin "Perfil Profesional"', (tester) async {
    await tester.pumpWidget(_harness('NEGOCIO'));
    await tester.pumpAndSettle();

    expect(find.text('Información Básica'), findsOneWidget);
    expect(find.text('Detalles del Servicio'), findsOneWidget);
    expect(find.text('Perfil Profesional'), findsNothing);
  });

  testWidgets(
    'PROFESIONAL: 3 secciones (Básica + Perfil Profesional + Detalles)',
    (tester) async {
      await tester.pumpWidget(_harness('PROFESIONAL'));
      await tester.pumpAndSettle();

      expect(find.text('Información Básica'), findsOneWidget);
      expect(find.text('Perfil Profesional'), findsOneWidget);
      expect(find.text('Detalles del Servicio'), findsOneWidget);
    },
  );

  testWidgets(
    'PROFESIONAL: sección 1 incompleta — "Continuar" no avanza y avisa',
    (tester) async {
      await tester.pumpWidget(_harness('PROFESIONAL'));
      await tester.pumpAndSettle();

      // Especialidad (campo exclusivo de "Perfil Profesional") NO debe
      // verse todavía: esa sección arranca colapsada.
      expect(find.text('Especialidad *'), findsNothing);

      await tester.ensureVisible(find.text('Continuar'));
      await tester.tap(find.text('Continuar'));
      await tester.pumpAndSettle();

      expect(
        find.text('Completa los campos obligatorios para continuar.'),
        findsOneWidget,
      );
      // Sigue sin mostrarse: no avanzó de sección.
      expect(find.text('Especialidad *'), findsNothing);
    },
  );
}
