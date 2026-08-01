import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';

/// Botón "Continuar →" al final de una sección de acordeón no-final, para
/// avanzar a la siguiente sección del formulario de onboarding. La decisión
/// de si avanzar o mostrar un error (sección incompleta) vive en el
/// [onPressed] del llamador — este widget solo dibuja el botón.
class OnboardingContinueButton extends StatelessWidget {
  final VoidCallback onPressed;

  const OnboardingContinueButton({super.key, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: TextButton(
        onPressed: onPressed,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Continuar',
              style: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.arrow_forward_rounded,
              size: 18,
              color: AppColors.primary,
            ),
          ],
        ),
      ),
    );
  }
}
