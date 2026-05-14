import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';
import '../../../domain/models/provider_model.dart';
import 'card_badges.dart';
import 'card_helpers.dart';

/// Variante MOSAICO — tile para grilla de 2 columnas.
class ServiceCardMosaic extends StatelessWidget {
  final ProviderModel provider;
  final VoidCallback? onTap;
  final bool isOwnCard;

  const ServiceCardMosaic({
    super.key,
    required this.provider,
    this.onTap,
    this.isOwnCard = false,
  });

  @override
  Widget build(BuildContext context) {
    final c        = context.colors;
    final plan     = provider.subscriptionPlan;
    final premium  = isPremiumPlan(plan);
    final standard = isStandardPlan(plan);

    final borderColor = premium
        ? AppColors.premium.withValues(alpha: 0.65)
        : standard
            ? AppColors.standard.withValues(alpha: 0.45)
            : c.border;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor, width: premium ? 1.5 : 1.0),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: c.isDark ? 0.3 : 0.07),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Imagen de portada con badges superpuestos
            Expanded(
              flex: 6,
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                    child: provider.coverImageUrl != null
                        ? AppNetworkImage(
                            url: provider.coverImageUrl!,
                            width: double.infinity,
                            height: double.infinity,
                            fit: BoxFit.cover,
                            placeholder: _mosaicPlaceholder(c),
                            errorWidget: _mosaicPlaceholder(c),
                          )
                        : _mosaicPlaceholder(c),
                  ),
                  // Badge de plan
                  if (premium)
                    Positioned(
                      top: 6, left: 6,
                      child: PlanBadge.premium(),
                    ),
                  if (standard && !premium)
                    Positioned(
                      top: 6, left: 6,
                      child: PlanBadge.standard(),
                    ),
                  // Verified + trusted badges
                  if (provider.isVerified)
                    Positioned(
                      top: 6, right: 6,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: AppColors.verified.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.verified_rounded, color: Colors.white, size: 12),
                      ),
                    ),
                  if (provider.isTrusted)
                    Positioned(
                      top: provider.isVerified ? 32 : 6, right: 6,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.shield_rounded, color: Colors.white, size: 12),
                      ),
                    ),
                ],
              ),
            ),
            // Info bajo imagen
            Expanded(
              flex: 4,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      provider.businessName,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        height: 1.2,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Row(
                      children: [
                        Icon(Icons.star_rounded, color: AppColors.star, size: 11),
                        const SizedBox(width: 2),
                        Text(
                          provider.averageRating.toStringAsFixed(1),
                          style: TextStyle(color: c.textSecondary, fontSize: 10),
                        ),
                        const Spacer(),
                        Text(
                          provider.categoryName,
                          style: TextStyle(color: c.textMuted, fontSize: 9),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _mosaicPlaceholder(AppThemeColors c) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      color: c.bgInput,
      child: Icon(Icons.storefront_rounded, size: 32, color: c.textMuted),
    );
  }
}
