import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Visual del Slide 1: Grid de servicios con categorías.
class SlideServiceGrid extends StatelessWidget {
  final bool isDark;
  const SlideServiceGrid({super.key, required this.isDark});

  static const _services = [
    (Icons.bolt_rounded,          'Electricistas', AppColors.primary),
    (Icons.plumbing_rounded,      'Gasfiteros',    Color(0xFF26C6DA)),
    (Icons.format_paint_rounded,  'Pintores',      Color(0xFF7E57C2)),
    (Icons.restaurant_rounded,    'Restaurantes',  AppColors.amber),
    (Icons.content_cut_rounded,   'Peluquerías',   Color(0xFFEC407A)),
    (Icons.build_rounded,         'Carpinteros',   Color(0xFF66BB6A)),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Título flotante
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.location_on_rounded, color: AppColors.primary, size: 13),
                SizedBox(width: 5),
                Text(
                  'Servicios cerca de ti',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          // Grid de categorías 3x2
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.05,
            ),
            itemCount: _services.length,
            itemBuilder: (_, i) {
              final s = _services[i];
              return ServiceTile(icon: s.$1, label: s.$2, color: s.$3);
            },
          ),
        ],
      ),
    );
  }
}

/// Tile individual de servicio dentro del grid.
class ServiceTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const ServiceTile({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.bgInput,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}