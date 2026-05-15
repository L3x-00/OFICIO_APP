import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Indicadores de punto animados para el carrusel de welcome.
class PageIndicators extends StatelessWidget {
  final int total;
  final int current;
  final Color accentColor;

  const PageIndicators({
    super.key,
    required this.total,
    required this.current,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(total, (i) {
        final active = i == current;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeInOut,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width:  active ? 28 : 8,
          height: 8,
          decoration: BoxDecoration(
            color:  active ? accentColor : c.textMuted.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}