import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'stagger_fade.dart';

/// Visual del Slide 1: bienvenida — chip de comunidad + 3 categorías
/// flotantes (oficios, profesionales, negocios) sobre la imagen de fondo.
class SlideWelcomeIntro extends StatelessWidget {
  const SlideWelcomeIntro({super.key});

  static const _pills = [
    (Icons.handyman_rounded, 'Oficios', AppColors.oficioAccent),
    (Icons.work_rounded, 'Profesionales', AppColors.profesionalAccent),
    (Icons.storefront_rounded, 'Negocios', AppColors.negocioAccent),
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
      child: Column(
        children: [
          StaggerFade(
            index: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.trending_up_rounded,
                    color: AppColors.primary,
                    size: 13,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    'Comunidad en crecimiento',
                    style: TextStyle(
                      color: AppColors.tintOn(AppColors.primary, c.isDark),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Spacer(),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 10,
            runSpacing: 10,
            children: [
              for (var i = 0; i < _pills.length; i++)
                StaggerFade(
                  index: i + 1,
                  total: _pills.length,
                  child: _CategoryPill(
                    icon: _pills[i].$1,
                    label: _pills[i].$2,
                    color: _pills[i].$3,
                  ),
                ),
            ],
          ),
          const Spacer(),
        ],
      ),
    );
  }
}

class _CategoryPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _CategoryPill({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: c.bgCard.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.35)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.12),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.16),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 15),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              color: AppColors.tintOn(color, c.isDark),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
