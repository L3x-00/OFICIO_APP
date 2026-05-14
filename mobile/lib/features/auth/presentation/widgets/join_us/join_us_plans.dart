import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Datos de un plan (gratis/estándar/premium) para mostrar en la vista de
/// detalle del modal.
class PlanData {
  final String name;
  final String price;
  final String period;
  final List<String> features;
  final bool isHighlighted;

  const PlanData({
    required this.name,
    required this.price,
    required this.period,
    required this.features,
    required this.isHighlighted,
  });
}

/// Tarjeta visual de un plan. Si `isHighlighted` es true se muestra con
/// badge "Popular" y borde primary.
class PlanCard extends StatelessWidget {
  final PlanData plan;
  const PlanCard({super.key, required this.plan});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: plan.isHighlighted
            ? AppColors.primary.withValues(alpha: 0.08)
            : c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: plan.isHighlighted
              ? AppColors.primary.withValues(alpha: 0.4)
              : Colors.white.withValues(alpha: 0.06),
          width: plan.isHighlighted ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                plan.name,
                style: TextStyle(
                  color: plan.isHighlighted
                      ? AppColors.primary
                      : c.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (plan.isHighlighted) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Popular',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
              const Spacer(),
              RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: plan.price,
                      style: TextStyle(
                        color: plan.isHighlighted
                            ? AppColors.primary
                            : c.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    TextSpan(
                      text: '\n${plan.period}',
                      style: TextStyle(
                        color: c.textMuted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
                textAlign: TextAlign.right,
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...plan.features.map(
            (f) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Icon(
                    Icons.check_circle_rounded,
                    size: 16,
                    color: plan.isHighlighted
                        ? AppColors.primary
                        : AppColors.available,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    f,
                    style: TextStyle(
                      color: c.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Banner que destaca el periodo gratuito y el beneficio de "aparecer
/// primero en su localidad". Se muestra debajo de las tarjetas de planes.
class FreePeriodBanner extends StatelessWidget {
  const FreePeriodBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.available.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.available.withValues(alpha: 0.3)),
      ),
      child: const Row(
        children: [
          Icon(Icons.celebration_rounded, color: AppColors.available, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Los primeros proveedores de cada localidad obtienen '
              'Aparecen primero en las busquedas de su localidad.',
              style: TextStyle(
                color: AppColors.available,
                fontSize: 12,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
