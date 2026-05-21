import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Visual del Slide 3: Testimonio comunitario + estadísticas.
class SlideCommunityVisual extends StatelessWidget {
  const SlideCommunityVisual({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Testimonio
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: c.warmDeep,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.amber.withValues(alpha: 0.3)),
              boxShadow: [
                BoxShadow(
                  color: AppColors.amber.withValues(alpha: 0.1),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Column(
              children: [
                Icon(
                  Icons.format_quote_rounded,
                  color: AppColors.amber.withValues(alpha: 0.7),
                  size: 26,
                ),
                const SizedBox(height: 6),
                Text(
                  '"Gracias a Servi, mi panadería duplicó sus clientes. La gente confía porque ve las reseñas reales."',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 13,
                    height: 1.55,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppColors.amber.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: AppColors.amber.withValues(alpha: 0.4)),
                      ),
                      child: const Icon(
                        Icons.storefront_rounded,
                        color: AppColors.amber,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Carlos Ríos',
                          style: TextStyle(
                            color: AppColors.amber,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          "Panadería 'El Trigo Dorado'",
                          style: TextStyle(
                              color: c.textSecondary, fontSize: 10),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          // Estadísticas
          Row(
            children: [
              Expanded(
                child: StatCard(
                  icon: Icons.people_rounded,
                  value: '+2,000',
                  label: 'usuarios',
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatCard(
                  icon: Icons.star_rounded,
                  value: '4.8★',
                  label: 'promedio',
                  color: AppColors.star,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatCard(
                  icon: Icons.handshake_rounded,
                  value: '+500',
                  label: 'servicios',
                  color: AppColors.available,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Tarjeta de estadística individual (usuarios, promedio, servicios).
class StatCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;

  const StatCard({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            label,
            style: TextStyle(color: c.textMuted, fontSize: 10),
          ),
        ],
      ),
    );
  }
}