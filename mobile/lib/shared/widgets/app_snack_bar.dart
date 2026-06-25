import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/theme/app_theme_colors.dart';

/// Extensión de BuildContext para mostrar SnackBars modernos y consistentes.
///
/// Uso:
///   context.showErrorSnack('Correo o contraseña incorrectos');
///   context.showSuccessSnack('Perfil actualizado');
///   context.showWarningSnack('Acepta los términos para continuar');
///   context.showInfoSnack('Verificando tus datos...');
extension AppSnackBarX on BuildContext {
  void showErrorSnack(String message) => _show(
    message,
    icon: Icons.error_outline_rounded,
    color: AppColors.busy,
    duration: const Duration(seconds: 4),
  );

  void showSuccessSnack(String message) => _show(
    message,
    icon: Icons.check_circle_outline_rounded,
    color: AppColors.available,
    duration: const Duration(seconds: 3),
  );

  void showWarningSnack(String message) => _show(
    message,
    icon: Icons.warning_amber_rounded,
    color: AppColors.amber,
    duration: const Duration(seconds: 3),
  );

  void showInfoSnack(String message) => _show(
    message,
    icon: Icons.info_outline_rounded,
    color: AppColors.primary,
    duration: const Duration(seconds: 3),
  );

  void _show(
    String message, {
    required IconData icon,
    required Color color,
    required Duration duration,
  }) {
    final messenger = ScaffoldMessenger.of(this);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.transparent,
        elevation: 0,
        padding: EdgeInsets.zero,
        duration: duration,
        dismissDirection: DismissDirection.down,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 20),
        content: _AppSnackContent(
          message: message,
          icon: icon,
          color: color,
          onDismiss: messenger.hideCurrentSnackBar,
        ),
      ),
    );
  }
}

class _AppSnackContent extends StatelessWidget {
  const _AppSnackContent({
    required this.message,
    required this.icon,
    required this.color,
    required this.onDismiss,
  });

  final String message;
  final IconData icon;
  final Color color;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    // Glifo del acento legible sobre su propio tinte/superficie (AA en claro).
    final accentOnSurface = AppColors.tintOn(color, colors.isDark);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
        // Tarjeta de tema con un velo del acento (suave y cálido).
        color: Color.lerp(colors.bgCard, color, colors.isDark ? 0.14 : 0.07),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.30), width: 0.5),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.12),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: colors.isDark ? 0.30 : 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, color: accentOnSurface, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: colors.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w500,
                height: 1.4,
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: onDismiss,
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Icon(
                Icons.close_rounded,
                color: colors.textMuted,
                size: 18,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
