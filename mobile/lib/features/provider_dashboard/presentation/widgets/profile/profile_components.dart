import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';

/// Título de sección reusable (ícono + texto). Compartido por las
/// secciones del tab de perfil.
class SectionTitle extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color color;

  const SectionTitle({
    super.key,
    required this.icon,
    required this.title,
    this.color = AppColors.amber,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            color: c.textPrimary,
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
