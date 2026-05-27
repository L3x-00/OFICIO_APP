import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Modal enriquecido para mostrar una notificación broadcast/push del
/// backend con foto. Se invoca con [NotificationModal.show] desde:
///
///   • [FcmService] / [NotificationHandler] cuando el usuario abre la
///     app tocando una notif en background o terminated.
///   • La pantalla "Alertas" cuando el usuario toca una notif que tiene
///     foto adjunta (típicamente las del admin).
///
/// La imagen se renderiza con [BoxFit.contain] dentro de un contenedor
/// con `maxHeight`. Nunca se recorta — si es vertical queda con barras
/// laterales del color del tema, si es horizontal queda con barras
/// arriba/abajo. Falla silenciosa al icono si la URL no resuelve.
class NotificationModal extends StatelessWidget {
  final String title;
  final String body;
  final String? imageUrl;

  const NotificationModal({
    super.key,
    required this.title,
    required this.body,
    this.imageUrl,
  });

  /// Muestra el modal sobre el navigator de [context]. Idempotente: si
  /// llamás dos veces seguidas con el mismo body, igual abre un dialog
  /// (el caller es responsable de evitar duplicados).
  static Future<void> show(
    BuildContext context, {
    required String title,
    required String body,
    String? imageUrl,
  }) {
    return showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.65),
      builder: (_) =>
          NotificationModal(title: title, body: body, imageUrl: imageUrl),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasImage = imageUrl != null && imageUrl!.isNotEmpty;
    return Dialog(
      backgroundColor: c.bgCard,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (hasImage)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(22),
                ),
                child: Container(
                  // Fondo neutro detrás del `contain` para que las
                  // bandas laterales/verticales armonicen con el tema.
                  color: c.bgInput,
                  constraints: const BoxConstraints(maxHeight: 320),
                  child: Image.network(
                    imageUrl!,
                    fit: BoxFit.contain,
                    width: double.infinity,
                    loadingBuilder: (_, child, progress) {
                      if (progress == null) return child;
                      return SizedBox(
                        height: 200,
                        child: Center(
                          child: CircularProgressIndicator(
                            value: progress.expectedTotalBytes != null
                                ? progress.cumulativeBytesLoaded /
                                      progress.expectedTotalBytes!
                                : null,
                            color: AppColors.amber,
                            strokeWidth: 2,
                          ),
                        ),
                      );
                    },
                    errorBuilder: (_, _, _) => SizedBox(
                      height: 160,
                      child: Center(
                        child: Icon(
                          Icons.broken_image_rounded,
                          color: c.textMuted,
                          size: 40,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
              child: Text(
                title,
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            if (body.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                child: Text(
                  body,
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 14,
                    height: 1.45,
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 10,
                    ),
                  ),
                  child: const Text(
                    'Cerrar',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
