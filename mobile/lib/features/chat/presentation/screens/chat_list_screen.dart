import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';
import '../../domain/models/chat_room_model.dart';
import '../providers/chat_provider.dart';
import 'chat_screen.dart';

/// Bandeja de entrada — lista de conversaciones del usuario actual.
class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  @override
  void initState() {
    super.initState();
    // Refrescamos al entrar; ChatProvider ya gestiona "no recargar si está cargando"
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ChatProvider>().loadRooms();
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        title: const Text('Mensajes', style: TextStyle(fontWeight: FontWeight.bold)),
        foregroundColor: c.textPrimary,
      ),
      body: Consumer<ChatProvider>(
        builder: (context, chat, _) {
          if (chat.isLoadingRooms && chat.rooms.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (chat.rooms.isEmpty) {
            return _EmptyInbox(c: c);
          }

          return RefreshIndicator(
            onRefresh: () => chat.loadRooms(),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 6),
              itemCount: chat.rooms.length,
              separatorBuilder: (_, _) => Divider(
                color: c.border, height: 1, indent: 76, endIndent: 12,
              ),
              itemBuilder: (_, i) {
                final room = chat.rooms[i];
                final myId = chat.currentUserId ?? -1;
                final other = room.otherParty(myId);
                return _ChatRoomTile(
                  c: c,
                  room: room,
                  other: other,
                  isMine: (room.lastMessage?.senderId ?? -1) == myId,
                  onTap: () => _openRoom(room),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Future<void> _openRoom(ChatRoomSummary room) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChatScreen(roomId: room.id),
      ),
    );
  }
}

class _ChatRoomTile extends StatelessWidget {
  final AppThemeColors c;
  final ChatRoomSummary room;
  final PartyDisplay other;
  final bool isMine;
  final VoidCallback onTap;

  const _ChatRoomTile({
    required this.c,
    required this.room,
    required this.other,
    required this.isMine,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final preview = room.lastMessage?.content ?? 'Sin mensajes';
    final time = _formatTime(room.lastActivityAt);
    final hasUnread = room.unreadCount > 0;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Avatar(c: c, party: other),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          other.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        time,
                        style: TextStyle(
                          color: hasUnread ? AppColors.primary : c.textMuted,
                          fontSize: 11,
                          fontWeight: hasUnread ? FontWeight.w700 : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          isMine && room.lastMessage != null
                              ? 'Tú: $preview'
                              : preview,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: hasUnread ? c.textPrimary : c.textMuted,
                            fontSize: 13,
                            fontWeight: hasUnread ? FontWeight.w600 : FontWeight.w400,
                          ),
                        ),
                      ),
                      if (hasUnread) ...[
                        const SizedBox(width: 8),
                        Container(
                          constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
                          padding: const EdgeInsets.symmetric(horizontal: 7),
                          decoration: BoxDecoration(
                            color: AppColors.busy,
                            borderRadius: BorderRadius.circular(11),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            room.unreadCount > 99 ? '99+' : '${room.unreadCount}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime t) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tDay = DateTime(t.year, t.month, t.day);
    if (tDay == today) {
      // hh:mm
      final h = t.hour.toString().padLeft(2, '0');
      final m = t.minute.toString().padLeft(2, '0');
      return '$h:$m';
    }
    final yesterday = today.subtract(const Duration(days: 1));
    if (tDay == yesterday) return 'Ayer';
    final diff = today.difference(tDay).inDays;
    if (diff < 7) {
      const dows = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      return dows[t.weekday - 1];
    }
    return '${t.day.toString().padLeft(2, '0')}/${t.month.toString().padLeft(2, '0')}';
  }
}

class _Avatar extends StatelessWidget {
  final AppThemeColors c;
  final PartyDisplay party;
  const _Avatar({required this.c, required this.party});

  @override
  Widget build(BuildContext context) {
    final hasUrl = party.avatarUrl != null && party.avatarUrl!.isNotEmpty;
    return Container(
      width: 52, height: 52,
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.15),
        shape: BoxShape.circle,
        border: Border.all(color: c.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: hasUrl
          ? AppNetworkImage(
              url: party.avatarUrl!,
              width: 52, height: 52,
              fit: BoxFit.cover,
              placeholder: _initialsFallback(),
              errorWidget: _initialsFallback(),
            )
          : _initialsFallback(),
    );
  }

  Widget _initialsFallback() {
    final initial = party.title.isNotEmpty ? party.title[0].toUpperCase() : '?';
    return Center(
      child: Text(
        initial,
        style: const TextStyle(
          color: AppColors.primary,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _EmptyInbox extends StatelessWidget {
  final AppThemeColors c;
  const _EmptyInbox({required this.c});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 76, height: 76,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.chat_bubble_outline_rounded, color: AppColors.primary, size: 34),
            ),
            const SizedBox(height: 18),
            Text(
              'Aún no tienes conversaciones',
              style: TextStyle(color: c.textPrimary, fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              'Cuando inicies un chat con un proveedor o un cliente, aparecerá aquí.',
              textAlign: TextAlign.center,
              style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
