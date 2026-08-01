import 'package:flutter/material.dart';

/// Entrada animada (fade + scale + leve ascenso) reusada por los slides del
/// welcome carousel para escalonar la aparición de tarjetas/íconos/burbujas.
/// [index]/[total] desplazan el inicio de la curva para lograr el stagger.
class StaggerFade extends StatelessWidget {
  final int index;
  final int total;
  final Widget child;
  final Duration duration;

  const StaggerFade({
    super.key,
    required this.index,
    required this.child,
    this.total = 1,
    this.duration = const Duration(milliseconds: 700),
  });

  @override
  Widget build(BuildContext context) {
    final start = (index / (total + 1)).clamp(0.0, 0.7);
    final end = (start + 0.45).clamp(0.0, 1.0);
    return TweenAnimationBuilder<double>(
      key: ValueKey(index),
      tween: Tween(begin: 0, end: 1),
      duration: duration,
      curve: Interval(start, end, curve: Curves.easeOutCubic),
      builder: (_, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(
          offset: Offset(0, (1 - t) * 12),
          child: Transform.scale(scale: 0.94 + (t * 0.06), child: child),
        ),
      ),
      child: child,
    );
  }
}
