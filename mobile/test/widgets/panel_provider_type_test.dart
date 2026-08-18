/// Regresión: `resolvePanelType` debe distinguir OFICIO vs PROFESIONAL en el
/// panel individual. Antes los tabs hardcodeaban 'OFICIO', rompiendo a los
/// proveedores PROFESIONAL (type=OFICIO al backend → 404 en analytics / me /
/// cancel-plan y la sección de confianza caía a "solicitar").
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/provider_dashboard/presentation/panel_provider_type.dart';

/// Doble de AuthProvider con el XOR de perfiles configurable.
class _FakeAuth extends ChangeNotifier implements AuthProvider {
  _FakeAuth({required this.professional});
  final bool professional;

  @override
  bool get hasProfessionalProfile => professional;

  @override
  // ignore: no_such_method
  dynamic noSuchMethod(Invocation invocation) => null;
}

Future<String> _resolve(
  WidgetTester tester, {
  required bool professional,
  required bool isNegocio,
}) async {
  late String result;
  await tester.pumpWidget(
    ChangeNotifierProvider<AuthProvider>.value(
      value: _FakeAuth(professional: professional),
      child: Builder(
        builder: (context) {
          result = resolvePanelType(context, isNegocio: isNegocio);
          return const SizedBox();
        },
      ),
    ),
  );
  return result;
}

void main() {
  testWidgets('NEGOCIO gana por el flag del tab', (tester) async {
    expect(
      await _resolve(tester, professional: false, isNegocio: true),
      'NEGOCIO',
    );
    // Aunque sea profesional, el tab de negocio resuelve NEGOCIO.
    expect(
      await _resolve(tester, professional: true, isNegocio: true),
      'NEGOCIO',
    );
  });

  testWidgets('individual: PROFESIONAL cuando el usuario migró', (
    tester,
  ) async {
    expect(
      await _resolve(tester, professional: true, isNegocio: false),
      'PROFESIONAL',
    );
  });

  testWidgets('individual: OFICIO por defecto', (tester) async {
    expect(
      await _resolve(tester, professional: false, isNegocio: false),
      'OFICIO',
    );
  });
}
