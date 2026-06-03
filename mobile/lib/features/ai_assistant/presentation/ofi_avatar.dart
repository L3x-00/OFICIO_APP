import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'ofi_messages.dart' show OfiAssets;

/// Estados visuales del launcher de Ofi (Fase 5 v2).
enum OfiAvatarState {
  /// Reposo: solo breathing.
  idle,

  /// Hay un mensaje nuevo en el globo → glow ámbar pulsante.
  newMessage,

  /// Asistente abierto/activo → glow ámbar continuo.
  chatOpen,

  /// Reservado para uso futuro (procesando). Arquitectura lista; sin lógica.
  processing,
}

/// Mascota flotante "Ofi" como launcher del asistente.
///
/// NO es un FloatingActionButton: sin fondo cuadrado ni look de botón. Se ve
/// como un personaje vivo: breathing + glow por estado + rebote al tocar +
/// expresión (`assetPath`) que cambia con CROSSFADE. Solo presentación.
class OfiAvatar extends StatefulWidget {
  /// Lado del avatar en px (responsive: 72–88).
  final double size;

  /// Expresión actual de Ofi (una de [OfiAssets]). Al cambiar → crossfade.
  final String assetPath;

  final OfiAvatarState state;
  final VoidCallback onTap;

  const OfiAvatar({
    super.key,
    required this.size,
    required this.onTap,
    this.assetPath = OfiAssets.defaultFace,
    this.state = OfiAvatarState.idle,
  });

  @override
  State<OfiAvatar> createState() => _OfiAvatarState();
}

class _OfiAvatarState extends State<OfiAvatar> with TickerProviderStateMixin {
  late final AnimationController _breath; // breathing (idle)
  late final AnimationController _glow; // pulso/glow de estado
  late final AnimationController _tap; // rebote al tocar

  @override
  void initState() {
    super.initState();
    _breath = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);
    _glow = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1300),
    );
    _tap = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 160),
      lowerBound: 0.0,
      upperBound: 0.12,
    );
    _syncGlow();
  }

  @override
  void didUpdateWidget(covariant OfiAvatar old) {
    super.didUpdateWidget(old);
    if (old.state != widget.state) _syncGlow();
  }

  /// Arranca/detiene el glow según el estado. En idle NO anima (perf).
  void _syncGlow() {
    switch (widget.state) {
      case OfiAvatarState.newMessage:
      case OfiAvatarState.processing:
        if (!_glow.isAnimating) _glow.repeat(reverse: true);
      case OfiAvatarState.chatOpen:
        _glow
          ..stop()
          ..value = 1.0; // glow continuo
      case OfiAvatarState.idle:
        _glow
          ..stop()
          ..value = 0.0;
    }
  }

  void _onTap() {
    _tap.forward().then((_) {
      if (mounted) _tap.reverse();
    });
    widget.onTap();
  }

  @override
  void dispose() {
    _breath.dispose();
    _glow.dispose();
    _tap.dispose();
    super.dispose();
  }

  bool get _glowActive => widget.state != OfiAvatarState.idle;

  @override
  Widget build(BuildContext context) {
    final size = widget.size;
    // Compresión en memoria (Fase 4): decodifica a la resolución de
    // renderizado real (≈ size × devicePixelRatio), nunca a full-res.
    final cachePx = (size * MediaQuery.of(context).devicePixelRatio).round();

    return GestureDetector(
      onTap: _onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedBuilder(
        animation: Listenable.merge([_breath, _glow, _tap]),
        // `child` (la expresión con crossfade) se reconstruye SOLO cuando
        // cambia `assetPath`; NO por frame. El builder reanima únicamente el
        // Transform/Container → los controllers de breathing/glow nunca se
        // tocan al cambiar de imagen.
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 350),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          // Crossfade real: el saliente baja su opacidad mientras el entrante
          // la sube (ambos superpuestos por el layoutBuilder por defecto).
          child: Image.asset(
            widget.assetPath,
            key: ValueKey<String>(widget.assetPath),
            fit: BoxFit.contain, // imagen completa, sin deformar
            cacheWidth: cachePx,
            cacheHeight: cachePx,
            filterQuality: FilterQuality.high,
          ),
        ),
        builder: (context, child) {
          final scale = (1.0 + 0.05 * _breath.value) - _tap.value;
          final g = _glow.value;
          final shadows = _glowActive
              ? [
                  BoxShadow(
                    color: AppColors.amber.withValues(alpha: 0.25 + 0.35 * g),
                    blurRadius: 14 + 16 * g,
                    spreadRadius: 1 + 3 * g,
                  ),
                ]
              : const [
                  // Sombra suave de "flotando" (sin look de botón).
                  BoxShadow(
                    color: Color(0x38000000),
                    blurRadius: 16,
                    offset: Offset(0, 6),
                  ),
                ];
          return Transform.scale(
            scale: scale,
            child: Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: shadows,
              ),
              child: child,
            ),
          );
        },
      ),
    );
  }
}
