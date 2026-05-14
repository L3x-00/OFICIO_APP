import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../payments/presentation/screens/plan_selector_sheet.dart';

/// Bottom sheet de upsell que se abre cuando el usuario (proveedor en
/// plan GRATIS) toca un ícono de contacto bloqueado en su propio panel.
///
/// Lista los beneficios de salir del plan GRATIS y ofrece un único CTA
/// que navega al `PlanSelectorSheet`.
class UpsellContactSheet extends StatelessWidget {
  /// Etiqueta del canal bloqueado (ej. 'WhatsApp', 'llamadas'). Se usa
  /// en el copy del título secundario.
  final String channel;
  const UpsellContactSheet._({required this.channel});

  static Future<void> show(BuildContext context, {required String channel}) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => UpsellContactSheet._(channel: channel),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            22, 14, 22,
            MediaQuery.of(context).padding.bottom + 18,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: c.textMuted.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Header: candado dorado + título
              Row(
                children: [
                  Container(
                    width: 56, height: 56,
                    decoration: BoxDecoration(
                      color: AppColors.amber.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.amber.withValues(alpha: 0.35), width: 1.5),
                    ),
                    child: const Icon(Icons.lock_open_rounded, color: AppColors.amber, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '¡Desbloquea contacto directo!',
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Tus clientes pueden alcanzarte por $channel sin pasar por el chat.',
                          style: TextStyle(color: c.textSecondary, fontSize: 12.5, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),

              // Lista de beneficios
              _Benefit(icon: Icons.chat_rounded,        color: AppColors.whatsapp, text: 'Botón de WhatsApp activo en tu tarjeta', c: c),
              _Benefit(icon: Icons.call_rounded,        color: AppColors.call,     text: 'Botón de llamada directa a tu número',   c: c),
              _Benefit(icon: Icons.trending_up_rounded, color: AppColors.amber,    text: 'Apareces antes en los resultados',        c: c),
              _Benefit(icon: Icons.verified_rounded,    color: AppColors.verified, text: 'Insignia de plan visible al cliente',     c: c),

              const SizedBox(height: 24),

              // CTA
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    PlanSelectorSheet.show(context);
                  },
                  icon: const Icon(Icons.arrow_upward_rounded, size: 18),
                  label: const Text(
                    'Subir de plan',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Center(
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(
                    'Ahora no',
                    style: TextStyle(color: c.textMuted, fontSize: 13),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Benefit extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String text;
  final AppThemeColors c;
  const _Benefit({required this.icon, required this.color, required this.text, required this.c});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: c.textPrimary, fontSize: 13.5, height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}
