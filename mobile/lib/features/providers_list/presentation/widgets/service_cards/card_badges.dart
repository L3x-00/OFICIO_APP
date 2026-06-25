import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';

/// Badge "Verificado" — check azul para proveedores con verificación
/// aprobada.
class VerifiedBadge extends StatelessWidget {
  const VerifiedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.verified.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.18),
          width: 0.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.verified.withValues(alpha: 0.18),
            blurRadius: 4,
          ),
        ],
      ),
      // Glifo OSCURO cálido sobre el fill suave (no blanco): el azul polvoriento
      // es demasiado claro para texto blanco (fallaba AA). #2A2418 da ~5.4:1.
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified_rounded, color: Color(0xFF2A2418), size: 12),
          SizedBox(width: 3),
          Text(
            'Verificado',
            style: TextStyle(
              color: Color(0xFF2A2418),
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
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
    const color = AppColors.amber;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.18),
          width: 0.5,
        ),
        boxShadow: [
          BoxShadow(color: color.withValues(alpha: 0.18), blurRadius: 4),
        ],
      ),
      // Glifo OSCURO sobre el dorado (blanco-sobre-amber daba ~2.3:1, ilegible).
      // #2A2418 sobre #C4A35A ≈ 6:1, pasa AA holgado.
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.directions_run_rounded,
            color: Color(0xFF2A2418),
            size: 12,
          ),
          SizedBox(width: 3),
          Text(
            'A domicilio',
            style: TextStyle(
              color: Color(0xFF2A2418),
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.available.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.18),
          width: 0.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.available.withValues(alpha: 0.18),
            blurRadius: 4,
          ),
        ],
      ),
      // Glifo OSCURO sobre la salvia (blanco daba ~3.0:1, falla a 10px).
      // #2A2418 sobre #5B9A6B ≈ 4.6:1.
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.shield_rounded, color: Color(0xFF2A2418), size: 12),
          SizedBox(width: 3),
          Text(
            'Confiable',
            style: TextStyle(
              color: Color(0xFF2A2418),
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
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
    final label = km < 1
        ? '${(km * 1000).toInt()} m'
        : '${km.toStringAsFixed(1)} km';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.location_on_rounded,
            color: AppColors.amber,
            size: 13,
          ),
          const SizedBox(width: 3),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Badge de plan de suscripción (Premium / Estándar). Usar los factory
/// constructors [PlanBadge.premium] y [PlanBadge.standard].
///
/// Visualmente solo muestra el icono (corona dorada / estrella) sobre un
/// fondo circular sutil. El texto Premium/Estándar se muestra en el modal
/// de detalle. [label]/[textColor]/[hasGlow] se conservan por compatibilidad
/// de API.
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
    icon: Icons.workspace_premium_rounded,
    color: AppColors.premium,
    textColor: Color(0xFF3D2B00),
    hasGlow: true,
  );

  factory PlanBadge.standard() => const PlanBadge(
    label: 'Estándar',
    icon: Icons.star_rounded,
    color: AppColors.standard,
    textColor: Colors.white,
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        shape: BoxShape.circle,
        border: Border.all(color: color.withValues(alpha: 0.25), width: 0.5),
        boxShadow: hasGlow
            ? [BoxShadow(color: color.withValues(alpha: 0.18), blurRadius: 4)]
            : null,
      ),
      child: Icon(icon, color: color, size: 16),
    );
  }
}
