import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../../shared/widgets/app_network_image.dart';
import '../../../../chat/domain/models/chat_room_model.dart';

/// Últimas 2 conversaciones del proveedor en el Inicio (FASE 2 · #4).
///
/// Cada fila resuelve la contraparte con [ChatRoomSummary.otherParty] y
/// muestra su último mensaje. Tap abre la sala vía [onOpen]; "Ver todas →"
/// lleva al tab Mensajes (índice 5) vía [onViewAll]. El home filtra/ordena
/// y pasa solo los 2 más recientes.
class HomeRecentChats extends StatelessWidget {
  final int myUserId;
  final List<ChatRoomSummary> rooms;
  final void Function(ChatRoomSummary) onOpen;
  final VoidCallback onViewAll;

  const HomeRecentChats({
    super.key,
    required this.myUserId,
    required this.rooms,
    required this.onOpen,
    required this.onViewAll,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Conversaciones recientes',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (rooms.isNotEmpty)
                TextButton(
                  onPressed: onViewAll,
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'Ver todas →',
                    style: TextStyle(color: AppColors.amber, fontSize: 13),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (rooms.isEmpty)
            _Empty(onTap: onViewAll)
          else
            ...rooms.map(
              (r) =>
                  _ChatRow(room: r, myUserId: myUserId, onTap: () => onOpen(r)),
            ),
        ],
      ),
    );
  }
}

class _ChatRow extends StatelessWidget {
  final ChatRoomSummary room;
  final int myUserId;
  final VoidCallback onTap;
  const _ChatRow({
    required this.room,
    required this.myUserId,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final other = room.otherParty(myUserId);
    final name = other.title.isNotEmpty ? other.title : 'Cliente';
    final preview = room.lastMessage?.content.trim().isNotEmpty == true
        ? room.lastMessage!.content.trim()
        : 'Sin mensajes aún';
    final hasAvatar = other.avatarUrl != null && other.avatarUrl!.isNotEmpty;
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final unread = room.unreadCount > 0;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              clipBehavior: Clip.antiAlias,
              child: hasAvatar
                  ? AppNetworkImage(
                      url: other.avatarUrl!,
                      width: 44,
                      height: 44,
                      fit: BoxFit.cover,
                      placeholder: _initialAvatar(initial),
                      errorWidget: _initialAvatar(initial),
                    )
                  : _initialAvatar(initial),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    preview,
                    style: TextStyle(
                      color: unread ? c.textPrimary : c.textMuted,
                      fontSize: 12,
                      fontWeight: unread ? FontWeight.w600 : FontWeight.normal,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  _relativeTime(room.lastActivityAt),
                  style: TextStyle(color: c.textMuted, fontSize: 10.5),
                ),
                if (unread) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 1,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.busy,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      room.unreadCount > 9 ? '9+' : '${room.unreadCount}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _initialAvatar(String initial) => Center(
    child: Text(
      initial,
      style: const TextStyle(
        color: AppColors.primary,
        fontSize: 17,
        fontWeight: FontWeight.bold,
      ),
    ),
  );

  /// Etiqueta relativa simple: "ahora", "Nm", "Nh", "Nd" o fecha corta.
  /// No usa Date.now en horario de servidor — solo diferencia local.
  String _relativeTime(DateTime t) {
    final diff = DateTime.now().difference(t);
    if (diff.inMinutes < 1) return 'ahora';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${t.day}/${t.month}';
  }
}

class _Empty extends StatelessWidget {
  final VoidCallback onTap;
  const _Empty({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        children: [
          Icon(Icons.forum_outlined, color: c.textMuted, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Aún no tienes conversaciones. Cuando un cliente te escriba, '
              'aparecerá aquí.',
              style: TextStyle(color: c.textMuted, fontSize: 12, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
