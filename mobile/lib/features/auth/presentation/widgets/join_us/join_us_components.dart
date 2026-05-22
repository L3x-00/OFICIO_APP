import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:flutter_svg/flutter_svg.dart';
/// Lista de beneficios mostrada en la vista inicial del modal de unirse.
const kJoinUsBenefits = [
  {
    'icon': Icons.visibility_rounded,
    'title': 'Visibilidad inmediata',
    'subtitle':
        'Tu servicio aparece en el mapa de tu localidad desde el día 1.',
    'color': AppColors.primary,
  },
    {
    'svgAsset': 'assets/icons/whatsapp.svg', // ← SVG de WhatsApp
    'title': 'Contacto directo',
    'subtitle':
        'Los clientes te escriben por WhatsApp o te llaman sin pasar por nadie.',
    'color': AppColors.whatsapp,
  },
  {
    'icon': Icons.shield_rounded,
    'title': 'Perfil verificado',
    'subtitle': 'Sube tus documentos y obtén el check azul de confianza.',
    'color': AppColors.verified,
  },
  {
    'icon': Icons.bar_chart_rounded,
    'title': 'Métricas reales',
    'subtitle':
        'Sabe cuántos clientes potenciales vieron tu perfil cada semana.',
    'color': AppColors.available,
  },
];

/// Fila de beneficio (ícono circular + título + subtítulo).
class BenefitRow extends StatelessWidget {
  final IconData? icon;       // ← Ahora es opcional
  final String? svgAsset;     // ← Nuevo: ruta del SVG
  final String title;
  final String subtitle;
  final Color color;

  const BenefitRow({
    super.key,
    this.icon,
    this.svgAsset,
    required this.title,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            // ── Render condicional ──
            child: Center(
              child: svgAsset != null
                  ? SvgPicture.asset(
                      svgAsset!,
                      width: 20,
                      height: 20,
                      // Tu SVG ya tiene el verde de WhatsApp, 
                      // así que null respeta sus colores originales.
                      colorFilter: null, 
                    )
                  : Icon(icon, color: color, size: 20),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Tarjeta de métrica (3 columnas: % gratis / búsquedas / rating).
class StatCard extends StatelessWidget {
  final String value;
  final String label;
  final Color color;

  const StatCard({
    super.key,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: c.textMuted,
              fontSize: 10,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

/// Tarjeta de selección de tipo (OFICIO / NEGOCIO).
class TypeCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String tag;
  final List<Color> gradient;
  final VoidCallback onTap;

  const TypeCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.tag,
    required this.gradient,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: gradient),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: Colors.white, size: 26),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: c.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.arrow_forward_ios_rounded,
              color: c.textMuted,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }
}

/// Opción dentro del modal de selección de panel (cuando el usuario tiene
/// ambos perfiles OFICIO + NEGOCIO aprobados).
class PanelChoiceOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const PanelChoiceOption({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            Icon(Icons.arrow_forward_ios_rounded, color: color, size: 14),
          ],
        ),
      ),
    );
  }
}
