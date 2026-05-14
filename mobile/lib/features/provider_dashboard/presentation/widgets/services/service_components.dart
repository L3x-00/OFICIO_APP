import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../../core/utils/plan_limits.dart';
import '../../../../payments/presentation/screens/plan_selector_sheet.dart';

/// Banner que muestra el uso de servicios/productos vs. el límite del plan.
/// Cambia de color según cercanía al límite (verde → ámbar → rojo) y ofrece
/// "Subir de plan" si no es Premium.
class PlanLimitBanner extends StatelessWidget {
  final String plan;
  final int current;
  final int limit;
  final bool isNegocio;
  final String limitLabel;

  const PlanLimitBanner({
    super.key,
    required this.plan,
    required this.current,
    required this.limit,
    required this.isNegocio,
    required this.limitLabel,
  });

  @override
  Widget build(BuildContext context) {
    final atLimit  = limit < 999 && current >= limit;
    final nearLimit = !atLimit && limit < 999 && current >= limit - 1 && limit > 1;
    final isPremium = plan.toUpperCase() == 'PREMIUM';
    final noun = isNegocio ? 'productos' : 'servicios';
    final c    = context.colors;

    final Color accent = atLimit
        ? AppColors.busy
        : nearLimit
            ? AppColors.amber
            : AppColors.available;

    final String title = atLimit
        ? 'Límite alcanzado — $current / $limitLabel'
        : '$current / $limitLabel $noun usados';

    final String subtitle = atLimit
        ? 'Sube al plan ${PlanLimits.nextPlan(plan)} para añadir más.'
        : nearLimit
            ? 'Casi en el límite. Considera subir de plan.'
            : 'Plan ${plan.toLowerCase()} activo.';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: accent.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(
            atLimit ? Icons.lock_rounded : Icons.inventory_2_outlined,
            color: accent,
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: accent,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(color: c.textSecondary, fontSize: 11, height: 1.4),
                ),
              ],
            ),
          ),
          if (!isPremium) ...[
            const SizedBox(width: 8),
            TextButton(
              onPressed: () => PlanSelectorSheet.show(context),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.amber,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
              ),
              child: const Text('Subir de plan'),
            ),
          ],
        ],
      ),
    );
  }
}

/// Estado vacío del tab — ícono grande + CTA para añadir el primer
/// servicio/producto.
class EmptyServices extends StatelessWidget {
  final String label;
  final String labelSingular;
  final bool isNegocio;
  final VoidCallback? onAdd;

  const EmptyServices({
    super.key,
    required this.label,
    required this.labelSingular,
    this.onAdd,
    this.isNegocio = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.amber.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                color: AppColors.amber,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Sin $label aún',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Añade tus $label para que los clientes\nsepan qué ofreces y a qué precio.',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 13,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onAdd,
              icon: Icon(Icons.add_rounded),
              label: Text('Añadir $labelSingular'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.amber,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Campo de texto reusable para los formularios de servicio y oferta.
class ServiceFormField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final int maxLines;
  final TextInputType keyboardType;

  const ServiceFormField({
    super.key,
    required this.controller,
    required this.label,
    required this.hint,
    this.maxLines = 1,
    this.keyboardType = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: c.textSecondary, fontSize: 12)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: TextStyle(color: c.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
            filled: true,
            fillColor: c.bgInput,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.amber, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
