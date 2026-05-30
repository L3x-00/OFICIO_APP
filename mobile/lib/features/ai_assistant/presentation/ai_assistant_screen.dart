import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../domain/ai_message_model.dart';
import 'ai_assistant_provider.dart';

/// Pantalla de chat con "Ofi", el asistente IA de Servi.
///
/// Estilo WhatsApp moderno: burbujas (usuario a la derecha en color
/// primario, Ofi a la izquierda con tinte ámbar), indicador "escribiendo…"
/// animado, auto-scroll y soporte de tema claro/oscuro.
class AiAssistantScreen extends StatelessWidget {
  /// Perfil de proveedor activo (OFICIO|NEGOCIO) si se abre desde el panel.
  final String? providerType;

  const AiAssistantScreen({super.key, this.providerType});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) =>
          AiAssistantProvider(providerType: providerType)..seedGreeting(),
      child: const _AiChatView(),
    );
  }
}

class _AiChatView extends StatefulWidget {
  const _AiChatView();

  @override
  State<_AiChatView> createState() => _AiChatViewState();
}

class _AiChatViewState extends State<_AiChatView> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOut,
      );
    });
  }

  void _send() {
    final text = _controller.text;
    if (text.trim().isEmpty) return;
    context.read<AiAssistantProvider>().send(text);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final prov = context.watch<AiAssistantProvider>();
    final messages = prov.messages;
    final isLoading = prov.isLoading;

    // Auto-scroll cada vez que cambia el estado (mensaje nuevo / typing).
    _scrollToBottom();

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bgCard,
        elevation: 0,
        titleSpacing: 0,
        title: Row(
          children: [
            _OfiAvatar(size: 38),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Ofi',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  isLoading ? 'escribiendo…' : 'Asistente de Servi',
                  style: TextStyle(
                    color: isLoading ? AppColors.available : c.textMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.fromLTRB(12, 16, 12, 12),
                itemCount: messages.length + (isLoading ? 1 : 0),
                itemBuilder: (context, index) {
                  // Último ítem = indicador de typing cuando carga.
                  if (isLoading && index == messages.length) {
                    return const _TypingBubble();
                  }
                  return _MessageBubble(message: messages[index]);
                },
              ),
            ),
            _InputBar(
              controller: _controller,
              onSend: _send,
              enabled: !isLoading,
            ),
          ],
        ),
      ),
    );
  }
}

/// Avatar circular de Ofi (ámbar + smart_toy).
class _OfiAvatar extends StatelessWidget {
  final double size;
  const _OfiAvatar({this.size = 32});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [AppColors.amber, AppColors.amberDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Icon(
        Icons.smart_toy_rounded,
        color: Colors.black,
        size: size * 0.58,
      ),
    );
  }
}

/// Burbuja de un mensaje (usuario o Ofi).
class _MessageBubble extends StatelessWidget {
  final AiMessageModel message;
  const _MessageBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isUser = message.isUser;
    final isError = message.isError;

    // Colores por origen.
    final Color bg = isUser
        ? AppColors.primary
        : isError
        ? Color.alphaBlend(AppColors.busy.withValues(alpha: 0.14), c.bgCard)
        : Color.alphaBlend(AppColors.amber.withValues(alpha: 0.10), c.bgCard);
    final Color fg = isUser ? Colors.white : c.textPrimary;

    final bubble = Container(
      constraints: BoxConstraints(
        maxWidth: MediaQuery.of(context).size.width * 0.76,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16),
          topRight: const Radius.circular(16),
          bottomLeft: Radius.circular(isUser ? 16 : 4),
          bottomRight: Radius.circular(isUser ? 4 : 16),
        ),
        border: isError
            ? Border.all(color: AppColors.busy.withValues(alpha: 0.4))
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isError)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.error_outline, size: 15, color: AppColors.busy),
                  const SizedBox(width: 4),
                  Text(
                    'Error',
                    style: TextStyle(
                      color: AppColors.busy,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          Text(
            message.text,
            style: TextStyle(color: fg, fontSize: 15, height: 1.35),
          ),
          const SizedBox(height: 4),
          Text(
            _formatTime(message.timestamp),
            style: TextStyle(
              color: isUser ? Colors.white70 : c.textMuted,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: isUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            const _OfiAvatar(size: 28),
            const SizedBox(width: 8),
          ],
          Flexible(child: bubble),
        ],
      ),
    );
  }

  static String _formatTime(DateTime t) {
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

/// Burbuja "escribiendo…" con tres puntos animados.
class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          const _OfiAvatar(size: 28),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: Color.alphaBlend(
                AppColors.amber.withValues(alpha: 0.10),
                c.bgCard,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomLeft: Radius.circular(4),
                bottomRight: Radius.circular(16),
              ),
            ),
            child: const _AnimatedDots(),
          ),
        ],
      ),
    );
  }
}

/// Tres puntos que pulsan en secuencia.
class _AnimatedDots extends StatefulWidget {
  const _AnimatedDots();

  @override
  State<_AnimatedDots> createState() => _AnimatedDotsState();
}

class _AnimatedDotsState extends State<_AnimatedDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            // Desfase por punto → onda.
            final t = (_ctrl.value - i * 0.2) % 1.0;
            final opacity = 0.3 + 0.7 * (t < 0.5 ? t * 2 : (1 - t) * 2);
            return Padding(
              padding: EdgeInsets.only(right: i < 2 ? 5 : 0),
              child: Opacity(
                opacity: opacity.clamp(0.3, 1.0),
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: c.textSecondary,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

/// Barra inferior de entrada de texto + botón enviar.
class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final VoidCallback onSend;
  final bool enabled;

  const _InputBar({
    required this.controller,
    required this.onSend,
    required this.enabled,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      decoration: BoxDecoration(
        color: c.bgCard,
        border: Border(top: BorderSide(color: c.border)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 5,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => onSend(),
              style: TextStyle(color: c.textPrimary),
              decoration: InputDecoration(
                hintText: 'Escribe tu mensaje…',
                hintStyle: TextStyle(color: c.textMuted),
                filled: true,
                fillColor: c.bgInput,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: enabled ? onSend : null,
            child: AnimatedOpacity(
              opacity: enabled ? 1 : 0.5,
              duration: const Duration(milliseconds: 150),
              child: Container(
                width: 46,
                height: 46,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Icon(
                  Icons.send_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
