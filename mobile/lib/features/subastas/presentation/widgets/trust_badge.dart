import 'package:flutter/material.dart';

/// Sello de confianza consistente en el flujo completo de subastas (oferta
/// seleccionada, lista de ofertas, detalle): escudo verde junto al nombre del
/// proveedor cuando es confiable/verificado. Si no aplica, ocupa cero espacio.
class TrustBadge extends StatelessWidget {
  /// True si el proveedor es confiable (isTrusted) o está aprobado.
  final bool isTrusted;
  final double size;

  /// Verde de confianza compartido (mismo que la insignia "Confiable" del
  /// catálogo) — distinto del azul de "verificado por la plataforma".
  static const Color trustGreen = Color(0xFF10B981);

  const TrustBadge({super.key, required this.isTrusted, this.size = 15});

  @override
  Widget build(BuildContext context) {
    if (!isTrusted) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Tooltip(
        message: 'Proveedor verificado',
        child: Icon(Icons.verified_user, color: trustGreen, size: size),
      ),
    );
  }
}
