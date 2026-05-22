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
  /// Etiqueta opcional sobre el nombre (ej. "1 MES GRATIS DE BIENVENIDA").
  final String? badge;
  /// Si está presente, la tarjeta muestra un botón CTA con este texto.
  final String? ctaLabel;

  const PlanData({
    required this.name,
    required this.price,
    required this.period,
    required this.features,
    required this.isHighlighted,
    this.badge,
    this.ctaLabel,
  });
}

/// Tarjeta visual de un plan. Si `isHighlighted` es true se muestra con
/// badge "Popular" y borde primary. Si `plan.ctaLabel` está definido y
/// se pasa `onCta`, renderiza un botón de acción al pie de la tarjeta.
class PlanCard extends StatelessWidget {
  final PlanData plan;
  /// Callback del botón CTA — solo se renderiza si `plan.ctaLabel != null`.
  final VoidCallback? onCta;
  const PlanCard({super.key, required this.plan, this.onCta});

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
          if (plan.badge != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.available.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                    color: AppColors.available.withValues(alpha: 0.45)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.card_giftcard_rounded,
                      size: 12, color: AppColors.available),
                  const SizedBox(width: 5),
                  Text(
                    plan.badge!,
                    style: const TextStyle(
                      color: AppColors.available,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ],
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
                  Expanded(
                    child: Text(
                      f,
                      style: TextStyle(
                        color: c.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (plan.ctaLabel != null && onCta != null) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onCta,
                icon: const Icon(Icons.workspace_premium_rounded, size: 18),
                label: Text(
                  plan.ctaLabel!,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 13),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.premium,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Banner de bienvenida: comunica el regalo del plan Estándar gratis
/// por 1 mes para todo proveedor que se registra por primera vez.
/// Se muestra debajo de las tarjetas de planes.
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.celebration_rounded, color: AppColors.available, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Regalo de bienvenida',
                  style: TextStyle(
                    color: AppColors.available,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'Al registrarte por primera vez como profesional o '
                  'negocio recibes el plan Estándar GRATIS durante 1 mes '
                  'completo. Sin tarjeta, sin compromiso.',
                  style: TextStyle(
                    color: AppColors.available,
                    fontSize: 11.5,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
