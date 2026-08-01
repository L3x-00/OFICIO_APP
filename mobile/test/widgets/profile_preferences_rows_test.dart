/// Regresión del rediseño de "Preferencias": los toggles ahora delegan en
/// [SectionItem] (mismo layout que el resto de ítems) con el [Switch] como
/// `trailing`. Lo que se puede romper al mover el layout es el cableado del
/// tap de la fila, así que eso es lo que se verifica.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:mobile/features/auth/presentation/widgets/profile/profile_sections.dart';
import 'package:mobile/features/auth/presentation/widgets/profile/profile_toggles.dart';

Widget _host(Widget child) => MaterialApp(
  theme: AppThemeColors.buildLight(),
  home: Scaffold(body: child),
);

void main() {
  testWidgets(
    'SectionItem con trailing muestra el control en vez del chevron',
    (tester) async {
      await tester.pumpWidget(
        _host(
          const SectionItem(
            icon: Icons.tune_rounded,
            label: 'Con trailing',
            onTap: null,
            trailing: Icon(Icons.toggle_on_rounded),
          ),
        ),
      );

      expect(find.byIcon(Icons.toggle_on_rounded), findsOneWidget);
      expect(find.byIcon(Icons.chevron_right_rounded), findsNothing);
    },
  );

  testWidgets('ThemeToggleRow: fila tipo SectionItem y el tap alterna el tema', (
    tester,
  ) async {
    final theme = ThemeProvider();
    addTearDown(theme.dispose);
    final before = theme.isDark;

    await tester.pumpWidget(_host(ThemeToggleRow(theme: theme)));

    // Layout unificado: es un SectionItem con Switch, sin chevron.
    expect(find.byType(SectionItem), findsOneWidget);
    expect(find.byType(Switch), findsOneWidget);
    expect(find.byIcon(Icons.chevron_right_rounded), findsNothing);

    // Tap en el texto de la fila (no en el switch): debe alternar igual que antes.
    await tester.tap(find.text(before ? 'Tema oscuro' : 'Tema claro'));
    await tester.pumpAndSettle();

    expect(theme.isDark, isNot(before));
  });
}
