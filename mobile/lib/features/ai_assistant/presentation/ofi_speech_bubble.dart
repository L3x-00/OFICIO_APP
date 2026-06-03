import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Globo de conversación de "Ofi" con estética glassmorphism (fondo
/// translúcido + blur + borde sutil + sombra suave).
///
/// Transición controlada por UN solo AnimationController: fade + ligero
/// desplazamiento vertical + colapso de altura (para no reservar espacio
/// cuando está oculto). Solo presentación; el texto y el cierre los maneja
/// el launcher.
class OfiSpeechBubble extends StatefulWidget {
  final bool visible;
  final String message;
  final VoidCallback onClose;
  final double maxWidth;

  const OfiSpeechBubble({
    super.key,
    required this.visible,
    required this.message,
    required this.onClose,
    this.maxWidth = 232,
  });

  @override
  State<OfiSpeechBubble> createState() => _OfiSpeechBubbleState();
}

class _OfiSpeechBubbleState extends State<OfiSpeechBubble>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ac;
  late final Animation<double> _curve;

  @override
  void initState() {
    super.initState();
    _ac = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
      value: widget.visible ? 1.0 : 0.0,
    );
    _curve = CurvedAnimation(
      parent: _ac,
      curve: Curves.easeOutCubic,
      reverseCurve: Curves.easeInCubic,
    );
  }

  @override
  void didUpdateWidget(covariant OfiSpeechBubble old) {
    super.didUpdateWidget(old);
    if (widget.visible && !old.visible) _ac.forward();
    if (!widget.visible && old.visible) _ac.reverse();
  }

  @override
  void dispose() {
    _ac.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return SizeTransition(
      sizeFactor: _curve,
      axisAlignment: 1.0, // colapsa/emerge desde abajo (hacia el avatar)
      child: FadeTransition(
        opacity: _curve,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.18), // ligero desplazamiento vertical
            end: Offset.zero,
          ).animate(_curve),
          child: Padding(
            // Separación con el avatar (colapsa junto con el globo).
            padding: const EdgeInsets.only(bottom: 10),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: widget.maxWidth),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                  child: Container(
                    decoration: BoxDecoration(
                      color: c.bgCard.withValues(alpha: 0.82),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.16),
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.16),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Flexible(
                            child: Text(
                              widget.message,
                              style: TextStyle(
                                color: c.textPrimary,
                                fontSize: 13,
                                height: 1.25,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          // Cierre manual → el launcher lo oculta 30 min.
                          GestureDetector(
                            onTap: widget.onClose,
                            behavior: HitTestBehavior.opaque,
                            child: Padding(
                              padding: const EdgeInsets.all(2),
                              child: Icon(
                                Icons.close_rounded,
                                size: 16,
                                color: c.textMuted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
