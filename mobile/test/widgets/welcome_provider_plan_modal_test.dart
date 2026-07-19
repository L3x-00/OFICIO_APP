import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/provider_dashboard/presentation/widgets/welcome_provider_plan_modal.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('muestra celebracion una vez y persiste el cierre', (
    tester,
  ) async {
    late BuildContext hostContext;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppThemeColors.buildLight(),
        home: Builder(
          builder: (context) {
            hostContext = context;
            return const Scaffold(body: SizedBox.expand());
          },
        ),
      ),
    );

    final modal = WelcomeProviderPlanModal.showIfFirstTime(
      hostContext,
      displayName: 'Servicio Norte',
      providerId: 42,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('¡Bienvenido a Servi!'), findsOneWidget);
    expect(find.byType(CustomPaint), findsWidgets);

    for (var i = 0; i < 4; i++) {
      await tester.tap(find.text('Siguiente'));
      await tester.pumpAndSettle();
    }
    await tester.tap(find.text('Entendido'));
    await tester.pumpAndSettle();
    await modal;

    expect(await WelcomeProviderPlanModal.shouldShow(42), false);
  });
}
