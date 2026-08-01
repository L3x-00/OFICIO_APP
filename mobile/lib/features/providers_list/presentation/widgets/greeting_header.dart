import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class GreetingHeader extends StatefulWidget {
  final String? liveProvince;
  final String? liveDistrict;
  const GreetingHeader({super.key, this.liveProvince, this.liveDistrict});

  @override
  State<GreetingHeader> createState() => _GreetingHeaderState();
}

class _GreetingHeaderState extends State<GreetingHeader> {
  int _messageIndex = 0;
  Timer? _timer;

  static const _guestMessages = [
    'Contrata sin registro • Es gratis',
    'Regístrate para chatear con proveedores',
    'Crea tu cuenta y recibe ofertas personalizadas',
  ];

  Timer _startTimer() {
    return Timer.periodic(const Duration(seconds: 2), (_) {
      if (!mounted) return;
      setState(() {
        _messageIndex = (_messageIndex + 1) % _guestMessages.length;
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final firstName = user?.firstName ?? (auth.isGuest ? null : 'Usuario');
    final isGuest = firstName == null;

    // El carrusel de mensajes solo existe para invitados: con sesión iniciada
    // el texto es fijo, así que un Timer.periodic vivo serían setState (y
    // rebuilds de toda la pantalla principal) cada 2 s sin cambiar un píxel.
    if (isGuest) {
      _timer ??= _startTimer();
    } else if (_timer != null) {
      _timer!.cancel();
      _timer = null;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          firstName != null ? '¡Hola, $firstName!' : '¡Explora los servicios!',
          style: TextStyle(
            color: c.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 4),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 400),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          transitionBuilder: (child, anim) => FadeTransition(
            opacity: anim,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 0.3),
                end: Offset.zero,
              ).animate(anim),
              child: child,
            ),
          ),
          child: Text(
            isGuest
                ? _guestMessages[_messageIndex]
                : '¿Qué servicios necesitas hoy?',
            key: ValueKey(isGuest ? _messageIndex : 'logged'),
            style: TextStyle(
              color: c.textMuted,
              fontSize: 13,
              fontWeight: FontWeight.normal,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
