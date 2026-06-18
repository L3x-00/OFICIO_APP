import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../domain/models/provider_model.dart';
import 'card_badges.dart';
import 'card_contact_actions.dart';
import 'card_helpers.dart';
import 'card_image_carousel.dart';

/// Variante MOSAICO — tile para grilla de 2 columnas.
class ServiceCardMosaic extends StatelessWidget {
  final ProviderModel provider;
  final VoidCallback? onTap;
  final bool isOwnCard;
  final VoidCallback? onChat;
  // Favorito: el botón reapareció en el tile mosaico (se perdió al pasar a
  // cuadros pequeños). El estado visual sale de `provider.isFavorite`.
  final VoidCallback? onFavoriteToggle;

  const ServiceCardMosaic({
    super.key,
    required this.provider,
    this.onTap,
    this.isOwnCard = false,
    this.onChat,
    this.onFavoriteToggle,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final plan = provider.subscriptionPlan;
    final premium = isPremiumPlan(plan);
    final standard = isStandardPlan(plan);
    // Ubicación SIEMPRE desde la BD (sin geocoding por tile — performance).
    final locationLabel = districtProvinceLabel(provider);

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
                  Positioned.fill(
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(15),
                      ),
                      child: ProviderImageCarousel(
                        provider: provider,
                        fit: BoxFit.cover,
                        placeholder: _mosaicPlaceholder(c),
                        errorWidget: _mosaicPlaceholder(c),
                      ),
                    ),
                  ),
                  // Badge de plan
                  if (premium)
                    Positioned(top: 6, left: 6, child: PlanBadge.premium()),
                  if (standard && !premium)
                    Positioned(top: 6, left: 6, child: PlanBadge.standard()),
                  // Verified + trusted badges
                  if (provider.isVerified)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: AppColors.verified.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.verified_rounded,
                          color: Colors.white,
                          size: 12,
                        ),
                      ),
                    ),
                  if (provider.isTrusted)
                    Positioned(
                      top: provider.isVerified ? 32 : 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.shield_rounded,
                          color: Colors.white,
                          size: 12,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Info bajo imagen
            Expanded(
              flex: 4,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Nombre (1 línea — deja espacio a ubicación + acciones)
                    Text(
                      provider.businessName,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                        height: 1.15,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    // Ubicación "Distrito, Provincia" (BD — sin geocoding).
                    if (locationLabel != null) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            Icons.location_on_outlined,
                            size: 11,
                            color: c.textMuted,
                          ),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Text(
                              locationLabel,
                              style: TextStyle(
                                color: c.textMuted,
                                fontSize: 10,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const Spacer(),
                    // Estado (dot OFICIO / badge Abierto-Cerrado NEGOCIO) +
                    // acciones rápidas. FittedBox evita overflow si no caben.
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Row(
                        children: [
                          _MosaicStatusBadge(provider: provider),
                          if (!isOwnCard) ...[
                            if (onFavoriteToggle != null) ...[
                              const SizedBox(width: 8),
                              _GridContactBtn(
                                icon: provider.isFavorite
                                    ? Icons.favorite_rounded
                                    : Icons.favorite_border_rounded,
                                color: AppColors.busy,
                                onTap: onFavoriteToggle,
                              ),
                            ],
                            const SizedBox(width: 8),
                            _GridContactBtn(
                              icon: Icons.forum_rounded,
                              color: AppColors.amber,
                              onTap: onChat,
                            ),
                            if (isPaidPlan(plan) && provider.showWhatsapp) ...[
                              const SizedBox(width: 5),
                              _GridContactBtn(
                                svgAsset: 'assets/icons/whatsapp.svg',
                                color: AppColors.whatsapp,
                                onTap: () => CardContactActions.openWhatsApp(
                                  context,
                                  provider,
                                ),
                              ),
                            ],
                            if (isPaidPlan(plan) && provider.showPhone) ...[
                              const SizedBox(width: 5),
                              _GridContactBtn(
                                icon: Icons.call_rounded,
                                color: AppColors.call,
                                onTap: () => CardContactActions.makeCall(
                                  context,
                                  provider,
                                ),
                              ),
                            ],
                          ],
                        ],
                      ),
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

/// Botón cuadrado mini (22×22) para WhatsApp / llamada dentro de la
/// grilla 2-col. Espacio muy reducido — íconos sin etiquetas.
class _GridContactBtn extends StatelessWidget {
  final IconData? icon;
  final String? svgAsset;
  final Color color;
  final VoidCallback? onTap;
  const _GridContactBtn({
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
        width: 22,
        height: 22,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Center(
          child: svgAsset != null
              ? SvgPicture.asset(svgAsset!, width: 12, height: 12)
              : Icon(icon, color: color, size: 12),
        ),
      ),
    );
  }
}

/// Pastilla de estado del tile mosaico:
///   • OFICIO   → dot de color por disponibilidad + etiqueta.
///   • NEGOCIO  → "Abierto" (verde) / "Cerrado" (rojo) según disponibilidad.
class _MosaicStatusBadge extends StatelessWidget {
  final ProviderModel provider;
  const _MosaicStatusBadge({required this.provider});

  @override
  Widget build(BuildContext context) {
    final p = provider;
    final Color color;
    final String label;

    if (p.type == ProviderType.negocio) {
      final open = isBusinessOpen(p);
      color = open ? AppColors.available : AppColors.busy;
      label = open ? 'Abierto' : 'Cerrado';
    } else {
      color = switch (p.availability) {
        AvailabilityStatus.disponible => AppColors.available,
        AvailabilityStatus.ocupado => AppColors.busy,
        AvailabilityStatus.conDemora => AppColors.delayed,
      };
      label = p.availability.label;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.30)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 9,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
