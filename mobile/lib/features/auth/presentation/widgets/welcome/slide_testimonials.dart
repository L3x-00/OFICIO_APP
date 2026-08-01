import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'stagger_fade.dart';

/// Visual del Slide 6: 3 testimonios reales (cliente, oficio, negocio)
/// con avatar de iniciales, apareciendo en fade-in escalonado.
class SlideTestimonials extends StatelessWidget {
  const SlideTestimonials({super.key});

  static const _quotes = [
    (
      'JP',
      'Juan P.',
      'Cliente',
      '"Encontré un electricista de emergencia a las 11pm. En 20 min ya estaba en mi casa."',
      AppColors.primary,
    ),
    (
      'MR',
      'Miguel R.',
      'Gasfitero',
      '"Mis ingresos crecieron 40%. Más clientes directos, cero comisiones."',
      AppColors.oficioAccent,
    ),
    (
      'RL',
      'Rosa L.',
      'Dueña de ferretería',
      '"Mi ferretería ahora aparece en el mapa. Me encuentran y llaman directo."',
      AppColors.negocioAccent,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var i = 0; i < _quotes.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            StaggerFade(
              index: i,
              total: _quotes.length,
              child: _TestimonialRow(
                initials: _quotes[i].$1,
                name: _quotes[i].$2,
                role: _quotes[i].$3,
                quote: _quotes[i].$4,
                color: _quotes[i].$5,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TestimonialRow extends StatelessWidget {
  final String initials;
  final String name;
  final String role;
  final String quote;
  final Color color;

  const _TestimonialRow({
    required this.initials,
    required this.name,
    required this.role,
    required this.quote,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: c.bgCard.withValues(alpha: 0.88),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.22)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            child: Center(
              child: Text(
                initials,
                style: TextStyle(
                  color: AppColors.onSolid(color),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  quote,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 11,
                    fontStyle: FontStyle.italic,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$name · $role',
                  style: TextStyle(
                    color: AppColors.tintOn(color, c.isDark),
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
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
