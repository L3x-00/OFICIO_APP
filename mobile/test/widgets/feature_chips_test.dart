/// Widget tests de [FeatureChips] (badge de funcionalidades en la tarjeta
/// del listado).
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/providers_list/presentation/widgets/feature_chips.dart';

void main() {
  // El widget lee context.colors → el host necesita el ThemeExtension real.
  Widget host(Widget child) => MaterialApp(
    theme: AppThemeColors.buildDark(),
    home: Scaffold(body: child),
  );

  testWidgets('muestra un chip por cada feature conocida', (tester) async {
    await tester.pumpWidget(
      host(const FeatureChips(features: ['carta_digital', 'catalogo'])),
    );
    expect(find.text('Carta'), findsOneWidget);
    expect(find.text('Catálogo'), findsOneWidget);
  });

  testWidgets('sin features no renderiza nada visible', (tester) async {
    await tester.pumpWidget(host(const FeatureChips(features: [])));
    expect(find.text('Carta'), findsNothing);
    expect(find.text('Agenda'), findsNothing);
  });

  testWidgets('ignora features desconocidas', (tester) async {
    await tester.pumpWidget(
      host(const FeatureChips(features: ['xyz', 'agenda'])),
    );
    expect(find.text('Agenda'), findsOneWidget);
    expect(find.text('xyz'), findsNothing);
  });
}
