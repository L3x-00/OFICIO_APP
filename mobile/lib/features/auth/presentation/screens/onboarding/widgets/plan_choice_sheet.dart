import 'package:flutter/material.dart';
import '../../../../../../core/constants/app_colors.dart';
import '../../../../../../core/theme/app_theme_colors.dart';

/// Sheet de confirmación final cuando el usuario eligió un plan pagado:
///   - "Adquirir plan X"               → returns 'paid'
///   - "Registrarme con plan gratis"   → returns 'free'
///   - "Cambiar de plan"               → returns null (cancel)
class PlanChoiceSheet extends StatelessWidget {
  final String planChoice;
  const PlanChoiceSheet({super.key, required this.planChoice});

  /// Abre el sheet y resuelve con la opción elegida.
  static Future<String?> show(BuildContext context, {required String planChoice}) {
    return showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => PlanChoiceSheet(planChoice: planChoice),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final paidPlan = planChoice;
    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        24, 16, 24,
        MediaQuery.of(context).padding.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.35),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Elige cómo registrarte',
            style: TextStyle(
                color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            'Seleccionaste el plan $paidPlan. Puedes adquirirlo ahora o '
            'empezar gratis y suscribirte luego desde tu panel.',
            style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 22),
          ElevatedButton.icon(
            onPressed: () => Navigator.of(context).pop('paid'),
            icon: const Icon(Icons.workspace_premium_rounded, size: 18),
            label: Text('Adquirir plan $paidPlan',
                style: const TextStyle(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => Navigator.of(context).pop('free'),
            icon: const Icon(Icons.handshake_rounded, size: 18),
            label: const Text('Registrarme con plan gratis',
                style: TextStyle(fontWeight: FontWeight.bold)),
            style: OutlinedButton.styleFrom(
              foregroundColor: c.textPrimary,
              side: BorderSide(color: c.border),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 6),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              // Cierra el sheet y deja que el usuario vuelva atrás para
              // reabrir el onboarding de planes — no perdemos los datos
              // del form porque seguimos en la misma pantalla.
            },
            child: Text('Cambiar de plan',
                style: TextStyle(color: c.textMuted)),
          ),
        ],
      ),
    );
  }
}
