import 'package:flutter/material.dart';
import '../../../../../../core/constants/app_colors.dart';
import '../../../../../../core/theme/app_theme_colors.dart';

/// Selector de método de pago para el Plan Premium en el onboarding.
///
/// Lógica consolidada: el plan Estándar es siempre gratis de bienvenida
/// (no pasa por aquí). Solo Premium llega a este sheet, donde el usuario
/// elige cómo pagar:
///   - "Tarjeta o billetera (MercadoPago)" → returns 'mercadopago'
///   - "Yape (subir comprobante)"          → returns 'yape'
///   - cierra sin elegir                    → returns null
class PlanChoiceSheet extends StatelessWidget {
  const PlanChoiceSheet({super.key});

  /// Abre el sheet y resuelve con el método de pago elegido.
  static Future<String?> show(BuildContext context) {
    return showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => const PlanChoiceSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
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
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.workspace_premium_rounded,
                  color: AppColors.premium, size: 22),
              const SizedBox(width: 8),
              Text(
                'Pagar Plan Premium',
                style: TextStyle(
                    color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Elige cómo quieres pagar tu suscripción Premium. Tu perfil '
            'quedará en revisión mientras validamos el pago.',
            style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 22),
          // ── MercadoPago (tarjeta / billetera) ──
          ElevatedButton.icon(
            onPressed: () => Navigator.of(context).pop('mercadopago'),
            icon: const Icon(Icons.credit_card_rounded, size: 18),
            label: const Text('Pagar con tarjeta o billetera',
                style: TextStyle(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF009EE3), // azul MercadoPago
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 10),
          // ── Yape (comprobante) ──
          ElevatedButton.icon(
            onPressed: () => Navigator.of(context).pop('yape'),
            icon: const Icon(Icons.qr_code_rounded, size: 18),
            label: const Text('Pagar con Yape',
                style: TextStyle(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6D1B7B), // morado Yape
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 6),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Ahora no', style: TextStyle(color: c.textMuted)),
          ),
        ],
      ),
    );
  }
}
