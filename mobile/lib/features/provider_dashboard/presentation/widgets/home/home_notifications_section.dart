import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../data/dashboard_repository.dart';

/// Sección de notificaciones del proveedor (máx. 5 visibles). Tocar una no
/// leída dispara [onMarkRead] con su id.
class HomeNotificationsSection extends StatelessWidget {
  final List<ProviderNotification> notifications;
  final int unread;
  final ValueChanged<int> onMarkRead;

  const HomeNotificationsSection({
    super.key,
    required this.notifications,
    required this.unread,
    required this.onMarkRead,
  });

  @override
  Widget build(BuildContext context) {
    if (notifications.isEmpty) return const SizedBox.shrink();
    final c = context.colors;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Notificaciones',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (unread > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.amber,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$unread',
                    style: TextStyle(
                      color: AppColors.onSolid(AppColors.amber),
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          ...notifications.take(5).map((n) {
            final color = _colorForType(n.type);
            final isUnread = !n.isRead;
            return GestureDetector(
              onTap: () {
                if (isUnread) onMarkRead(n.id);
              },
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isUnread ? color.withValues(alpha: 0.08) : c.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isUnread ? color.withValues(alpha: 0.35) : c.border,
                    width: 0.5,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        _iconForType(n.type),
                        color: AppColors.tintOn(color, c.isDark),
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                _labelForType(n.type),
                                style: TextStyle(
                                  color: AppColors.tintOn(color, c.isDark),
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (isUnread) ...[
                                const SizedBox(width: 6),
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                              const Spacer(),
                              Text(
                                _formatNotifDate(n.sentAt),
                                style: TextStyle(
                                  color: c.textMuted,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            n.message,
                            style: TextStyle(
                              color: c.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

// ── Helpers de tipo de notificación ──────────────────────────

Color _colorForType(String type) {
  switch (type) {
    case 'APROBADO':
      return AppColors.available;
    case 'RECHAZADO':
      return AppColors.busy;
    case 'VERIFICACION_REVOCADA':
      return AppColors.delayed;
    case 'MAS_INFO':
    default:
      return AppColors.primary;
  }
}

IconData _iconForType(String type) {
  switch (type) {
    case 'APROBADO':
      return Icons.verified_rounded;
    case 'RECHAZADO':
      return Icons.cancel_rounded;
    case 'VERIFICACION_REVOCADA':
      return Icons.remove_circle_rounded;
    case 'MAS_INFO':
    default:
      return Icons.info_rounded;
  }
}

String _labelForType(String type) {
  switch (type) {
    case 'APROBADO':
      return 'Aprobado';
    case 'RECHAZADO':
      return 'Rechazado';
    case 'VERIFICACION_REVOCADA':
      return 'Verificación revocada';
    case 'MAS_INFO':
    default:
      return 'Más información';
  }
}

String _formatNotifDate(DateTime dt) {
  final now = DateTime.now();
  final diff = now.difference(dt);
  if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes}m';
  if (diff.inHours < 24) return 'Hace ${diff.inHours}h';
  if (diff.inDays < 7) return 'Hace ${diff.inDays}d';
  return '${dt.day}/${dt.month}/${dt.year}';
}
