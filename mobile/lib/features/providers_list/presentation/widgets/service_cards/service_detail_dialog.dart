import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../../provider_dashboard/domain/models/service_item_model.dart';

/// Dialog flotante con el detalle de un servicio/producto del provider.
/// Se invoca via [ServiceDetailDialog.show] desde un chip de la tarjeta.
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

  static Future<void> show(BuildContext context, {
    required ServiceItem service,
    required bool isNegocio,
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
      await showDialog<void>(
        context: context,
        barrierColor: Colors.black.withValues(alpha: 0.55),
        builder: (ctx) {
          dialogCtx = ctx;
          return Dialog(
            backgroundColor: c.bgCard,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
            insetPadding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
            child: _DialogBody(service: service, isNegocio: isNegocio, c: c),
          );
        },
      );
    } finally {
      _activeDismiss = null;
    }
  }
}

class _DialogBody extends StatelessWidget {
  final ServiceItem service;
  final bool isNegocio;
  final AppThemeColors c;
  const _DialogBody({
    required this.service,
    required this.isNegocio,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    final accent = isNegocio ? AppColors.amber : AppColors.primary;
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 380),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Imagen del servicio (si existe).
          if (service.imageUrl != null && service.imageUrl!.isNotEmpty)
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  service.imageUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    color: c.bgInput,
                    alignment: Alignment.center,
                    child: Icon(
                      isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                      color: accent,
                      size: 40,
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
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: accent.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    service.priceLabel,
                    style: TextStyle(
                      color: accent,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (service.description != null && service.description!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    service.description!,
                    style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4),
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
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Cerrar'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
