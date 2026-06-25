import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../domain/models/provider_model.dart';
import 'card_badges.dart';
import 'card_helpers.dart';
import 'card_image_carousel.dart';

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
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
          child: ProviderImageCarousel(
            provider: provider,
            height: 160,
            width: double.infinity,
            fit: BoxFit.cover,
            placeholder: _placeholder(c),
            errorWidget: _placeholder(c),
          ),
        ),
        // Badges de plan/estado — esquina superior DERECHA, apilados
        // verticalmente (plan arriba, verificado y confiable debajo).
        Positioned(
          top: 12,
          right: 12,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (isPremiumPlan(provider.subscriptionPlan)) ...[
                PlanBadge.premium(),
                const SizedBox(height: 6),
              ],
              if (isStandardPlan(provider.subscriptionPlan)) ...[
                PlanBadge.standard(),
                const SizedBox(height: 6),
              ],
              if (provider.isVerified &&
                  (isPremiumPlan(provider.subscriptionPlan) ||
                      isStandardPlan(provider.subscriptionPlan))) ...[
                const VerifiedBadge(),
                const SizedBox(height: 6),
              ],
              if (provider.isTrusted) const TrustedBadge(),
            ],
          ),
        ),
        if (provider.distanceKm != null)
          Positioned(
            top: 12,
            left: 12,
            child: DistanceBadge(km: provider.distanceKm!),
          ),
        // Badge "A domicilio" abajo-izquierda en OFICIO con toggle activo —
        // antes solo aparecía dentro del detail sheet, así que el usuario
        // no sabía desde la lista quién atiende a domicilio.
        if (provider.type == ProviderType.oficio && provider.hasHomeService)
          const Positioned(bottom: 10, left: 12, child: HomeServiceBadge()),
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
