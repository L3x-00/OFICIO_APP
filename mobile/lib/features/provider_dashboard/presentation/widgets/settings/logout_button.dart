import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';

/// Botón outline "Cerrar sesión" en color busy (rojo). La acción concreta
/// vive en el `onTap` que se pasa (típicamente `showLogoutDialog`).
class LogoutButton extends StatelessWidget {
  final VoidCallback onTap;
  const LogoutButton({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(Icons.logout_rounded, size: 18),
        label: Text('Cerrar sesión'),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.busy,
          side: const BorderSide(color: AppColors.busy),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }
}
