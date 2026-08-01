/// Regresión del carrusel de bienvenida: la imagen de fondo debe LLENAR la
/// tarjeta. `AnimatedSwitcher.defaultLayoutBuilder` envuelve al hijo en un
/// `Stack` sin `fit`, o sea constraints LOOSE — sin `width/height:
/// double.infinity` el `Image` se dimensiona por su tamaño intrínseco y se
/// dibuja como una franja centrada (el efecto full-bleed desaparece).
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/auth/presentation/widgets/welcome/slide_data.dart';
import 'package:mobile/features/auth/presentation/widgets/welcome/welcome_carousel.dart';

void main() {
  testWidgets('la imagen de fondo llena el carrusel, no queda centrada', (
    tester,
  ) async {
    const boxW = 320.0;
    const boxH = 480.0;
    final controller = PageController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppThemeColors.buildLight(),
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: boxW,
              height: boxH,
              child: VisualCarousel(
                pageController: controller,
                currentPage: 0,
                onPageChanged: (_) {},
                slides: const [
                  SlideData(
                    title: 'T',
                    subtitle: 'S',
                    visual: SizedBox.shrink(),
                    accentColor: AppColors.primary,
                    backgroundImage:
                        'assets/images/onboarding/slide-1-presentación.webp',
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    // El borde de 1.5 dp del AnimatedContainer descuenta 3 dp por eje.
    final size = tester.getSize(find.byType(Image));
    expect(size.width, closeTo(boxW - 3, 1));
    expect(size.height, closeTo(boxH - 3, 1));
  });
}
