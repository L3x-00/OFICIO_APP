import 'package:flutter/material.dart';

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
        color: const Color(0xFFEF4444),
        duration: const Duration(seconds: 4),
      );

  void showSuccessSnack(String message) => _show(
        message,
        icon: Icons.check_circle_outline_rounded,
        color: const Color(0xFF10B981),
        duration: const Duration(seconds: 3),
      );

  void showWarningSnack(String message) => _show(
        message,
        icon: Icons.warning_amber_rounded,
        color: const Color(0xFFF59E0B),
        duration: const Duration(seconds: 3),
      );

  void showInfoSnack(String message) => _show(
        message,
        icon: Icons.info_outline_rounded,
        color: const Color(0xFF3B82F6),
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color.lerp(const Color(0xFF161622), color, 0.18)!,
            Color.lerp(const Color(0xFF1E1E2C), color, 0.10)!,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.30), width: 1),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.18),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.30),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFFF1F5F9),
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
                color: const Color(0xFFF1F5F9).withValues(alpha: 0.50),
                size: 18,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
