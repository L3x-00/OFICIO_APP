import 'package:flutter/material.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../auth/presentation/providers/auth_provider.dart';
import '../../../data/dashboard_repository.dart';
import '../../providers/dashboard_provider.dart';

/// Familia de diálogos modales del tab de configuración:
///   - [showLogoutDialog]: cierra sesión y devuelve al root.
///   - [showDeleteProfileDialog]: elimina el perfil de proveedor del tipo
///     activo (OFICIO o NEGOCIO) — requiere escribir "ELIMINAR".
///   - [showReportDialog]: abre [ReportProblemDialog] para reportar un
///     problema de plataforma al equipo de soporte.

/// Cierra la sesión del usuario tras confirmación.
Future<void> showLogoutDialog(BuildContext context, AuthProvider auth) async {
  final c = context.colors;
  await showDialog(
    context: context,
    builder: (_) => AlertDialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text(
        'Cerrar sesión',
        style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
      ),
      content: Text(
        '¿Seguro que quieres cerrar sesión en tu panel de profesional?',
        style: TextStyle(color: c.textSecondary),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
        ),
        ElevatedButton(
          onPressed: () async {
            Navigator.pop(context); // cierra el diálogo de confirmación
            await auth.logout();
            if (!context.mounted) return;
            // Limpia todo el stack para que _AppRoot reconstruya desde la pantalla raíz
            Navigator.of(context, rootNavigator: true).popUntil((r) => r.isFirst);
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.busy,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: Text('Cerrar sesión', style: TextStyle(color: Colors.white)),
        ),
      ],
    ),
  );
}

/// Elimina el perfil de proveedor del tipo indicado tras confirmación
/// estricta (el usuario debe escribir "ELIMINAR"). Si era el único perfil,
/// el usuario pasa a ser cliente.
Future<void> showDeleteProfileDialog(
  BuildContext context,
  DashboardProvider dash,
  AuthProvider auth,
  String? profileType,
) async {
  final c = context.colors;
  final isNegocio  = profileType == 'NEGOCIO';
  final typeLabel  = isNegocio ? 'negocio' : 'profesional';
  final hasBoth    = auth.hasOficioProfile && auth.hasNegocioProfile;
  final controller = TextEditingController();

  await showDialog(
    context: context,
    builder: (_) => AlertDialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text(
        'Eliminar perfil de $typeLabel',
        style: const TextStyle(color: AppColors.busy, fontWeight: FontWeight.bold),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Se eliminará permanentemente tu tarjeta, fotos, reseñas y todos los datos de tu perfil de $typeLabel.',
            style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 6),
          Text(
            hasBoth
                ? 'Tu otro perfil se mantendrá activo.'
                : 'Sin perfiles activos pasarás a ser cliente.',
            style: TextStyle(
              color: hasBoth ? c.textSecondary : AppColors.busy,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'Escribe ELIMINAR para confirmar:',
            style: TextStyle(color: c.textSecondary, fontSize: 12),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            style: TextStyle(color: c.textPrimary),
            decoration: InputDecoration(
              hintText: 'ELIMINAR',
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
          onPressed: () => Navigator.pop(context),
          child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
        ),
        ElevatedButton(
          onPressed: () async {
            if (controller.text.trim().toUpperCase() != 'ELIMINAR') return;
            Navigator.pop(context);
            final ok = await dash.deleteProviderProfile();
            if (!context.mounted) return;
            if (ok) {
              await auth.refreshProviderStatus();
              if (!context.mounted) return;
              Navigator.of(context, rootNavigator: true).popUntil((r) => r.isFirst);
            } else {
              context.showErrorSnack(dash.error ?? 'Error al eliminar el perfil');
            }
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.busy,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: const Text('Eliminar', style: TextStyle(color: Colors.white)),
        ),
      ],
    ),
  );
}

/// Abre el diálogo de reporte de problema. Internamente lee
/// [AuthProvider] del contexto y delega el envío a [DashboardRepository].
void showReportDialog(BuildContext context) {
  final c    = context.colors;
  final ctrl = TextEditingController();
  final auth = context.read<AuthProvider>();

  showDialog(
    context: context,
    builder: (ctx) => ReportProblemDialog(
      colors: c,
      ctrl: ctrl,
      onSend: (description) async {
        final userId = auth.user?.id;
        if (userId == null) return;
        await DashboardRepository().reportPlatformIssue(
          userId:      userId,
          description: description,
        );
      },
    ),
  );
}

/// Diálogo de reporte de problema con validación de longitud y feedback
/// de loading mientras se envía al backend.
class ReportProblemDialog extends StatefulWidget {
  final AppThemeColors colors;
  final TextEditingController ctrl;
  final Future<void> Function(String description) onSend;

  const ReportProblemDialog({
    super.key,
    required this.colors,
    required this.ctrl,
    required this.onSend,
  });

  @override
  State<ReportProblemDialog> createState() => _ReportProblemDialogState();
}

class _ReportProblemDialogState extends State<ReportProblemDialog> {
  bool _sending = false;

  @override
  Widget build(BuildContext context) {
    final c = widget.colors;
    return AlertDialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text(
        'Reportar un problema',
        style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
      ),
      content: TextField(
        controller: widget.ctrl,
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
          onPressed: _sending ? null : () => Navigator.pop(context),
          child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
        ),
        ElevatedButton(
          onPressed: _sending ? null : _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.amber,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: _sending
              ? const SizedBox(
                  width: 16, height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                )
              : const Text('Enviar', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Future<void> _submit() async {
    final text = widget.ctrl.text.trim();
    if (text.length < 5) {
      context.showWarningSnack('Describe el problema con más detalle.');
      return;
    }
    setState(() => _sending = true);
    try {
      await widget.onSend(text);
      if (!mounted) return;
      Navigator.pop(context);
      context.showSuccessSnack('Reporte enviado. ¡Gracias por ayudarnos a mejorar!');
    } catch (_) {
      if (!mounted) return;
      setState(() => _sending = false);
      context.showErrorSnack('No se pudo enviar el reporte. Intenta de nuevo.');
    }
  }
}
