import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';
import '../../../domain/models/provider_model.dart';
import 'card_action_buttons.dart';
import 'card_contact_actions.dart';
import 'card_helpers.dart';

/// Variante CONTENIDO — tarjeta horizontal (~115px) con imagen a la
/// izquierda y datos + acciones a la derecha.
class ServiceCardContent extends StatelessWidget {
  final ProviderModel provider;
  final VoidCallback? onTap;
  final VoidCallback? onFavoriteToggle;
  final bool isOwnCard;
  final VoidCallback? onGoToDashboard;
  final VoidCallback? onChat;

  const ServiceCardContent({
    super.key,
    required this.provider,
    this.onTap,
    this.onFavoriteToggle,
    this.isOwnCard = false,
    this.onGoToDashboard,
    this.onChat,
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
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor, width: premium ? 1.5 : 1.0),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: c.isDark ? 0.3 : 0.06),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            // Imagen cuadrada izquierda
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(15)),
              child: provider.coverImageUrl != null
                  ? AppNetworkImage(
                      url: provider.coverImageUrl!,
                      width: 95, height: 115,
                      fit: BoxFit.cover,
                      placeholder: _contentPlaceholder(c),
                      errorWidget: _contentPlaceholder(c),
                    )
                  : _contentPlaceholder(c),
            ),
            // Contenido derecho
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Nombre + plan badge
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
                            child: Icon(Icons.star_rounded, color: AppColors.premium, size: 14),
                          ),
                        if (provider.isVerified)
                          Padding(
                            padding: const EdgeInsets.only(left: 3),
                            child: Icon(Icons.verified_rounded, color: AppColors.verified, size: 14),
                          ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    // Categoría + disponibilidad
                    Row(
                      children: [
                        Text(
                          provider.categoryName,
                          style: TextStyle(color: c.textMuted, fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(width: 8),
                        Container(
                          width: 6, height: 6,
                          decoration: BoxDecoration(color: availColor, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 3),
                        Text(
                          provider.availability.label,
                          style: TextStyle(color: availColor, fontSize: 10, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    // Rating
                    Row(
                      children: [
                        Icon(Icons.star_rounded, color: AppColors.star, size: 12),
                        const SizedBox(width: 2),
                        Text(
                          '${provider.averageRating.toStringAsFixed(1)} (${provider.totalReviews})',
                          style: TextStyle(color: c.textSecondary, fontSize: 11),
                        ),
                      ],
                    ),
                    // Chips de servicios (máx 2)
                    if (provider.services.isNotEmpty) ...[
                      const SizedBox(height: 5),
                      Wrap(
                        spacing: 5,
                        runSpacing: 4,
                        children: provider.services.take(2).map((s) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.07),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                          ),
                          child: Text(
                            s.name,
                            style: const TextStyle(color: AppColors.primary, fontSize: 9.5, fontWeight: FontWeight.w500),
                          ),
                        )).toList(),
                      ),
                    ],
                    const SizedBox(height: 6),
                    // Tarjeta propia → botón panel; ajena → WA + llamar + favorito
                    if (isOwnCard)
                      GestureDetector(
                        onTap: onGoToDashboard,
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 10),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.dashboard_rounded, color: AppColors.primary, size: 13),
                              SizedBox(width: 5),
                              Text('Mi panel', style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                      )
                    else
                      Row(
                        children: [
                          CompactActionBtn(
                            icon: Icons.forum_rounded,
                            color: AppColors.amber,
                            onTap: onChat,
                          ),
                          if (isPaidPlan(plan)) ...[
                            const SizedBox(width: 6),
                            CompactActionBtn(
                              icon: Icons.chat_rounded,
                              color: AppColors.whatsapp,
                              onTap: () => CardContactActions.openWhatsApp(context, provider),
                            ),
                            const SizedBox(width: 6),
                            CompactActionBtn(
                              icon: Icons.call_rounded,
                              color: AppColors.call,
                              onTap: () => CardContactActions.makeCall(context, provider),
                            ),
                          ],
                          const SizedBox(width: 6),
                          CompactActionBtn(
                            icon: provider.isFavorite
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            color: provider.isFavorite ? AppColors.favorite : c.textMuted,
                            onTap: onFavoriteToggle,
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

  Widget _contentPlaceholder(AppThemeColors c) {
    return Container(
      width: 95, height: 115,
      color: c.bgInput,
      child: Icon(Icons.storefront_rounded, size: 28, color: c.textMuted),
    );
  }
}
