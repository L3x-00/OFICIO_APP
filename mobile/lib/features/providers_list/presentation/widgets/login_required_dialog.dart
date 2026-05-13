import 'package:flutter/material.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/screens/login_screen.dart';

/// Diálogo reusable: aparece cuando un usuario invitado intenta una acción
/// que requiere cuenta (favoritos, reseñas, contacto). Ofrece registrarse o
/// cancelar.
void showLoginRequiredDialog(BuildContext context) {
  final c = context.colors;
  showDialog(
    context: context,
    builder: (_) => AlertDialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text('Inicia sesión para continuar',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
      content: Text('Necesitas una cuenta para agregar favoritos y dejar reseñas.',
          style: TextStyle(color: c.textSecondary, height: 1.5)),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Ahora no', style: TextStyle(color: c.textMuted)),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            Navigator.of(context).push(MaterialPageRoute(
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
