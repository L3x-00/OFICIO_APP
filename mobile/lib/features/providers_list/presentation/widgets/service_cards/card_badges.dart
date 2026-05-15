import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';

/// Badge "Verificado" — check azul para proveedores con verificación
/// aprobada.
class VerifiedBadge extends StatelessWidget {
  const VerifiedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.verified.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppColors.verified.withValues(alpha: 0.4), blurRadius: 8)],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified_rounded, color: Colors.white, size: 14),
          SizedBox(width: 4),
          Text('Verificado', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

/// Badge "Atiende a domicilio" — visible en tarjetas OFICIO cuyo perfil
/// activó el toggle de servicio a domicilio. Aparece junto al resto de
/// badges sobre la foto de portada.
class HomeServiceBadge extends StatelessWidget {
  const HomeServiceBadge({super.key});

  @override
  Widget build(BuildContext context) {
    const color = Color(0xFF06B6D4);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: color.withValues(alpha: 0.4), blurRadius: 8)],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.directions_run_rounded, color: Colors.white, size: 13),
          SizedBox(width: 4),
          Text('A domicilio',
              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

/// Badge "Confiable" — escudo verde para proveedores con validación de
/// confianza aprobada.
class TrustedBadge extends StatelessWidget {
  const TrustedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: const Color(0xFF10B981).withValues(alpha: 0.4), blurRadius: 8)],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.shield_rounded, color: Colors.white, size: 13),
          SizedBox(width: 4),
          Text('Confiable', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

/// Badge de distancia — muestra metros (<1 km) o kilómetros sobre la foto
/// de portada.
class DistanceBadge extends StatelessWidget {
  final double km;
  const DistanceBadge({super.key, required this.km});

  @override
  Widget build(BuildContext context) {
    final label = km < 1 ? '${(km * 1000).toInt()} m' : '${km.toStringAsFixed(1)} km';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 13),
          const SizedBox(width: 3),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Badge de plan de suscripción (Premium / Estándar). Usar los factory
/// constructors [PlanBadge.premium] y [PlanBadge.standard].
class PlanBadge extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final Color textColor;
  final bool hasGlow;

  const PlanBadge({
    super.key,
    required this.label,
    required this.icon,
    required this.color,
    required this.textColor,
    this.hasGlow = false,
  });

  factory PlanBadge.premium() => const PlanBadge(
    label: 'Premium',
    icon: Icons.star_rounded,
    color: AppColors.premium,
    textColor: Color(0xFF3D2B00),
    hasGlow: true,
  );

  factory PlanBadge.standard() => const PlanBadge(
    label: 'Estándar',
    icon: Icons.verified_rounded,
    color: AppColors.standard,
    textColor: Colors.white,
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
        boxShadow: hasGlow
            ? [BoxShadow(color: color.withValues(alpha: 0.55), blurRadius: 10, spreadRadius: 1)]
            : [BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: 6)],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: textColor, size: 12),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}
