import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';
import '../../../domain/models/provider_model.dart';
import 'card_helpers.dart';

/// Variante LISTA — fila compacta (~72px) para el modo de vista en lista.
class ServiceCardList extends StatelessWidget {
  final ProviderModel provider;
  final VoidCallback? onTap;
  final VoidCallback? onFavoriteToggle;
  final bool isOwnCard;

  const ServiceCardList({
    super.key,
    required this.provider,
    this.onTap,
    this.onFavoriteToggle,
    this.isOwnCard = false,
  });

  @override
  Widget build(BuildContext context) {
    final c         = context.colors;
    final plan      = provider.subscriptionPlan;
    final premium   = isPremiumPlan(plan);
    final standard  = isStandardPlan(plan);
    final availColor = switch (provider.availability) {
      AvailabilityStatus.disponible => AppColors.available,
      AvailabilityStatus.ocupado    => AppColors.busy,
      AvailabilityStatus.conDemora  => AppColors.delayed,
    };

    final borderColor = premium
        ? AppColors.premium.withValues(alpha: 0.6)
        : standard
            ? AppColors.standard.withValues(alpha: 0.4)
            : c.border;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor),
        ),
        child: Row(
          children: [
            // Avatar: foto de portada o inicial
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: provider.coverImageUrl != null
                  ? AppNetworkImage(
                      url: provider.coverImageUrl!,
                      width: 48, height: 48,
                      fit: BoxFit.cover,
                      placeholder: _avatarFallback(c),
                      errorWidget: _avatarFallback(c),
                    )
                  : _avatarFallback(c),
            ),
            const SizedBox(width: 12),
            // Nombre + categoría
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          provider.businessName,
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (premium)
                        Padding(
                          padding: const EdgeInsets.only(left: 4),
                          child: Icon(Icons.star_rounded, color: AppColors.premium, size: 13),
                        ),
                      if (provider.isVerified && !premium)
                        Padding(
                          padding: const EdgeInsets.only(left: 4),
                          child: Icon(Icons.verified_rounded, color: AppColors.verified, size: 13),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    provider.categoryName,
                    style: TextStyle(color: c.textMuted, fontSize: 11),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.star_rounded, color: AppColors.star, size: 12),
                      const SizedBox(width: 2),
                      Text(
                        provider.averageRating.toStringAsFixed(1),
                        style: TextStyle(color: c.textSecondary, fontSize: 11),
                      ),
                      Text(
                        ' (${provider.totalReviews})',
                        style: TextStyle(color: c.textMuted, fontSize: 10),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Disponibilidad dot + favorito (oculto si es tarjeta propia)
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 8, height: 8,
                  decoration: BoxDecoration(color: availColor, shape: BoxShape.circle),
                ),
                if (!isOwnCard) ...[
                  const SizedBox(height: 10),
                  GestureDetector(
                    onTap: onFavoriteToggle,
                    child: Icon(
                      provider.isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                      color: provider.isFavorite ? AppColors.favorite : c.textMuted,
                      size: 18,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _avatarFallback(AppThemeColors c) {
    final initial = provider.businessName.isNotEmpty
        ? provider.businessName[0].toUpperCase()
        : '?';
    return Container(
      width: 48, height: 48,
      color: AppColors.primary.withValues(alpha: 0.15),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: AppColors.primary,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
