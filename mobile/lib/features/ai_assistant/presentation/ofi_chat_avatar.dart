import 'package:flutter/material.dart';

/// Avatar circular de Ofi para el CHAT (cabecera, mensajes del asistente y
/// estados de carga). Usa la mascota oficial `ofi.png` — reemplaza el icono
/// genérico `smart_toy`. Solo presentación.
class OfiChatAvatar extends StatelessWidget {
  final double size;
  const OfiChatAvatar({super.key, this.size = 32});

  @override
  Widget build(BuildContext context) {
    // Decodifica a la resolución de pantalla (no a 1.7 MB full-res).
    final cachePx = (size * MediaQuery.of(context).devicePixelRatio).round();
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipOval(
        child: Padding(
          padding: EdgeInsets.all(size * 0.08),
          child: Image.asset(
            'assets/icons/ofi.png',
            fit: BoxFit.contain,
            cacheWidth: cachePx,
            cacheHeight: cachePx,
            filterQuality: FilterQuality.high,
          ),
        ),
      ),
    );
  }
}
