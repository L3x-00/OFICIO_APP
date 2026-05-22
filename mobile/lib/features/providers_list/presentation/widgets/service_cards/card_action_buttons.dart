import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../domain/models/provider_model.dart';
import 'card_contact_actions.dart';
import 'card_helpers.dart';

/// Fila de botones de acción de la tarjeta principal.
///
/// Plan gating: GRATIS sólo expone el chat interno; ESTANDAR y PREMIUM
/// muestran chat + WhatsApp + llamada. Si es la tarjeta del propio
/// proveedor, se reemplaza por el botón "Ir a mi panel".
class ActionButtons extends StatelessWidget {
  final ProviderModel provider;
  final VoidCallback? onFavoriteToggle;
  final bool isOwnCard;
  final VoidCallback? onGoToDashboard;
  final VoidCallback? onChat;
  const ActionButtons({
    super.key,
    required this.provider,
    this.onFavoriteToggle,
    this.isOwnCard = false,
    this.onGoToDashboard,
    this.onChat,
  });

  @override
  Widget build(BuildContext context) {
    if (isOwnCard) {
      return GestureDetector(
        onTap: onGoToDashboard,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.dashboard_rounded, color: AppColors.primary, size: 18),
              SizedBox(width: 7),
              Text('Ir a mi panel', style: TextStyle(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      );
    }

    // Plan gating: GRATIS sólo expone el chat interno; ESTANDAR y PREMIUM
    // muestran chat + WhatsApp + llamada.
    final paid = isPaidPlan(provider.subscriptionPlan);

    return Row(
      children: [
        Expanded(child: IconActionButton(
          icon: Icons.forum_rounded,
          color: AppColors.amber,
          onTap: onChat,
        )),
        if (paid) ...[
          const SizedBox(width: 8),
          Expanded(child: IconActionButton(
            svgAsset: 'assets/icons/whatsapp.svg',
            color: AppColors.whatsapp,
            onTap: () => CardContactActions.openWhatsApp(context, provider),
          )),
          const SizedBox(width: 8),
          Expanded(child: IconActionButton(
            icon: Icons.call_rounded,
            color: AppColors.call,
            onTap: () => CardContactActions.makeCall(context, provider),
          )),
        ],
        const SizedBox(width: 8),
        FavoriteButton(isFavorite: provider.isFavorite, onToggle: onFavoriteToggle),
      ],
    );
  }
}

/// Acción de contacto sólo-icono, ocupa el ancho de su padre.
class IconActionButton extends StatelessWidget {
  final IconData? icon;
  final String? svgAsset;
  final Color color;
  final VoidCallback? onTap;
  const IconActionButton({
    super.key,
    this.icon,
    this.svgAsset,
    required this.color,
    this.onTap,
  }) : assert(icon != null || svgAsset != null);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 11),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Center(
          child: svgAsset != null
              ? SvgPicture.asset(svgAsset!, width: 20, height: 20)
              : Icon(icon, color: color, size: 20),
        ),
      ),
    );
  }
}

/// Botón de favorito con animación de color al alternar.
class FavoriteButton extends StatelessWidget {
  final bool isFavorite;
  final VoidCallback? onToggle;
  const FavoriteButton({super.key, required this.isFavorite, this.onToggle});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onToggle,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isFavorite ? AppColors.favorite.withValues(alpha: 0.15) : c.bgInput,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isFavorite ? AppColors.favorite.withValues(alpha: 0.4) : c.border),
        ),
        child: Icon(
          isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
          color: isFavorite ? AppColors.favorite : c.textMuted,
          size: 22,
        ),
      ),
    );
  }
}

/// Botón de acción compacto (30×30) usado por la variante "Contenido".
class CompactActionBtn extends StatelessWidget {
  final IconData? icon;
  final String? svgAsset;
  final Color color;
  final VoidCallback? onTap;
  const CompactActionBtn({
    super.key,
    this.icon,
    this.svgAsset,
    required this.color,
    this.onTap,
  }) : assert(icon != null || svgAsset != null);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30, height: 30,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Center(
          child: svgAsset != null
              ? SvgPicture.asset(svgAsset!, width: 15, height: 15)
              : Icon(icon, color: color, size: 15),
        ),
      ),
    );
  }
}
