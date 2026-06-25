import 'package:flutter/material.dart';
import '../../../../../../core/constants/app_colors.dart';
import '../../../../../../core/theme/app_theme_colors.dart';

/// Diálogo de éxito tras crear el perfil de proveedor. El callback
/// `onAccept` se dispara cuando el usuario pulsa "Ir al inicio" — el
/// caller decide qué hacer (completeOnboarding + popUntil, etc.).
class RegistrationSuccessDialog extends StatelessWidget {
  final bool isNegocio;
  final VoidCallback onAccept;

  const RegistrationSuccessDialog({
    super.key,
    required this.isNegocio,
    required this.onAccept,
  });

  static Future<void> show(
    BuildContext context, {
    required bool isNegocio,
    required VoidCallback onAccept,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) =>
          RegistrationSuccessDialog(isNegocio: isNegocio, onAccept: onAccept),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Dialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: AppColors.available.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isNegocio ? Icons.storefront_rounded : Icons.handyman_rounded,
                color: AppColors.tintOn(AppColors.available, c.isDark),
                size: 44,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              isNegocio
                  ? '¡Negocio Registrado!'
                  : '¡Perfil Profesional Creado!',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              isNegocio
                  ? 'Negocio creado con éxito. Se te notificará una vez que sea aprobado por el equipo.'
                  : 'Tu perfil está siendo revisado. Te notificaremos cuando esté aprobado.',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 14,
                height: 1.6,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  onAccept();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Ir al inicio',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
