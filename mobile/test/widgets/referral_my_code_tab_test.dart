/// Widget tests del tab "Mi código" de referidos.
///
/// Cubre los 3 sub-widgets atómicos exportados:
///   • CoinsCard — pinta el balance numérico.
///   • MyCodeCard — pinta el código + botón "Copiar código" + botón
///     "Copiar enlace para invitar".
///   • MetricBox — pinta etiqueta + valor.
///
/// Estos widgets son `StatelessWidget` puros (sin depender de
/// ReferralsProvider) — los testeamos aislados con un MaterialApp
/// mínimo + tema cargado.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/referrals/presentation/widgets/referral/referral_my_code_tab.dart';

Widget _harness(Widget child) {
  return MaterialApp(
    theme: AppThemeColors.buildLight(),
    home: Scaffold(
      body: SafeArea(child: SingleChildScrollView(child: child)),
    ),
  );
}

void main() {
  testWidgets('CoinsCard muestra el balance numérico formateado', (
    tester,
  ) async {
    await tester.pumpWidget(_harness(const CoinsCard(coins: 125)));
    await tester.pump();

    // Etiqueta "Tus monedas".
    expect(find.text('Tus monedas'), findsOneWidget);
    // Valor formateado con separador de miles (formatNumber del helper).
    // Para 125 sin separador, el render exacto es "125".
    expect(find.text('125'), findsOneWidget);
    // Icono de monedas.
    expect(find.byIcon(Icons.monetization_on_rounded), findsOneWidget);
  });

  testWidgets('CoinsCard con balance grande mantiene el formato (no rompe)', (
    tester,
  ) async {
    await tester.pumpWidget(_harness(const CoinsCard(coins: 1500)));
    await tester.pump();
    // No assertamos sobre el separador específico (depende del locale),
    // solo que el número está presente en alguna forma.
    expect(find.textContaining('1'), findsAtLeastNWidgets(1));
    expect(find.byIcon(Icons.monetization_on_rounded), findsOneWidget);
  });

  testWidgets(
    'MyCodeCard muestra el código + botón de copiar + CTA "Copiar enlace"',
    (tester) async {
      await tester.pumpWidget(_harness(const MyCodeCard(code: 'ABCD1234')));
      await tester.pump();

      // El código visible.
      expect(find.text('ABCD1234'), findsOneWidget);
      // Header "TU CÓDIGO PERSONAL".
      expect(find.text('TU CÓDIGO PERSONAL'), findsOneWidget);
      // IconButton con tooltip "Copiar código".
      final iconBtn = find.byTooltip('Copiar código');
      expect(iconBtn, findsOneWidget);
      // CTA principal de share.
      expect(find.text('Copiar enlace para invitar'), findsOneWidget);
      expect(find.byIcon(Icons.share_rounded), findsOneWidget);
    },
  );

  testWidgets('Tap en "Copiar código" muestra SnackBar de confirmación', (
    tester,
  ) async {
    await tester.pumpWidget(_harness(const MyCodeCard(code: 'CODE0001')));
    await tester.pump();

    await tester.tap(find.byTooltip('Copiar código'));
    // Permite que el SnackBar entre por animación.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Código copiado'), findsOneWidget);
  });

  testWidgets('MetricBox renderiza icono, valor y etiqueta', (tester) async {
    await tester.pumpWidget(
      _harness(
        const MetricBox(
          icon: Icons.verified_rounded,
          label: 'Aprobadas',
          value: '7',
          color: Color(0xFF10B981),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('7'), findsOneWidget);
    expect(find.text('Aprobadas'), findsOneWidget);
    expect(find.byIcon(Icons.verified_rounded), findsOneWidget);
  });
}
