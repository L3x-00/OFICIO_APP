import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';
import '../../../domain/models/provider_model.dart';
import 'card_badges.dart';
import 'card_helpers.dart';

/// Foto de portada de la tarjeta principal con badges superpuestos:
/// plan, verificado, confiable y distancia.
class CoverImage extends StatelessWidget {
  final ProviderModel provider;
  const CoverImage({super.key, required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Stack(
      children: [
        ClipRRect(
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(24), topRight: Radius.circular(24),
          ),
          child: provider.coverImageUrl != null
              ? AppNetworkImage(
                  url: provider.coverImageUrl!,
                  height: 160,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  placeholder: _placeholder(c),
                  errorWidget: _placeholder(c),
                )
              : _placeholder(c),
        ),
        // Badge de plan — arriba a la izquierda (debajo de distancia si hay)
        if (isPremiumPlan(provider.subscriptionPlan))
          Positioned(
            top: provider.distanceKm != null ? 46 : 12,
            left: 12,
            child: PlanBadge.premium(),
          ),
        if (isStandardPlan(provider.subscriptionPlan))
          Positioned(
            top: provider.distanceKm != null ? 46 : 12,
            left: 12,
            child: PlanBadge.standard(),
          ),
        if (provider.isVerified &&
            (isPremiumPlan(provider.subscriptionPlan) || isStandardPlan(provider.subscriptionPlan)))
          Positioned(top: 12, right: 12, child: const VerifiedBadge()),
        if (provider.isTrusted)
          Positioned(top: provider.isVerified ? 44 : 12, right: 12, child: const TrustedBadge()),
        if (provider.distanceKm != null)
          Positioned(top: 12, left: 12, child: DistanceBadge(km: provider.distanceKm!)),
      ],
    );
  }

  Widget _placeholder(AppThemeColors c) {
    return Container(
      height: 160,
      width: double.infinity,
      color: c.bgInput,
      child: Icon(Icons.storefront_rounded, size: 48, color: c.textMuted),
    );
  }
}
