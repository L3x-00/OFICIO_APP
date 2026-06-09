import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/notification_modal.dart';
import 'package:provider/provider.dart';
import '../providers/notifications_provider.dart';
import '../../domain/models/notification_model.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/presentation/screens/login_screen.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth = context.watch<AuthProvider>();
    final notifs = context.watch<NotificationsProvider>();

    final isLoggedIn = auth.isAuthenticated;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        title: Text(
          'Notificaciones',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
        ),
        actions: [
          if (isLoggedIn && notifs.unreadCount > 0)
            TextButton(
              onPressed: () => notifs.markAllRead(),
              child: const Text(
                'Marcar todas leídas',
                style: TextStyle(color: AppColors.primary, fontSize: 12),
              ),
            ),
        ],
      ),
      body: !isLoggedIn
          ? const _GuestBody(
              icon: Icons.notifications_none_rounded,
              iconColor: Color.fromARGB(176, 220, 226, 34),
              title: 'Mantente al tanto',
              message:
                  'Regístrate o inicia sesión para recibir notificaciones sobre tus servicios, ofertas y actualizaciones.',
            )
          : notifs.items.isEmpty
          ? _buildEmpty(c)
          : Column(
              children: [
                _retentionBanner(c),
                Expanded(
                  child: RefreshIndicator(
                    color: const Color.fromARGB(176, 246, 255, 0),
                    onRefresh: () async => {},
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: notifs.items.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 2),
                      itemBuilder: (_, i) =>
                          _NotificationTile(notification: notifs.items[i]),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildEmpty(AppThemeColors c) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.notifications_off_outlined,
                color: c.textMuted.withValues(alpha: 0.5),
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Sin notificaciones',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Por ahora no tienes avisos nuevos.\nTe avisaremos cuando algo ocurra.',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 13,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  /// Aviso de retención — las notificaciones se purgan a los 5 días
  /// (cron `pruneOldNotifications` del backend, NOTIFICATION_RETENTION_DAYS).
  Widget _retentionBanner(AppThemeColors c) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(12, 10, 12, 4),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.amber.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.amber.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.schedule_rounded, color: AppColors.amber, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Las notificaciones se eliminan automáticamente después de 5 días.',
              style: TextStyle(color: c.textSecondary, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Estado invitado reutilizable (Idéntico a Favoritos) ──────────────────────────
class _GuestBody extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String message;

  const _GuestBody({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 36),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 40),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              message,
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 14,
                height: 1.6,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                // rootNavigator: el login debe salir del shell del
                // cliente para no dejar visible la bottom nav debajo.
                onPressed: () => Navigator.of(
                  context,
                  rootNavigator: true,
                ).push(MaterialPageRoute(builder: (_) => const LoginScreen())),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text(
                  'Iniciar sesión / Registrarse',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  const _NotificationTile({required this.notification});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final notifs = context.read<NotificationsProvider>();

    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: AppColors.busy.withValues(alpha: 0.15),
        child: const Icon(Icons.delete_outline_rounded, color: AppColors.busy),
      ),
      onDismissed: (_) => notifs.dismiss(notification.id),
      child: InkWell(
        onTap: () {
          notifs.markRead(notification.id);
          // Si la notif trae imagen o es un broadcast del admin, el
          // tap general abre el modal enriquecido con la foto completa.
          // Los chips de acción rápida (Ir al chat, Ver detalles…) que
          // viven debajo del cuerpo del tile siguen siendo
          // independientes — ya manejan su propio `onTap`.
          final hasImage =
              notification.imageUrl != null &&
              notification.imageUrl!.isNotEmpty;
          final isBroadcast = notification.type == 'BROADCAST';
          if (hasImage || isBroadcast) {
            NotificationModal.show(
              context,
              title: notification.title,
              body: notification.body,
              imageUrl: notification.imageUrl,
            );
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          color: notification.isRead
              ? Colors.transparent
              : AppColors.primary.withValues(alpha: 0.05),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Si la notif trae avatarUrl (caso CHAT_MESSAGE con foto
              // del remitente), mostramos la foto en vez del icono
              // genérico — UX solicitada por el user.
              if (notification.avatarUrl != null &&
                  notification.avatarUrl!.isNotEmpty)
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: notification.iconColor.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Image.network(
                    notification.avatarUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Icon(
                      notification.icon,
                      color: notification.iconColor,
                      size: 20,
                    ),
                  ),
                )
              else
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: notification.iconColor.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    notification.icon,
                    color: notification.iconColor,
                    size: 20,
                  ),
                ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 14,
                              fontWeight: notification.isRead
                                  ? FontWeight.normal
                                  : FontWeight.bold,
                            ),
                          ),
                        ),
                        if (!notification.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      notification.body,
                      style: TextStyle(
                        color: c.textSecondary,
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatTime(notification.createdAt),
                      style: TextStyle(color: c.textMuted, fontSize: 11),
                    ),
                    // Botones de acción contextuales — solo se muestran
                    // cuando el `type` tiene un destino útil. Sin
                    // `actionData` (notif persistida) caemos a una ruta
                    // de inbox por tipo (ej. /chats en vez de /chat/:id).
                    ..._buildActions(context, notification),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Devuelve `[]` si el tipo no tiene acción asociada — el tile se ve
  /// idéntico a antes. Si hay acción, agrega un spacing + chip "→ Ir...".
  List<Widget> _buildActions(BuildContext context, AppNotification n) {
    final action = _resolveAction(n);
    if (action == null) return const [];
    return [
      const SizedBox(height: 8),
      Align(
        alignment: Alignment.centerLeft,
        child: _NotifActionChip(
          label: action.label,
          color: n.iconColor,
          onTap: () {
            // Marca leído antes de navegar — UX común en bandejas.
            context.read<NotificationsProvider>().markRead(n.id);
            context.push(action.route);
          },
        ),
      ),
    ];
  }

  /// Resuelve el botón a mostrar según el tipo + actionData disponible.
  /// `null` significa "no mostrar botón".
  _NotifAction? _resolveAction(AppNotification n) {
    final data = n.actionData ?? const <String, dynamic>{};
    int? asInt(Object? v) => v is int ? v : int.tryParse(v?.toString() ?? '');
    switch (n.type) {
      case 'CHAT_MESSAGE':
        final roomId = asInt(data['chatRoomId']) ?? asInt(data['roomId']);
        return _NotifAction(
          label: 'Ir al chat',
          route: roomId != null ? '/chat/$roomId' : '/chats',
        );
      case 'NEW_OFFER':
      case 'OFFER_ACCEPTED':
      case 'OFERTA_ACEPTADA':
      case 'NUEVA_OPORTUNIDAD':
        return const _NotifAction(label: 'Ver detalles', route: '/my-requests');
      case 'NEW_REVIEW':
      case 'REVIEW_REPLY':
        return const _NotifAction(label: 'Ver reseña', route: '/profile');
      default:
        return null;
    }
  }

  String _formatTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Ahora mismo';
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Hace ${diff.inHours} h';
    if (diff.inDays == 1) return 'Ayer';
    return 'Hace ${diff.inDays} días';
  }
}

/// Pair label + route que `_resolveAction` produce; no salimos del file.
class _NotifAction {
  final String label;
  final String route;
  const _NotifAction({required this.label, required this.route});
}

/// Chip clicable estilo `Ir al chat →` — usa el color del icono de la
/// notif para mantener coherencia visual con el tile.
class _NotifActionChip extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _NotifActionChip({
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.arrow_forward_rounded, color: color, size: 12),
          ],
        ),
      ),
    );
  }
}
