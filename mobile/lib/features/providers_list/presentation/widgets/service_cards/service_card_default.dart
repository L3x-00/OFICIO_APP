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
class ServiceCardDefault extends StatefulWidget {
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
  State<ServiceCardDefault> createState() => _ServiceCardDefaultState();
}

class _ServiceCardDefaultState extends State<ServiceCardDefault> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed != value) setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final provider = widget.provider;
    final c = context.colors;
    final plan = provider.subscriptionPlan;
    final premium = isPremiumPlan(plan);
    final standard = isStandardPlan(plan);

    // Colores de borde y sombra según plan
    final borderColor = premium
        ? AppColors.premium.withValues(alpha: 0.35)
        : standard
        ? AppColors.standard.withValues(alpha: 0.18)
        : c.border;

    final shadowColor = premium
        ? AppColors.premium.withValues(alpha: 0.12)
        : standard
        ? AppColors.standard.withValues(alpha: 0.06)
        : Colors.black.withValues(alpha: c.isDark ? 0.18 : 0.06);

    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => _setPressed(true),
      onTapUp: (_) => _setPressed(false),
      onTapCancel: () => _setPressed(false),
      child: AnimatedScale(
        scale: _pressed ? 0.975 : 1.0,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        child: Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: borderColor, width: premium ? 1.0 : 0.5),
            boxShadow: [
              BoxShadow(
                color: shadowColor,
                blurRadius: premium ? 8 : 6,
                offset: const Offset(0, 3),
              ),
            ],
            // Gradiente premium casi imperceptible
            gradient: premium
                ? LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.premium.withValues(
                        alpha: c.isDark ? 0.05 : 0.025,
                      ),
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
              if (provider.type == ProviderType.negocio &&
                  provider.thumbnailUrls.isNotEmpty)
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
                  onFavoriteToggle: widget.onFavoriteToggle,
                  isOwnCard: widget.isOwnCard,
                  onGoToDashboard: widget.onGoToDashboard,
                  onChat: widget.onChat,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
