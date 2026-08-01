import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'stagger_fade.dart';

/// Visual del Slide 2: los 3 tipos de proveedor — oficios, profesionales y
/// negocios — en tarjetas lado a lado con stagger de entrada.
class SlideTypesGrid extends StatelessWidget {
  const SlideTypesGrid({super.key});

  static const _types = [
    (
      Icons.handyman_rounded,
      'Oficios',
      'Gasfiteros, electricistas, carpinteros...',
      AppColors.oficioAccent,
    ),
    (
      Icons.school_rounded,
      'Profesionales',
      'Abogados, doctores, ingenieros...',
      AppColors.profesionalAccent,
    ),
    (
      Icons.storefront_rounded,
      'Negocios',
      'Restaurantes, ferreterías, boutiques...',
      AppColors.negocioAccent,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < _types.length; i++) ...[
            if (i > 0) const SizedBox(width: 10),
            Expanded(
              child: StaggerFade(
                index: i,
                total: _types.length,
                child: _TypeCard(
                  icon: _types[i].$1,
                  label: _types[i].$2,
                  hint: _types[i].$3,
                  color: _types[i].$4,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TypeCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String hint;
  final Color color;

  const _TypeCard({
    required this.icon,
    required this.label,
    required this.hint,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 16),
      decoration: BoxDecoration(
        color: c.bgCard.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.1),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.16),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 21),
          ),
          const SizedBox(height: 10),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.tintOn(color, c.isDark),
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            hint,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: c.textMuted, fontSize: 9.5, height: 1.25),
          ),
        ],
      ),
    );
  }
}
