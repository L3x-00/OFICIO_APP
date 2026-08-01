import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'slide_data.dart';

/// Carrusel visual con imagen de fondo por slide + scrim adaptado al tema.
class VisualCarousel extends StatelessWidget {
  final PageController pageController;
  final List<SlideData> slides;
  final int currentPage;
  final ValueChanged<int> onPageChanged;

  const VisualCarousel({
    super.key,
    required this.pageController,
    required this.slides,
    required this.currentPage,
    required this.onPageChanged,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final accent = slides[currentPage].accentColor;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: accent.withValues(alpha: 0.18), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: c.isDark ? 0.18 : 0.1),
            blurRadius: 32,
            spreadRadius: 2,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Imagen de fondo representativa del slide (crossfade entre slides)
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 450),
              child: Image.asset(
                slides[currentPage].backgroundImage,
                key: ValueKey(slides[currentPage].backgroundImage),
                fit: BoxFit.cover,
                // AnimatedSwitcher.defaultLayoutBuilder envuelve al hijo en un
                // Stack SIN fit ⇒ constraints LOOSE: sin estas dos líneas la
                // imagen se dimensiona por su tamaño intrínseco (941×1672) y
                // se dibuja como franja centrada en vez de llenar el carrusel.
                width: double.infinity,
                height: double.infinity,
              ),
            ),
            // Scrim para legibilidad del contenido encima de la imagen
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: c.isDark
                      ? [
                          Colors.black.withValues(alpha: 0.0),
                          Colors.black.withValues(alpha: 0.35),
                          Colors.black.withValues(alpha: 0.72),
                        ]
                      : [
                          Colors.white.withValues(alpha: 0.05),
                          Colors.white.withValues(alpha: 0.45),
                          Colors.white.withValues(alpha: 0.78),
                        ],
                  stops: const [0.0, 0.55, 1.0],
                ),
              ),
            ),
            // Contenido
            PageView.builder(
              controller: pageController,
              onPageChanged: onPageChanged,
              itemCount: slides.length,
              itemBuilder: (_, i) => slides[i].visual,
            ),
          ],
        ),
      ),
    );
  }
}
