import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/user_profile_sheet.dart';
import '../../domain/models/review_model.dart';
import '../sheets/review_detail_sheet.dart';

/// Tarjeta resumen de una reseña. Al tocarla abre el [ReviewDetailSheet]
/// con el hilo completo de respuestas.
class ReviewCard extends StatelessWidget {
  final ReviewModel review;
  final int providerUserId;
  const ReviewCard({
    super.key,
    required this.review,
    required this.providerUserId,
  });

  void _openDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          ReviewDetailSheet(review: review, providerUserId: providerUserId),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: () => _openDetail(context),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: c.border.withValues(alpha: 0.5),
            width: 0.5,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                GestureDetector(
                  onTap: () => showUserProfileSheet(
                    context,
                    userId: review.userId,
                    seedName: review.user?.fullName,
                    seedAvatarUrl: review.user?.avatarUrl,
                  ),
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: c.bgInput,
                    backgroundImage: review.user?.avatarUrl != null
                        ? NetworkImage(review.user!.avatarUrl!)
                        : null,
                    child: review.user?.avatarUrl == null
                        ? Text(
                            review.user?.initial ?? '?',
                            style: TextStyle(
                              color: AppColors.primaryDark,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : null,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        review.user?.fullName ?? 'Usuario',
                        style: TextStyle(
                          color: c.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      RatingBarIndicator(
                        rating: review.rating.toDouble(),
                        itemBuilder: (_, _) => const Icon(
                          Icons.star_rounded,
                          color: AppColors.star,
                        ),
                        itemCount: 5,
                        itemSize: 14,
                      ),
                    ],
                  ),
                ),
                Text(
                  _formatDate(review.createdAt),
                  style: TextStyle(color: c.textMuted, fontSize: 11),
                ),
                const SizedBox(width: 6),
                Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 16),
              ],
            ),
            if (review.comment != null && review.comment!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  review.comment!,
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 13,
                    height: 1.5,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            if (review.photoUrl.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: c.border.withValues(alpha: 0.5),
                          width: 0.5,
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          review.photoUrl,
                          height: 60,
                          width: 60,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const SizedBox.shrink(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Ver foto',
                      style: TextStyle(
                        color: AppColors.primaryDark,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) return 'Hoy';
    if (diff.inDays == 1) return 'Ayer';
    if (diff.inDays < 7) return 'Hace ${diff.inDays} días';
    if (diff.inDays < 30) return 'Hace ${(diff.inDays / 7).floor()} sem.';
    if (diff.inDays < 365) return 'Hace ${(diff.inDays / 30).floor()} mes.';
    return 'Hace ${(diff.inDays / 365).floor()} año(s)';
  }
}
