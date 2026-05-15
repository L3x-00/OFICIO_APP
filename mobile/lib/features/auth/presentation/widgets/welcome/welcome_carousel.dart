import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'slide_data.dart';

/// Carrusel visual con fondo gradiente animado según el slide activo.
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
        border: Border.all(
          color: accent.withValues(alpha: 0.18),
          width: 1.5,
        ),
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
          children: [
            // Fondo con gradiente animado según slide
            AnimatedContainer(
              duration: const Duration(milliseconds: 500),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    accent.withValues(alpha: c.isDark ? 0.12 : 0.07),
                    c.bgCard,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
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