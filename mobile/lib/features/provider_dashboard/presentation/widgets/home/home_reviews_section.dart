import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../providers_list/domain/models/review_model.dart';

/// Sección "Últimas reseñas" (máx. 3 visibles). Muestra skeleton mientras
/// carga, empty state si no hay reseñas, y un botón "Ver todas →" que
/// invoca [onViewAll].
class HomeReviewsSection extends StatelessWidget {
  final bool isLoading;
  final List<ReviewModel> reviews;
  final VoidCallback onViewAll;

  const HomeReviewsSection({
    super.key,
    required this.isLoading,
    required this.reviews,
    required this.onViewAll,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Últimas reseñas',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (reviews.isNotEmpty)
                TextButton(
                  onPressed: onViewAll,
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'Ver todas →',
                    style: TextStyle(color: AppColors.amber, fontSize: 13),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (isLoading)
            ReviewSkeleton()
          else if (reviews.isEmpty)
            EmptyReviews()
          else
            ...reviews.take(3).map((r) => ReviewCard(review: r)),
        ],
      ),
    );
  }
}

/// Tarjeta individual de reseña: avatar, nombre, fecha, estrellas y
/// comentario (máx. 3 líneas).
class ReviewCard extends StatelessWidget {
  final ReviewModel review;
  const ReviewCard({super.key, required this.review});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final rating  = review.rating;
    final comment = review.comment;
    final user    = review.user;
    final name    = user?.fullName ?? 'Anónimo';
    final initial = user?.initial ?? '?';
    final date    = review.createdAt;
    final dateStr = '${date.day}/${date.month}/${date.year}';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: c.warmDeep,
                backgroundImage: user?.avatarUrl != null
                    ? NetworkImage(user!.avatarUrl!)
                    : null,
                child: user?.avatarUrl == null
                    ? Text(initial, style: TextStyle(color: AppColors.amber, fontWeight: FontWeight.bold))
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: TextStyle(color: c.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                    Text(dateStr, style: TextStyle(color: c.textMuted, fontSize: 11)),
                  ],
                ),
              ),
              Row(
                children: List.generate(
                  5,
                  (i) => Icon(
                    i < rating ? Icons.star_rounded : Icons.star_border_rounded,
                    color: AppColors.star,
                    size: 14,
                  ),
                ),
              ),
            ],
          ),
          if (comment != null && comment.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              comment,
              style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

/// Placeholder de carga — dos bloques grises mientras llegan las reseñas.
class ReviewSkeleton extends StatelessWidget {
  const ReviewSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      children: List.generate(
        2,
        (_) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          height: 80,
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }
}

/// Estado vacío cuando el proveedor aún no tiene reseñas.
class EmptyReviews extends StatelessWidget {
  const EmptyReviews({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.reviews_rounded, color: c.textMuted, size: 32),
            SizedBox(height: 8),
            Text(
              'Aún no tienes reseñas',
              style: TextStyle(color: c.textMuted, fontSize: 13),
            ),
            SizedBox(height: 4),
            Text(
              'Comparte tu perfil para recibir las primeras',
              style: TextStyle(color: c.textMuted, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
