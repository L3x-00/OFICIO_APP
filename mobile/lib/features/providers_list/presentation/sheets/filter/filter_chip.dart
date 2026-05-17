import 'package:flutter/material.dart';
import '../../../../../core/theme/app_theme_colors.dart';

/// Chip clickeable estilo pill para el filter sheet (disponibilidad, etc.).
///
/// NOTA: Material expone también un `AppFilterChip` propio — el nombre aquí
/// coincide pero el uso es interno al sheet, así que importamos esta
/// clase con prefijo si hay conflicto en el call-site.
class AppFilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color color;
  final VoidCallback onTap;
  const AppFilterChip({
    super.key,
    required this.label,
    required this.isSelected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.15) : c.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color.withValues(alpha: 0.4) : c.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? color : c.textSecondary,
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
