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
///
/// **Toggle de visibilidad**: Si el usuario desactiva "Mostrar asistente Ofi"
/// desde Perfil > Preferencias, este FAB no se renderiza. Solo aplica a
/// clientes puros (sin perfil de proveedor). Invitados y proveedores no se
/// ven afectados.
class AiAssistantFab extends StatefulWidget {
  /// Perfil activo (OFICIO|NEGOCIO) si se abre desde el panel del proveedor.
  final String? providerType;

  const AiAssistantFab({super.key, this.providerType});

  @override
  State<AiAssistantFab> createState() => _AiAssistantFabState();
}

class _AiAssistantFabState extends State<AiAssistantFab> {
  static const _dismissKey = 'ofi_bubble_dismissed_until';
  static const _ofiVisibleKey = 'ofi_fab_visible';
  static const _visibleDur = Duration(seconds: 6);
  static const _hiddenDur = Duration(seconds: 25);
  static const _firstDelay = Duration(seconds: 3);
  static const _dismissWindow = Duration(minutes: 30);
  static const _idleRotate = Duration(seconds: 15);
  static const _peekDur = Duration(milliseconds: 2500);

  final OfiMessageRotator _rotator = OfiMessageRotator();

  Timer? _timer;
  Timer? _idleTimer;
  Timer? _peekTimer;
  bool _bubbleVisible = false;
  bool _chatOpen = false;
  OfiMessage? _message;
  String _idleAsset = OfiAssets.thinking;
  int _dismissedUntilMs = 0;

  /// Controla la visibilidad del FAB según el toggle de Perfil > Preferencias.
  /// Solo aplica a clientes puros. Valor por defecto: true (visible).
  bool _ofiVisible = true;
  bool _ofiPrefLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadOfiPreference();
    _loadDismissed();
    _timer = Timer(_firstDelay, _toggle);
    _idleTimer = Timer.periodic(_idleRotate, (_) => _passivePeek());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _idleTimer?.cancel();
    _peekTimer?.cancel();
    super.dispose();
  }

  /// Carga la preferencia de visibilidad de Ofi desde SharedPreferences.
  Future<void> _loadOfiPreference() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!mounted) return;
      setState(() {
        _ofiVisible = prefs.getBool(_ofiVisibleKey) ?? true;
        _ofiPrefLoaded = true;
      });
    } catch (_) {
      if (mounted) setState(() => _ofiPrefLoaded = true);
    }
  }

  /// Verifica si el FAB debe mostrarse según el contexto del usuario.
  ///
  /// - Invitados: siempre visible (el toggle no aplica).
  /// - Proveedores (OFICIO/NEGOCIO): siempre visible en su panel.
  /// - Clientes puros: respeta el toggle de Perfil > Preferencias.
  bool _shouldShow(BuildContext context) {
    // Mientras la preferencia no se haya cargado, mostramos Ofi por defecto
    // para evitar un flicker (parpadeo) al iniciar la app.
    if (!_ofiPrefLoaded) return true;

    try {
      final auth = context.read<AuthProvider>();
      // Invitado → siempre visible.
      if (!auth.isAuthenticated) return true;
      // Proveedor → el toggle no aplica (Ofi se muestra en su panel).
      if (auth.hasOficioProfile || auth.hasNegocioProfile) return true;
      // Cliente puro → leer preferencia.
      return _ofiVisible;
    } catch (_) {
      // Ante cualquier error (ej. Provider no encontrado), mostramos Ofi.
      return true;
    }
  }

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

  Future<void> _openAssistant() async {
    if (mounted) setState(() => _chatOpen = true);
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AiAssistantScreen(providerType: widget.providerType),
      ),
    );
    if (mounted) setState(() => _chatOpen = false);
  }

  bool _canShowBubble(BuildContext context) {
    if (_chatOpen) return false;
    final route = ModalRoute.of(context);
    if (route != null && !route.isCurrent) return false;
    if (MediaQuery.of(context).viewInsets.bottom > 0) return false;
    if (DateTime.now().millisecondsSinceEpoch < _dismissedUntilMs) return false;
    return true;
  }

  double _avatarSize(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    if (w >= 600) return 88;
    if (w >= 360) return 80;
    return 72;
  }

  @override
  Widget build(BuildContext context) {
    // Si el toggle de Perfil > Preferencias desactivó a Ofi, no renderizar.
    if (!_shouldShow(context)) return const SizedBox.shrink();

    final avatarSize = _avatarSize(context);
    final screenW = MediaQuery.of(context).size.width;
    final bubbleMaxW = (screenW * 0.64).clamp(200.0, 300.0);
    const bubbleArea = 130.0;

    final show = _bubbleVisible && _canShowBubble(context);
    final avatarState = _chatOpen
        ? OfiAvatarState.chatOpen
        : (show ? OfiAvatarState.newMessage : OfiAvatarState.idle);

    final avatarAsset = (show && _message != null)
        ? _message!.asset
        : _idleAsset;

    return SizedBox(
      width: bubbleMaxW,
      height: avatarSize + bubbleArea,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
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
