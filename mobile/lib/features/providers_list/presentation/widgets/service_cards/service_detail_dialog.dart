import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../../provider_dashboard/domain/models/service_item_model.dart';
import '../../../../auth/presentation/providers/auth_provider.dart';
import '../../../../chat/presentation/providers/chat_provider.dart';
import '../../../../chat/presentation/screens/chat_screen.dart';
import '../../../domain/models/provider_model.dart';

/// Dialog flotante con el detalle de un servicio/producto del provider.
/// Se invoca via [ServiceDetailDialog.show] desde un chip de la tarjeta
/// o desde la lista de servicios del detalle del proveedor.
///
/// Se cierra automáticamente al cambiar de tab — AppShell mantiene una
/// referencia al pop callback en `_activeDismiss` y la dispara antes de
/// `goBranch`. Sin esto el dialog permanecía visible sobre el siguiente
/// tab al volver la tarjeta del provider.
class ServiceDetailDialog {
  ServiceDetailDialog._();

  static VoidCallback? _activeDismiss;

  /// Cierra el dialog activo si lo hay. Llamado por AppShell._onTabTapped.
  static void dismissActive() {
    final dismiss = _activeDismiss;
    if (dismiss != null) {
      _activeDismiss = null;
      dismiss();
    }
  }

  static Future<void> show(
    BuildContext context, {
    required ServiceItem service,
    required bool isNegocio,
    required ProviderModel provider,
  }) async {
    final c = context.colors;
    BuildContext? dialogCtx;
    _activeDismiss?.call();
    _activeDismiss = () {
      if (dialogCtx != null && dialogCtx!.mounted) {
        Navigator.of(dialogCtx!).pop();
      }
    };
    try {
      await showGeneralDialog<void>(
        context: context,
        barrierDismissible: true,
        barrierLabel: 'Detalle',
        barrierColor: Colors.black.withValues(alpha: 0.55),
        transitionDuration: const Duration(milliseconds: 240),
        // 2.3 — apertura fade + scale suave (easeOutCubic).
        transitionBuilder: (ctx, anim, _, child) {
          final curved = CurvedAnimation(
            parent: anim,
            curve: Curves.easeOutCubic,
            reverseCurve: Curves.easeInCubic,
          );
          return FadeTransition(
            opacity: curved,
            child: ScaleTransition(
              scale: Tween<double>(begin: 0.94, end: 1.0).animate(curved),
              child: child,
            ),
          );
        },
        pageBuilder: (ctx, _, _) {
          dialogCtx = ctx;
          return Dialog(
            backgroundColor: c.bgCard,
            // Borde fino y sombra sutil — premium artesanal.
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(color: c.border, width: 0.5),
            ),
            elevation: 0,
            insetPadding: const EdgeInsets.symmetric(
              horizontal: 28,
              vertical: 24,
            ),
            child: _DialogBody(
              service: service,
              isNegocio: isNegocio,
              provider: provider,
              c: c,
            ),
          );
        },
      );
    } finally {
      _activeDismiss = null;
    }
  }
}

class _DialogBody extends StatefulWidget {
  final ServiceItem service;
  final bool isNegocio;
  final ProviderModel provider;
  final AppThemeColors c;
  const _DialogBody({
    required this.service,
    required this.isNegocio,
    required this.provider,
    required this.c,
  });

  @override
  State<_DialogBody> createState() => _DialogBodyState();
}

class _DialogBodyState extends State<_DialogBody> {
  bool _opening = false;

  ServiceItem get service => widget.service;
  bool get isNegocio => widget.isNegocio;
  ProviderModel get provider => widget.provider;

  /// Abre el chat con el proveedor y precarga un mensaje predeterminado
  /// preguntando por este servicio/producto. Funciona para OFICIO y NEGOCIO.
  Future<void> _consultarPrecio() async {
    if (_opening) return;
    final auth = context.read<AuthProvider>();
    if (auth.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Inicia sesión para consultar al proveedor'),
        ),
      );
      return;
    }
    setState(() => _opening = true);
    final chat = context.read<ChatProvider>();
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final roomId = await chat.openRoom(
        clientId: auth.user!.id,
        providerId: provider.id,
      );
      final tipo = isNegocio ? 'producto' : 'servicio';
      final draft =
          'Hola, ${provider.businessName}, quisiera saber más sobre el '
          '$tipo "${service.name}".';
      navigator.pop(); // cierra el dialog
      navigator.push(
        MaterialPageRoute(
          builder: (_) => ChatScreen(
            roomId: roomId,
            seedTitle: provider.businessName,
            seedAvatarUrl: provider.coverImageUrl,
            initialDraft: draft,
          ),
        ),
      );
    } catch (e) {
      if (mounted) setState(() => _opening = false);
      messenger.showSnackBar(
        SnackBar(content: Text('No se pudo abrir el chat: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    // Acento por tipo. El dorado a plena saturación se lava sobre la crema en
    // tema claro → usar amberDark para texto/íconos pequeños. El fill del botón
    // sí usa el amber pleno (con glifo oscuro cálido encima, ver más abajo).
    final accentFill = isNegocio ? AppColors.amber : AppColors.primary;
    final accentText = isNegocio
        ? (c.isDark ? AppColors.amber : AppColors.amberDark)
        : AppColors.primary;
    // NEGOCIO: glifo oscuro cálido sobre dorado (≈5-6:1). OFICIO: blanco sobre
    // azul profundo (≥4.5:1). Nunca blanco sobre pastel.
    final onAccent = isNegocio ? AppColors.amberDeep : Colors.white;
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 380),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Imagen del servicio (si existe). Usamos `contain` sobre un
          // fondo neutro para que la foto se vea COMPLETA — antes con
          // `cover` se recortaban los extremos (típico de fotos
          // verticales que el usuario sube desde celular).
          if (service.imageUrl != null && service.imageUrl!.isNotEmpty)
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(20),
              ),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Container(
                  color: c.bgInput,
                  child: Image.network(
                    service.imageUrl!,
                    fit: BoxFit.contain,
                    errorBuilder: (_, _, _) => Container(
                      color: c.bgInput,
                      alignment: Alignment.center,
                      child: Icon(
                        isNegocio
                            ? Icons.inventory_2_rounded
                            : Icons.design_services_rounded,
                        color: accentText,
                        size: 40,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  service.name,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: accentFill.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: accentFill.withValues(alpha: 0.28),
                      width: 0.5,
                    ),
                  ),
                  child: Text(
                    service.priceLabel,
                    style: TextStyle(
                      color: AppColors.tintOn(accentFill, c.isDark),
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (service.description != null &&
                    service.description!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    service.description!,
                    style: TextStyle(
                      color: c.textSecondary,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ],
                if (service.phone != null && service.phone!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(Icons.phone_outlined, color: c.textMuted, size: 14),
                      const SizedBox(width: 6),
                      Text(
                        service.phone!,
                        style: TextStyle(color: c.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 18),
                // ── Acciones: Cerrar + Consultar precio (→ chat) ──
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: _opening
                            ? null
                            : () => Navigator.of(context).pop(),
                        child: Text(
                          'Cerrar',
                          style: TextStyle(color: c.textMuted),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton.icon(
                        onPressed: _opening ? null : _consultarPrecio,
                        icon: _opening
                            ? SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: onAccent,
                                ),
                              )
                            : const Icon(Icons.forum_rounded, size: 16),
                        label: const Text('Consultar precio'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: accentFill,
                          foregroundColor: onAccent,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
