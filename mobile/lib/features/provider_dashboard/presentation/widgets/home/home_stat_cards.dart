import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../domain/models/dashboard_profile_model.dart';

/// Cuadrícula 2×2 de tarjetas de estadísticas (visitas, contactos,
/// favoritos, calificación). Es un widget sliver — va dentro de un
/// CustomScrollView.
class HomeStatsGrid extends StatelessWidget {
  final bool isLoading;
  final DashboardAnalytics? analytics;
  final DashboardProfileModel? profile;

  const HomeStatsGrid({
    super.key,
    required this.isLoading,
    required this.analytics,
    required this.profile,
  });

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.55,
        ),
        delegate: SliverChildListDelegate([
          StatCard(
            icon: Icons.remove_red_eye_rounded,
            color: AppColors.primary,
            label: 'Visitas',
            value: isLoading ? '—' : '${analytics?.totalClicks ?? 0}',
            sublabel: 'este mes',
          ),
          StatCard(
            icon: Icons.phone_in_talk_rounded,
            color: AppColors.whatsapp,
            label: 'Contactos',
            value: isLoading
                ? '—'
                : '${(analytics?.whatsappClicks ?? 0) + (analytics?.callClicks ?? 0)}',
            sublabel: 'WhatsApp + llamadas',
          ),
          StatCard(
            icon: Icons.favorite_rounded,
            color: AppColors.favorite,
            label: 'Favoritos',
            value: isLoading ? '—' : '${profile?.totalFavorites ?? 0}',
            sublabel: 'guardaron tu perfil',
          ),
          StatCard(
            icon: Icons.star_rounded,
            color: AppColors.star,
            label: 'Calificación',
            value: isLoading
                ? '—'
                : (profile?.averageRating ?? 0.0).toStringAsFixed(1),
            sublabel: '${profile?.totalReviews ?? 0} reseñas',
            showStars: true,
            rating: profile?.averageRating ?? 0.0,
          ),
        ]),
      ),
    );
  }
}

/// Tarjeta individual de estadística. Si [showStars] es true muestra una
/// fila de 5 estrellas según [rating].
class StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  final String sublabel;
  final bool showStars;
  final double rating;

  const StatCard({
    super.key,
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
    required this.sublabel,
    this.showStars = false,
    this.rating = 0,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: AppColors.tintOn(color, c.isDark),
                  size: 18,
                ),
              ),
              const Spacer(),
              if (showStars)
                Row(
                  children: List.generate(5, (i) {
                    return Icon(
                      i < rating.floor()
                          ? Icons.star_rounded
                          : i < rating
                          ? Icons.star_half_rounded
                          : Icons.star_border_rounded,
                      color: AppColors.star,
                      size: 12,
                    );
                  }),
                ),
            ],
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(sublabel, style: TextStyle(color: c.textMuted, fontSize: 10)),
        ],
      ),
    );
  }
}
