import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import '../../../../provider_dashboard/data/dashboard_repository.dart';
import '../../providers/auth_provider.dart';

/// Diálogos críticos del perfil — logout, reporte de problema y borrado
/// de cuenta. Métodos estáticos para invocar desde la pantalla principal.
class ProfileDialogs {
  const ProfileDialogs._();

  static Future<void> confirmLogout(BuildContext ctx, AuthProvider auth) {
    final c = ctx.colors;
    return showDialog(
      context: ctx,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Cerrar sesión', style: TextStyle(color: c.textPrimary)),
        content: Text(
          '¿Estás seguro de que deseas salir?',
          style: TextStyle(color: c.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(dialogCtx);
              await auth.logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Salir', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  static Future<void> showReportProblem(BuildContext ctx, AuthProvider auth) {
    final c = ctx.colors;
    final ctrl = TextEditingController();
    return showDialog(
      context: ctx,
      builder: (dCtx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Reportar un problema',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: ctrl,
          maxLines: 4,
          style: TextStyle(color: c.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Describe el problema que encontraste...',
            hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
            filled: true,
            fillColor: c.bgInput,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dCtx),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              final text = ctrl.text.trim();
              if (text.length < 5) return;
              try {
                final userId = auth.user?.id;
                if (userId != null) {
                  await DashboardRepository().reportPlatformIssue(
                    userId: userId,
                    description: text,
                  );
                }
                if (dCtx.mounted) {
                  Navigator.pop(dCtx);
                  ctx.showSuccessSnack('Reporte enviado. ¡Gracias por tu ayuda!');
                }
              } catch (_) {}
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.amber,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Enviar',
                style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  static Future<void> confirmDeleteAccount(BuildContext ctx, AuthProvider auth) {
    final c = ctx.colors;
    const red = Color(0xFF991B1B);
    final controller = TextEditingController();
    return showDialog(
      context: ctx,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (_, setS) => AlertDialog(
          backgroundColor: c.bgCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            '¿Eliminar tu cuenta?',
            style: TextStyle(color: red, fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Esta acción es IRREVERSIBLE. Se eliminarán tu cuenta y todos los datos asociados (perfiles, reseñas, favoritos, etc.).\n\nEscribe ELIMINAR para confirmar:',
                style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                onChanged: (_) => setS(() {}),
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Escribe ELIMINAR',
                  hintStyle: TextStyle(color: c.textMuted),
                  filled: true,
                  fillColor: c.bgInput,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
            ),
            ElevatedButton(
              onPressed: controller.text.trim().toUpperCase() == 'ELIMINAR'
                  ? () async {
                      Navigator.pop(dialogCtx);
                      final ok = await auth.deleteAccount();
                      if (!ok && ctx.mounted) {
                        ctx.showErrorSnack('Error al eliminar la cuenta. Inténtalo de nuevo.');
                      }
                    }
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: red,
                disabledBackgroundColor: c.bgCard,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Eliminar cuenta', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
