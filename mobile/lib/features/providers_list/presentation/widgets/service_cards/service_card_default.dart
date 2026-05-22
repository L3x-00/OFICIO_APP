import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../domain/models/provider_model.dart';
import 'card_action_buttons.dart';
import 'card_cover_image.dart';
import 'card_helpers.dart';
import 'card_provider_info.dart';
import 'card_service_chips.dart';

/// Tarjeta principal de servicio — variante por defecto ("detalles").
class ServiceCardDefault extends StatelessWidget {
  final ProviderModel provider;
  final VoidCallback? onTap;
  final VoidCallback? onFavoriteToggle;
  /// true cuando el usuario autenticado es dueño de esta tarjeta
  final bool isOwnCard;
  /// Navega al panel del proveedor (solo cuando isOwnCard == true)
  final VoidCallback? onGoToDashboard;
  /// Abre el chat interno con este proveedor
  final VoidCallback? onChat;

  const ServiceCardDefault({
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
    final c       = context.colors;
    final plan    = provider.subscriptionPlan;
    final premium  = isPremiumPlan(plan);
    final standard = isStandardPlan(plan);

    // Colores de borde y sombra según plan
    final borderColor = premium
        ? AppColors.premium.withValues(alpha: 0.7)
        : standard
            ? AppColors.standard.withValues(alpha: 0.5)
            : c.border;

    final shadowColor = premium
        ? AppColors.premium.withValues(alpha: 0.25)
        : standard
            ? AppColors.standard.withValues(alpha: 0.15)
            : Colors.black.withValues(alpha: c.isDark ? 0.35 : 0.08);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: borderColor,
            width: (premium || standard) ? 1.5 : 1.0,
          ),
          boxShadow: [
            BoxShadow(
              color: shadowColor,
              blurRadius: premium ? 20 : 12,
              offset: const Offset(0, 6),
            ),
          ],
          // Gradiente sutil de fondo para premium
          gradient: premium
              ? LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppColors.premium.withValues(alpha: c.isDark ? 0.07 : 0.04),
                    c.bgCard,
                    c.bgCard,
                  ],
                )
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CoverImage(provider: provider),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: ProviderInfo(provider: provider),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: RatingRowData(provider: provider),
            ),
            if (provider.type == ProviderType.negocio && provider.thumbnailUrls.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                child: ThumbnailRow(urls: provider.thumbnailUrls),
              ),
            // Chips de servicios (OFICIO) o productos (NEGOCIO)
            if (provider.services.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                child: ServicesRow(
                  services: provider.services,
                  provider: provider,
                  isNegocio: provider.type == ProviderType.negocio,
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: ActionButtons(
                provider: provider,
                onFavoriteToggle: onFavoriteToggle,
                isOwnCard: isOwnCard,
                onGoToDashboard: onGoToDashboard,
                onChat: onChat,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
