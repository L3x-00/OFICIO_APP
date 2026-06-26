import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Bloque de selección de plan del onboarding: informa la cortesía del plan
/// Estándar gratis y ofrece la opción interactiva de adquirir Premium.
/// Extraído de `provider_onboarding_form.dart` por mantenibilidad — UI pura,
/// el estado (`acquirePremium`) y el toggle los gestiona el form padre.
class OnboardingPlanSection extends StatelessWidget {
  final bool acquirePremium;
  final VoidCallback onToggle;

  const OnboardingPlanSection({
    super.key,
    required this.acquirePremium,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Cortesía: Estándar gratis 1 mes.
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.available.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.available.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.card_giftcard_rounded,
                color: AppColors.tintOn(AppColors.available, c.isDark),
                size: 18,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Tu registro incluye el plan Estándar GRATIS durante '
                  '1 mes de bienvenida.',
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 11.5,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        // Opción interactiva: adquirir Premium.
        GestureDetector(
          onTap: onToggle,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: acquirePremium
                  ? AppColors.premium.withValues(alpha: 0.10)
                  : c.bgInput,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: acquirePremium ? AppColors.premium : c.border,
                width: acquirePremium ? 1.5 : 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      acquirePremium
                          ? Icons.check_circle_rounded
                          : Icons.radio_button_unchecked_rounded,
                      color: acquirePremium ? AppColors.premium : c.textMuted,
                      size: 22,
                    ),
                    const SizedBox(width: 10),
                    const Icon(
                      Icons.workspace_premium_rounded,
                      color: AppColors.premium,
                      size: 18,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Adquirir plan Premium',
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Text(
                      'S/ 39.90/mes',
                      style: TextStyle(
                        color: AppColors.tintOn(AppColors.premium, c.isDark),
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  acquirePremium
                      ? 'Al finalizar el registro elegirás cómo pagar '
                            '(Yape o MercadoPago). Tu perfil quedará en '
                            'revisión mientras validamos el pago.'
                      : 'Posición #1 garantizada, soporte prioritario, '
                            'análisis de clientes y panel avanzado. Actívalo '
                            'para pasar al pago al finalizar el registro.',
                  style: TextStyle(
                    color: c.textMuted,
                    fontSize: 11.5,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
