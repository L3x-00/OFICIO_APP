import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:mobile/core/constants/app_colors.dart';

/// Modelo de un plan de suscripción para mostrar en la sección de planes.
class PlanData {
  final String id;
  final String label;
  final String price;
  final String priceNote;
  final List<String> features;
  final Color color;
  final IconData icon;
  final bool isPopular;

  const PlanData({
    required this.id,
    required this.label,
    required this.price,
    required this.priceNote,
    required this.features,
    required this.color,
    required this.icon,
    this.isPopular = false,
  });
}

/// Catálogo de planes disponibles (GRATIS / ESTANDAR / PREMIUM).
const kPlans = [
  PlanData(
    id: 'GRATIS',
    label: 'Gratis',
    price: 'S/ 0',
    priceNote: 'Para siempre',
    features: [
      'Perfil básico visible',
      'Hasta 2 fotos',
      'Sin estadísticas',
      'Posición estándar en búsqueda',
    ],
    color: Color(0xFF6B7280),
    icon: Icons.storefront_rounded,
  ),
  PlanData(
    id: 'ESTANDAR',
    label: 'Estándar',
    price: 'S/ 19.90',
    priceNote: 'por mes',
    features: [
      'Badge verificado azul',
      'Hasta 4 fotos',
      'Estadísticas básicas',
      'Mayor visibilidad en búsqueda',
    ],
    color: AppColors.standard,
    icon: Icons.verified_rounded,
    isPopular: true,
  ),
  PlanData(
    id: 'PREMIUM',
    label: 'Premium',
    price: 'S/ 39.90',
    priceNote: 'por mes',
    features: [
      'Badge dorado Premium',
      'Fotos ilimitadas',
      'Estadísticas avanzadas',
      'Posición #1 garantizada',
      'Soporte prioritario 24/7',
    ],
    color: AppColors.premium,
    icon: Icons.workspace_premium_rounded,
  ),
];

/// Ícono de check circular renderizado como SVG inline.
/// Usado por las tarjetas de plan para los features del paquete.
class SvgCheckIcon extends StatelessWidget {
  final Color color;
  const SvgCheckIcon({super.key, required this.color});

  @override
  Widget build(BuildContext context) {
    return SvgPicture.string(
      '''<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="9" fill="${_hex(color)}" fill-opacity="0.18"/>
        <path d="M6 10.5L8.8 13.5L14 7.5" stroke="${_hex(color)}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>''',
      width: 18,
      height: 18,
    );
  }

  String _hex(Color c) {
    return '#${c.toARGB32().toRadixString(16).substring(2).toUpperCase()}';
  }
}
