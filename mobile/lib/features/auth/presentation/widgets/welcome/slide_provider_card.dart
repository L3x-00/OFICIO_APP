import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Visual reusado en los slides 3-5: tarjeta mock de un proveedor
/// (oficio / profesional / negocio) con rating, badge y chips de servicios.
class SlideProviderCard extends StatelessWidget {
  final String name;
  final String category;
  final String avatarInitials;
  final double rating;
  final int reviews;
  final String badgeLabel;
  final IconData badgeIcon;
  final Color badgeColor;
  final List<String> tags;
  final Color accent;
  final List<({IconData icon, String label})> miniTags;

  const SlideProviderCard({
    super.key,
    required this.name,
    required this.category,
    required this.avatarInitials,
    required this.rating,
    required this.reviews,
    required this.badgeLabel,
    required this.badgeIcon,
    required this.badgeColor,
    required this.tags,
    required this.accent,
    this.miniTags = const [],
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0.9, end: 1.0),
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeOutBack,
        builder: (_, scale, child) =>
            Transform.scale(scale: scale, child: child),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.bgCard.withValues(alpha: 0.92),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: accent.withValues(alpha: 0.25)),
            boxShadow: [
              BoxShadow(
                color: accent.withValues(alpha: 0.16),
                blurRadius: 24,
                spreadRadius: 1,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header: avatar + nombre + categoría
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          accent,
                          Color.alphaBlend(
                            Colors.black.withValues(alpha: 0.18),
                            accent,
                          ),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        avatarInitials,
                        style: TextStyle(
                          color: AppColors.onSolid(accent),
                          fontWeight: FontWeight.bold,
                          fontSize: 17,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: c.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 15.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          category,
                          style: TextStyle(
                            color: AppColors.tintOn(accent, c.isDark),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (miniTags.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: [
                              for (final t in miniTags)
                                _MiniTag(
                                  icon: t.icon,
                                  label: t.label,
                                  color: accent,
                                ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Estrellas y estado
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  color: c.bgInput,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    ...List.generate(
                      5,
                      (i) => Icon(
                        i < rating.floor()
                            ? Icons.star_rounded
                            : (rating - i >= 0.5
                                  ? Icons.star_half_rounded
                                  : Icons.star_outline_rounded),
                        color: AppColors.star,
                        size: 15,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      rating.toStringAsFixed(1),
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      ' ($reviews)',
                      style: TextStyle(color: c.textSecondary, fontSize: 11),
                    ),
                    const Spacer(),
                    Icon(badgeIcon, color: badgeColor, size: 13),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        badgeLabel,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: badgeColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              // Chips de servicios / especialidades / productos
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final tag in tags)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: accent.withValues(alpha: 0.25),
                        ),
                      ),
                      child: Text(
                        tag,
                        style: TextStyle(
                          color: AppColors.tintOn(accent, c.isDark),
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniTag extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;

  const _MiniTag({
    required this.label,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppColors.tintOn(color, c.isDark), size: 9),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              color: AppColors.tintOn(color, c.isDark),
              fontSize: 9.5,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
