import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'ai_assistant_screen.dart';
import 'ofi_avatar.dart';
import 'ofi_messages.dart';
import 'ofi_speech_bubble.dart';

/// Launcher del asistente "Ofi": mascota flotante con globo de mensajes
/// inteligentes (contextuales + aleatorios).
///
/// SOLO experiencia visual/interacción. Al tocar abre EXACTAMENTE el mismo
/// [AiAssistantScreen] con la lógica existente (mismo `providerType`, misma
/// navegación). No toca providers de IA, repos ni servicios.
class AiAssistantFab extends StatefulWidget {
  /// Perfil activo (OFICIO|NEGOCIO) si se abre desde el panel del proveedor.
  final String? providerType;

  const AiAssistantFab({super.key, this.providerType});

  @override
  State<AiAssistantFab> createState() => _AiAssistantFabState();
}

class _AiAssistantFabState extends State<AiAssistantFab> {
  static const _dismissKey = 'ofi_bubble_dismissed_until';
  static const _visibleDur = Duration(seconds: 6);
  static const _hiddenDur = Duration(seconds: 25);
  static const _firstDelay = Duration(seconds: 3);
  static const _dismissWindow = Duration(minutes: 30);
  // Rotación pasiva de la expresión en idle (Fase 2).
  static const _idleRotate = Duration(seconds: 15);
  static const _peekDur = Duration(milliseconds: 2500);

  final OfiMessageRotator _rotator = OfiMessageRotator();

  Timer? _timer; // ciclo del globo (6s/25s)
  Timer? _idleTimer; // rotación pasiva en idle
  Timer? _peekTimer; // retorno del "peek" pasivo
  bool _bubbleVisible = false;
  bool _chatOpen = false;
  OfiMessage? _message;
  // Expresión por defecto en idle = "pensando" (Fase 2).
  String _idleAsset = OfiAssets.thinking;
  int _dismissedUntilMs = 0;

  @override
  void initState() {
    super.initState();
    _loadDismissed();
    // Arranca oculto; primera aparición a los 3s, luego 6s visible / 25s oculto.
    _timer = Timer(_firstDelay, _toggle);
    // Rotación pasiva de la expresión cada 15s (sensación de "vida" en idle).
    _idleTimer = Timer.periodic(_idleRotate, (_) => _passivePeek());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _idleTimer?.cancel();
    _peekTimer?.cancel();
    super.dispose();
  }

  /// "Peek" pasivo: en idle, cambia ~2.5s a la cara neutra y vuelve a pensar
  /// (crossfade lo hace suave). Solo cuando NO hay globo ni chat abierto.
  void _passivePeek() {
    if (!mounted || _bubbleVisible || _chatOpen) return;
    setState(() => _idleAsset = OfiAssets.defaultFace);
    _peekTimer?.cancel();
    _peekTimer = Timer(_peekDur, () {
      if (mounted) setState(() => _idleAsset = OfiAssets.thinking);
    });
  }

  void _toggle() {
    if (!mounted) return;
    setState(() {
      _bubbleVisible = !_bubbleVisible;
      if (_bubbleVisible) {
        _message = _rotator.next(OfiMessages.forAudience(_audience()));
      }
    });
    _timer = Timer(_bubbleVisible ? _visibleDur : _hiddenDur, _toggle);
  }

  /// Detecta la audiencia para los mensajes contextuales (Fase 4).
  OfiAudience _audience() {
    if (widget.providerType != null) return OfiAudience.provider;
    final role = context.read<AuthProvider>().userRole;
    if (role == 'ADMIN') return OfiAudience.admin;
    return OfiAudience.client;
  }

  Future<void> _loadDismissed() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!mounted) return;
      setState(() => _dismissedUntilMs = prefs.getInt(_dismissKey) ?? 0);
    } catch (_) {
      /* best-effort */
    }
  }

  /// Cierre manual del globo → ocultar 30 min (persistido).
  Future<void> _dismissBubble() async {
    final until = DateTime.now().add(_dismissWindow).millisecondsSinceEpoch;
    if (mounted) {
      setState(() {
        _bubbleVisible = false;
        _dismissedUntilMs = until;
      });
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_dismissKey, until);
    } catch (_) {
      /* best-effort */
    }
  }

  /// Abre el asistente — MISMA lógica/navegación. Marca el estado de avatar
  /// "chat abierto" (glow continuo) mientras la pantalla esté arriba.
  Future<void> _openAssistant() async {
    if (mounted) setState(() => _chatOpen = true);
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AiAssistantScreen(providerType: widget.providerType),
      ),
    );
    if (mounted) setState(() => _chatOpen = false);
  }

  /// Reglas UX (Fase 4) — NO mostrar el globo si hay otra ruta encima
  /// (chat/modal), si el teclado está visible o si fue cerrado < 30 min.
  bool _canShowBubble(BuildContext context) {
    if (_chatOpen) return false;
    final route = ModalRoute.of(context);
    if (route != null && !route.isCurrent) return false;
    if (MediaQuery.of(context).viewInsets.bottom > 0) return false;
    if (DateTime.now().millisecondsSinceEpoch < _dismissedUntilMs) return false;
    return true;
  }

  /// Tamaño responsive del avatar (72–88) según ancho de pantalla (Fase 6).
  double _avatarSize(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    if (w >= 600) return 88; // tablets
    if (w >= 360) return 80; // teléfonos estándar
    return 72; // teléfonos pequeños
  }

  @override
  Widget build(BuildContext context) {
    final avatarSize = _avatarSize(context);
    final screenW = MediaQuery.of(context).size.width;
    // El globo nunca supera el ancho útil → nunca se recorta (Fase 6).
    final bubbleMaxW = (screenW * 0.64).clamp(200.0, 300.0);
    const bubbleArea = 130.0; // espacio reservado para el globo (≈3-4 líneas)

    final show = _bubbleVisible && _canShowBubble(context);
    final avatarState = _chatOpen
        ? OfiAvatarState.chatOpen
        : (show ? OfiAvatarState.newMessage : OfiAvatarState.idle);

    // Expresión mostrada: la del mensaje si el globo está visible; si no, la
    // de idle (pensar / peek). El crossfade lo resuelve OfiAvatar.
    final avatarAsset = (show && _message != null)
        ? _message!.asset
        : _idleAsset;

    // Área reservada (transparente y pass-through): mantiene fija la posición
    // del avatar y permite que el globo crezca HACIA ARRIBA sin recortarse ni
    // mover otros FAB. Clip.none → el glow/globo pueden desbordar.
    return SizedBox(
      width: bubbleMaxW,
      height: avatarSize + bubbleArea,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Globo encima de Ofi, anclado abajo-derecha (crece hacia arriba).
          Positioned(
            right: 0,
            bottom: avatarSize,
            child: OfiSpeechBubble(
              visible: show,
              message: _message?.text ?? '',
              onClose: _dismissBubble,
              maxWidth: bubbleMaxW,
            ),
          ),
          // Mascota Ofi anclada abajo-derecha (posición estable del FAB).
          Positioned(
            right: 0,
            bottom: 0,
            child: OfiAvatar(
              size: avatarSize,
              state: avatarState,
              assetPath: avatarAsset,
              onTap: _openAssistant,
            ),
          ),
        ],
      ),
    );
  }
}
