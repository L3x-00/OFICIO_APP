import 'package:flutter/material.dart';
import '../../../../../core/constans/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../providers_list/presentation/widgets/upsell_sheet.dart';
import '../../../domain/models/dashboard_profile_model.dart';

/// Preview de cómo los clientes ven los botones de contacto en la tarjeta
/// del proveedor.
///
///   1) Plan GRATIS — WhatsApp y llamada aparecen bloqueados con candado;
///      al tocarlos abre el upsell sheet.
///   2) ESTANDAR/PREMIUM — aparecen activos como confirmación.
/// El chat interno siempre está activo (no depende de plan).
class HomeContactPreview extends StatelessWidget {
  final DashboardProfileModel? profile;

  const HomeContactPreview({super.key, required this.profile});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (profile == null) return const SizedBox.shrink();
    final plan = profile!.subscription?.plan ?? 'GRATIS';
    final isPaid = plan == 'PREMIUM' || plan == 'ESTANDAR';

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: c.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.visibility_rounded, color: AppColors.primary, size: 16),
                const SizedBox(width: 6),
                Text(
                  'Vista pública de tu tarjeta',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Spacer(),
                if (!isPaid)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.amber.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.amber.withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      'GRATIS',
                      style: TextStyle(
                        color: AppColors.amber,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              isPaid
                  ? 'Tus clientes ven estos botones activos.'
                  : 'Mejora tu plan para activar WhatsApp y llamada.',
              style: TextStyle(color: c.textMuted, fontSize: 11.5, height: 1.35),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ContactPreviewIcon(
                    icon: Icons.forum_rounded,
                    color: AppColors.amber,
                    locked: false,
                    onTap: null, // chat siempre disponible — sin acción aquí
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ContactPreviewIcon(
                    icon: Icons.chat_rounded,
                    color: AppColors.whatsapp,
                    locked: !isPaid,
                    onTap: isPaid
                        ? null
                        : () => UpsellContactSheet.show(context, channel: 'WhatsApp'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ContactPreviewIcon(
                    icon: Icons.call_rounded,
                    color: AppColors.call,
                    locked: !isPaid,
                    onTap: isPaid
                        ? null
                        : () => UpsellContactSheet.show(context, channel: 'llamadas'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Botón de preview de contacto: ícono con overlay candado opcional.
/// Cuando `locked` es true se pinta un candado superpuesto y, al tocar,
/// se invoca `onTap` (típicamente abre el upsell sheet). Cuando no está
/// bloqueado, se muestra activo en su color de marca.
class ContactPreviewIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final bool locked;
  final VoidCallback? onTap;
  const ContactPreviewIcon({
    super.key,
    required this.icon,
    required this.color,
    required this.locked,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dimmed = locked ? c.textMuted : color;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: (locked ? c.textMuted : color).withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: (locked ? c.textMuted : color).withValues(alpha: 0.3)),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(icon, color: dimmed, size: 22),
            if (locked)
              Positioned(
                right: -2,
                bottom: -2,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: AppColors.amber,
                    shape: BoxShape.circle,
                    border: Border.all(color: c.bgCard, width: 1.5),
                  ),
                  child: const Icon(Icons.lock_rounded, color: Colors.white, size: 10),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
