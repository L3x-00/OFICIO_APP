import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Título y subtítulo del slide activo, con transición AnimatedSwitcher.
class SlideText extends StatelessWidget {
  final String title;
  final String subtitle;

  const SlideText({
    super.key,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 18, 28, 0),
      child: Column(
        children: [
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.bold,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 13,
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }
}