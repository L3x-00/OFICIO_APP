import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';
import '../../../domain/models/provider_model.dart';
import 'card_contact_actions.dart';
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
    final c = context.colors;
    final plan = provider.subscriptionPlan;
    final premium = isPremiumPlan(plan);
    final standard = isStandardPlan(plan);
    final availColor = switch (provider.availability) {
      AvailabilityStatus.disponible => AppColors.available,
      AvailabilityStatus.ocupado => AppColors.busy,
      AvailabilityStatus.conDemora => AppColors.delayed,
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
        // Alto fijo compacto: permite que la imagen RELLENE arriba/abajo sin
        // huecos. El contenido (≤3 líneas) entra holgado.
        height: 80,
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor),
        ),
        // ClipRRect redondea las esquinas (incl. la imagen flush a la izq).
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Row(
            children: [
              // CORRECCIÓN: la imagen llena TODO el alto de la tarjeta
              // (BoxFit.cover, flush a la izquierda) — sin padding vertical
              // ni centrado con espacios en blanco.
              SizedBox(
                width: 68,
                height: double.infinity,
                child: provider.coverImageUrl != null
                    ? AppNetworkImage(
                        url: provider.coverImageUrl!,
                        width: 68,
                        height: double.infinity,
                        fit: BoxFit.cover,
                        placeholder: _avatarFallback(c),
                        errorWidget: _avatarFallback(c),
                      )
                    : _avatarFallback(c),
              ),
              // Contenido + acciones (con su propio padding).
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 10, 8),
                  child: Row(
                    children: [
                      // Nombre + categoría + rating
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
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
                                    child: Icon(
                                      Icons.star_rounded,
                                      color: AppColors.premium,
                                      size: 13,
                                    ),
                                  ),
                                if (provider.isVerified && !premium)
                                  Padding(
                                    padding: const EdgeInsets.only(left: 4),
                                    child: Icon(
                                      Icons.verified_rounded,
                                      color: AppColors.verified,
                                      size: 13,
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              provider.categoryLabel,
                              style: TextStyle(
                                color: c.textMuted,
                                fontSize: 11,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(
                                  Icons.star_rounded,
                                  color: AppColors.star,
                                  size: 12,
                                ),
                                const SizedBox(width: 2),
                                Text(
                                  provider.averageRating.toStringAsFixed(1),
                                  style: TextStyle(
                                    color: c.textSecondary,
                                    fontSize: 11,
                                  ),
                                ),
                                Text(
                                  ' (${provider.totalReviews})',
                                  style: TextStyle(
                                    color: c.textMuted,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Acciones rápidas. Para planes ESTANDAR/PREMIUM exponemos
                      // WhatsApp + llamada incluso en la vista lista (incluyendo
                      // favoritos), para que la conversión no muera por falta de un
                      // CTA visible.
                      if (!isOwnCard && isPaidPlan(plan)) ...[
                        _MiniContactBtn(
                          svgAsset: 'assets/icons/whatsapp.svg',
                          color: AppColors.whatsapp,
                          onTap: () => CardContactActions.openWhatsApp(
                            context,
                            provider,
                          ),
                        ),
                        const SizedBox(width: 6),
                        _MiniContactBtn(
                          icon: Icons.call_rounded,
                          color: AppColors.call,
                          onTap: () =>
                              CardContactActions.makeCall(context, provider),
                        ),
                        const SizedBox(width: 6),
                      ],
                      // Disponibilidad dot + favorito (oculto si es tarjeta propia)
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: availColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          if (!isOwnCard) ...[
                            const SizedBox(height: 10),
                            GestureDetector(
                              onTap: onFavoriteToggle,
                              child: Icon(
                                provider.isFavorite
                                    ? Icons.favorite_rounded
                                    : Icons.favorite_border_rounded,
                                color: provider.isFavorite
                                    ? AppColors.favorite
                                    : c.textMuted,
                                size: 18,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _avatarFallback(AppThemeColors c) {
    final initial = provider.businessName.isNotEmpty
        ? provider.businessName[0].toUpperCase()
        : '?';
    return Container(
      width: double.infinity,
      height: double.infinity,
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

/// Botón redondo compacto (32×32) para WhatsApp / llamada dentro de la
/// fila de la variante Lista. Más pequeño que `IconActionButton` del
/// default card porque comparte espacio con el dot de disponibilidad y
/// el corazón de favorito.
class _MiniContactBtn extends StatelessWidget {
  final IconData? icon;
  final String? svgAsset;
  final Color color;
  final VoidCallback onTap;
  const _MiniContactBtn({
    this.icon,
    this.svgAsset,
    required this.color,
    required this.onTap,
  }) : assert(icon != null || svgAsset != null);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Center(
          child: svgAsset != null
              ? SvgPicture.asset(svgAsset!, width: 16, height: 16)
              : Icon(icon, color: color, size: 16),
        ),
      ),
    );
  }
}
