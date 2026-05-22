import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';
import '../../domain/models/chat_message_model.dart';
import '../../domain/models/chat_room_model.dart';
import '../providers/chat_provider.dart';

/// Pantalla de conversación.
/// Marca como leídos los mensajes recibidos en `initState` y se mantiene
/// como sala "activa" mientras está montada (los mensajes nuevos entran
/// como leídos en lugar de incrementar el badge).
class ChatScreen extends StatefulWidget {
  final int roomId;
  /// Nombre del otro participante a mostrar mientras `chat.rooms` no
  /// tiene aún la sala cacheada (chat recién creado desde la pantalla
  /// principal). Antes el AppBar mostraba "Conversación" / "..." sin
  /// info, viéndose roto hasta que el inbox se cargaba.
  final String? seedTitle;
  /// URL del avatar a mostrar en el header mientras la sala no está
  /// cacheada. Opcional — si null, cae al fallback de iniciales.
  final String? seedAvatarUrl;
  /// Mensaje predeterminado que precarga el input al abrir el chat —
  /// usado por "Consultar precio" desde el detalle de un servicio.
  final String? initialDraft;
  const ChatScreen({
    super.key,
    required this.roomId,
    this.seedTitle,
    this.seedAvatarUrl,
    this.initialDraft,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _sending = false;
  /// Cuando el usuario se desplaza hacia arriba para leer historial,
  /// dejamos de hacer auto-scroll forzoso al llegar mensajes nuevos.
  bool _autoStickToBottom = true;
  /// Evita disparar `loadMoreHistory` repetidamente mientras está cargando.
  bool _loadingMoreThrottle = false;

  @override
  void initState() {
    super.initState();
    // Precarga el mensaje predeterminado (p. ej. "Consultar precio").
    if (widget.initialDraft != null && widget.initialDraft!.isNotEmpty) {
      _controller.text = widget.initialDraft!;
    }
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final chat = context.read<ChatProvider>();
      chat.setActiveRoom(widget.roomId);
      chat.seedMessagesFromLast(widget.roomId);
      // Auto-marcar leídos al entrar
      chat.markRoomAsRead(widget.roomId);
      // Cargar historial real desde el backend
      await chat.loadRoomHistory(widget.roomId);
      if (!mounted) return;
      // Tras cargar, saltar al final
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollToBottom(animated: false);
      });
    });
  }

  @override
  void dispose() {
    // Sólo desactivamos si la sala activa sigue siendo ésta
    final chat = context.read<ChatProvider>();
    if (chat.currentUserId != null) {
      chat.setActiveRoom(null);
    }
    _scrollController.removeListener(_onScroll);
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final pos = _scrollController.position;

    // ── Detectar si el usuario está pegado al final ──────────
    // Threshold de 80px: si está dentro, asumimos "leyendo lo último"
    // y mantenemos auto-scroll en mensajes nuevos.
    final atBottom = pos.maxScrollExtent - pos.pixels < 80;
    if (atBottom != _autoStickToBottom) {
      _autoStickToBottom = atBottom;
    }

    // ── Cargar más historial al acercarse al tope ────────────
    if (pos.pixels <= 120 && !_loadingMoreThrottle) {
      final chat = context.read<ChatProvider>();
      if (chat.hasMoreHistory(widget.roomId) &&
          !chat.isLoadingHistory(widget.roomId)) {
        _loadingMoreThrottle = true;
        // Capturamos el extent ANTES de prepender para mantener la posición
        // visual del usuario tras insertar mensajes en el tope.
        final extentBefore = pos.maxScrollExtent;
        final pixelsBefore = pos.pixels;
        chat.loadMoreHistory(widget.roomId).then((added) {
          if (!mounted || added == 0) {
            _loadingMoreThrottle = false;
            return;
          }
          // Después del rebuild, ajustar scroll para que no salte al tope
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted || !_scrollController.hasClients) return;
            final delta =
                _scrollController.position.maxScrollExtent - extentBefore;
            _scrollController.jumpTo(pixelsBefore + delta);
            _loadingMoreThrottle = false;
          });
        });
      }
    }
  }

  void _scrollToBottom({bool animated = true}) {
    if (!_scrollController.hasClients) return;
    final target = _scrollController.position.maxScrollExtent;
    if (animated) {
      _scrollController.animateTo(
        target,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    } else {
      _scrollController.jumpTo(target);
    }
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    _controller.clear();
    try {
      await context.read<ChatProvider>().sendMessage(
            roomId: widget.roomId,
            content: text,
          );
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final chat = context.watch<ChatProvider>();
    final messages = chat.messagesOf(widget.roomId);
    final myId = chat.currentUserId ?? -1;
    final loadingHistory = chat.isLoadingHistory(widget.roomId);
    final hasMore = chat.hasMoreHistory(widget.roomId);

    final room = chat.rooms.firstWhere(
      (r) => r.id == widget.roomId,
      orElse: () => _placeholderRoom(),
    );
    // Si la sala todavía no está cacheada (chat recién creado desde la
    // pantalla principal), usamos los seeds que el caller pasó para
    // no mostrar un header vacío al user.
    final other = room.id == 0
        ? PartyDisplay(
            title: widget.seedTitle ?? '...',
            avatarUrl: widget.seedAvatarUrl,
            isProvider: true,
          )
        : room.otherParty(myId);

    // Mensajes nuevos llegaron y el usuario sigue al final → autoscroll
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_autoStickToBottom) _scrollToBottom();
    });

    // ListView: indicador opcional al tope (cargando más historial)
    final extra = (loadingHistory && hasMore && messages.isNotEmpty) ? 1 : 0;
    final itemCount = messages.length + extra;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        foregroundColor: c.textPrimary,
        titleSpacing: 0,
        title: _ChatHeader(c: c, other: other),
      ),
      body: Column(
        children: [
          _RetentionBanner(c: c),
          Expanded(
            child: messages.isEmpty
                ? (loadingHistory
                    ? const Center(child: CircularProgressIndicator())
                    : _EmptyConversation(c: c))
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    itemCount: itemCount,
                    itemBuilder: (_, i) {
                      if (extra == 1 && i == 0) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Center(
                            child: SizedBox(
                              width: 20, height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        );
                      }
                      final m = messages[i - extra];
                      final mine = m.senderId == myId;
                      return _MessageBubble(
                        c: c,
                        message: m,
                        mine: mine,
                      );
                    },
                  ),
          ),
          _Composer(
            c: c,
            controller: _controller,
            sending: _sending,
            onSend: _send,
          ),
        ],
      ),
    );
  }

  ChatRoomSummary _placeholderRoom() => ChatRoomSummary(
        id: 0,
        clientId: 0,
        providerId: 0,
        createdAt: DateTime.now(),
        client: const ClientPreview(id: 0, firstName: '', lastName: ''),
        provider: const ProviderPreview(id: 0, userId: 0, businessName: ''),
        lastMessage: null,
        lastActivityAt: DateTime.now(),
        unreadCount: 0,
      );
}

// ── Header con avatar y nombre ───────────────────────────────

class _ChatHeader extends StatelessWidget {
  final AppThemeColors c;
  final PartyDisplay other;
  const _ChatHeader({required this.c, required this.other});

  @override
  Widget build(BuildContext context) {
    final hasUrl = other.avatarUrl != null && other.avatarUrl!.isNotEmpty;
    return Row(
      children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.15),
            shape: BoxShape.circle,
            border: Border.all(color: c.border),
          ),
          clipBehavior: Clip.antiAlias,
          child: hasUrl
              ? AppNetworkImage(
                  url: other.avatarUrl!,
                  width: 36, height: 36,
                  fit: BoxFit.cover,
                  placeholder: _initialFallback(),
                  errorWidget: _initialFallback(),
                )
              : _initialFallback(),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            other.title.isEmpty ? 'Conversación' : other.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _initialFallback() {
    final initial = other.title.isNotEmpty ? other.title[0].toUpperCase() : '?';
    return Center(
      child: Text(
        initial,
        style: const TextStyle(
          color: AppColors.primary,
          fontSize: 15,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

// ── Banner de privacidad ─────────────────────────────────────

class _RetentionBanner extends StatelessWidget {
  final AppThemeColors c;
  const _RetentionBanner({required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.amber.withValues(alpha: 0.08),
        border: Border(bottom: BorderSide(color: c.border)),
      ),
      child: Row(
        children: [
          Icon(Icons.lock_outline_rounded, size: 14, color: AppColors.amber),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Por privacidad, el historial se limpia automáticamente cada 7 días.',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 11.5,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Burbuja de mensaje ───────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final AppThemeColors c;
  final ChatMessageModel message;
  final bool mine;

  const _MessageBubble({
    required this.c,
    required this.message,
    required this.mine,
  });

  @override
  Widget build(BuildContext context) {
    final radius = const Radius.circular(16);
    final smallRadius = const Radius.circular(4);
    
    // Cambio: Burbuja del emisor (mine) ahora es blanca con borde
    final bg = mine ? Colors.white : c.bgCard;
    // Cambio: Texto del emisor oscuro para contraste
    final fg = mine ? Colors.black87 : c.textPrimary;
    // Cambio: Hora del emisor en gris oscuro
    final timeColor = mine
        ? Colors.grey.shade600
        : c.textMuted;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.78,
              ),
              child: Container(
                padding: const EdgeInsets.fromLTRB(12, 9, 12, 8),
                decoration: BoxDecoration(
                  color: bg,
                  // Ambas burbujas tienen borde ligero para distinguir del fondo
                  border: Border.all(color: mine ? Colors.grey.shade300 : c.border),
                  borderRadius: BorderRadius.only(
                    topLeft:     radius,
                    topRight:    radius,
                    bottomLeft:  mine ? radius : smallRadius,
                    bottomRight: mine ? smallRadius : radius,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      message.content,
                      style: TextStyle(color: fg, fontSize: 14.5, height: 1.35),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _hhmm(message.createdAt),
                          style: TextStyle(
                            color: timeColor,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (mine) ...[
                          const SizedBox(width: 4),
                          _StatusIcon(status: message.status),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _hhmm(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
}

class _StatusIcon extends StatelessWidget {
  final MessageStatus status;
  const _StatusIcon({required this.status});

  @override
  Widget build(BuildContext context) {
    switch (status) {
      case MessageStatus.sending:
        return Icon(
          Icons.access_time_rounded,
          size: 12,
          // Cambio: Gris oscuro sobre blanco
          color: Colors.grey.shade600, 
        );
      case MessageStatus.sent:
      case MessageStatus.delivered:
        return Icon(
          Icons.check_rounded,
          size: 14,
          // Cambio: Gris oscuro sobre blanco
          color: Colors.grey.shade600, 
        );
      case MessageStatus.read:
        // Doble check azul brillante (estilo WhatsApp sobre blanco)
        return Icon(
          Icons.done_all_rounded,
          size: 14,
          // Cambio: Azul brillante para que resalte sobre el blanco
          color: Colors.blue, 
        );
    }
  }
}

// ── Composer (input + botón enviar) ──────────────────────────

class _Composer extends StatelessWidget {
  final AppThemeColors c;
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  const _Composer({
    required this.c,
    required this.controller,
    required this.sending,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
        decoration: BoxDecoration(
          color: c.bg,
          border: Border(top: BorderSide(color: c.border)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: c.bgInput,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: c.border),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                child: TextField(
                  controller: controller,
                  maxLines: 5,
                  minLines: 1,
                  textInputAction: TextInputAction.newline,
                  enabled: !sending,
                  style: TextStyle(color: c.textPrimary, fontSize: 14.5),
                  decoration: InputDecoration(
                    isDense: true,
                    border: InputBorder.none,
                    hintText: 'Escribe un mensaje…',
                    hintStyle: TextStyle(color: c.textMuted, fontSize: 14),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: sending ? null : onSend,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 140),
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: sending
                      ? c.bgInput
                      : AppColors.primary,
                  shape: BoxShape.circle,
                  boxShadow: sending
                      ? null
                      : [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.35),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                ),
                child: sending
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(Colors.white),
                        ),
                      )
                    : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Empty state de conversación nueva ───────────────────────

class _EmptyConversation extends StatelessWidget {
  final AppThemeColors c;
  const _EmptyConversation({required this.c});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.waving_hand_outlined, color: AppColors.amber, size: 36),
            const SizedBox(height: 12),
            Text(
              'Inicia la conversación',
              style: TextStyle(color: c.textPrimary, fontSize: 15, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              'Sé claro con lo que necesitas. Recuerda: solo texto.',
              textAlign: TextAlign.center,
              style: TextStyle(color: c.textSecondary, fontSize: 12.5, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
