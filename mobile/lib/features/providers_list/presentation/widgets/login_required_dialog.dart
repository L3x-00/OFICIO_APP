import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/screens/login_screen.dart';

/// Diálogo reusable: aparece cuando un usuario invitado intenta una acción
/// que requiere cuenta (favoritos, reseñas, contacto). Ofrece registrarse o
/// cancelar.
///
/// Bug previo: `Navigator.pop(context)` con el context del árbol caller —
/// con go_router en el shell, eso puede cerrar la ruta padre y dejar el
/// diálogo colgado. Fix: usar el `dialogCtx` del builder; además
/// capturamos el rootNavigator ANTES del pop para que la navegación a
/// /login funcione aunque el context original quede inválido.
void showLoginRequiredDialog(BuildContext context) {
  final c       = context.colors;
  final rootNav = Navigator.of(context, rootNavigator: true);

  showDialog(
    context: context,
    builder: (dialogCtx) => AlertDialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text('Inicia sesión para continuar',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
      content: Text('Necesitas una cuenta para agregar favoritos y dejar reseñas.',
          style: TextStyle(color: c.textSecondary, height: 1.5)),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogCtx).pop(),
          child: Text('Ahora no', style: TextStyle(color: c.textMuted)),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.of(dialogCtx).pop();
            rootNav.push(MaterialPageRoute(
              builder: (_) => const LoginScreen(initialMode: AuthMode.register),
            ));
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: const Text('Registrarme', style: TextStyle(color: Colors.white)),
        ),
      ],
    ),
  );
}
