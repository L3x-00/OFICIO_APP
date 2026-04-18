import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/constans/app_strings.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../domain/models/provider_model.dart';

// ─── Helpers de plan ─────────────────────────────────────────
bool _isPremium(String plan) => plan == 'PREMIUM';
bool _isStandard(String plan) => plan == 'ESTANDAR' || plan == 'BASICO';

/// Tarjeta principal de servicio
class ServiceCard extends StatelessWidget {
  final ProviderModel provider;
  final VoidCallback? onTap;
  final VoidCallback? onFavoriteToggle;
  /// true cuando el usuario autenticado es dueño de esta tarjeta
  final bool isOwnCard;
  /// Navega al panel del proveedor (solo cuando isOwnCard == true)
  final VoidCallback? onGoToDashboard;

  const ServiceCard({
    super.key,
    required this.provider,
    this.onTap,
    this.onFavoriteToggle,
    this.isOwnCard = false,
    this.onGoToDashboard,
  });

  @override
  Widget build(BuildContext context) {
    final c       = context.colors;
    final plan    = provider.subscriptionPlan;
    final premium  = _isPremium(plan);
    final standard = _isStandard(plan);

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
            _CoverImage(provider: provider),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: _ProviderInfo(provider: provider),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: _RatingRowData(provider: provider),
            ),
            if (provider.type == ProviderType.negocio && provider.thumbnailUrls.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                child: _ThumbnailRow(urls: provider.thumbnailUrls),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: _ActionButtons(
                provider: provider,
                onFavoriteToggle: onFavoriteToggle,
                isOwnCard: isOwnCard,
                onGoToDashboard: onGoToDashboard,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Foto de portada ──────────────────────────────────────

class _CoverImage extends StatelessWidget {
  final ProviderModel provider;
  const _CoverImage({required this.provider});

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
              ? CachedNetworkImage(
                  imageUrl: provider.coverImageUrl!,
                  height: 160,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  placeholder: (_, _) => _placeholder(c),
                  errorWidget: (_, _, _) => _placeholder(c),
                )
              : _placeholder(c),
        ),
        // Badge de plan — arriba a la izquierda (debajo de distancia si hay)
        if (_isPremium(provider.subscriptionPlan))
          Positioned(
            top: provider.distanceKm != null ? 46 : 12,
            left: 12,
            child: _PlanBadge.premium(),
          ),
        if (_isStandard(provider.subscriptionPlan))
          Positioned(
            top: provider.distanceKm != null ? 46 : 12,
            left: 12,
            child: _PlanBadge.standard(),
          ),
        if (provider.isVerified)
          Positioned(top: 12, right: 12, child: _VerifiedBadge()),
        if (provider.distanceKm != null)
          Positioned(top: 12, left: 12, child: _DistanceBadge(km: provider.distanceKm!)),
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

// ─── Nombre y categoría ───────────────────────────────────

class _ProviderInfo extends StatelessWidget {
  final ProviderModel provider;
  const _ProviderInfo({required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          provider.businessName,
          style: TextStyle(color: c.textPrimary, fontSize: 17, fontWeight: FontWeight.bold, letterSpacing: 0.3),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 4),
        Text(provider.categoryName, style: TextStyle(color: c.textSecondary, fontSize: 13)),
      ],
    );
  }
}

// ─── Estrellas + disponibilidad ───────────────────────────

class _RatingRowData extends StatelessWidget {
  final ProviderModel provider;
  const _RatingRowData({required this.provider});

  @override
  Widget build(BuildContext context) {
    final c          = context.colors;
    final availColor = switch (provider.availability) {
      AvailabilityStatus.disponible => AppColors.available,
      AvailabilityStatus.ocupado    => AppColors.busy,
      AvailabilityStatus.conDemora  => AppColors.delayed,
    };

    return Row(
      children: [
        RatingBarIndicator(
          rating: provider.averageRating,
          itemBuilder: (_, _) => const Icon(Icons.star_rounded, color: AppColors.star),
          itemCount: 5,
          itemSize: 18,
        ),
        const SizedBox(width: 6),
        Text(
          '${provider.averageRating.toStringAsFixed(1)} (${provider.totalReviews})',
          style: TextStyle(color: c.textSecondary, fontSize: 12),
        ),
        if (provider.totalRecommendations > 0) ...[
          const SizedBox(width: 8),
          Icon(Icons.thumb_up_rounded, size: 12, color: c.textMuted),
          const SizedBox(width: 3),
          Text('${provider.totalRecommendations}', style: TextStyle(color: c.textMuted, fontSize: 11)),
        ],
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: availColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: availColor.withValues(alpha: 0.4)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 7, height: 7, decoration: BoxDecoration(color: availColor, shape: BoxShape.circle)),
              const SizedBox(width: 5),
              Text(provider.availability.label, style: TextStyle(color: availColor, fontSize: 11, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Miniaturas de productos ──────────────────────────────

class _ThumbnailRow extends StatelessWidget {
  final List<String> urls;
  const _ThumbnailRow({required this.urls});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SizedBox(
      height: 64,
      child: Row(
        children: urls.map((url) => Padding(
          padding: const EdgeInsets.only(right: 8),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: CachedNetworkImage(
              imageUrl: url,
              width: 64, height: 64,
              fit: BoxFit.cover,
              placeholder: (_, _) => Container(width: 64, height: 64, color: c.bgInput),
              errorWidget: (_, _, _) => Container(
                width: 64, height: 64,
                color: c.bgInput,
                child: Icon(Icons.image_not_supported, color: c.textMuted, size: 24),
              ),
            ),
          ),
        )).toList(),
      ),
    );
  }
}

// ─── Botones de acción ────────────────────────────────────

class _ActionButtons extends StatelessWidget {
  final ProviderModel provider;
  final VoidCallback? onFavoriteToggle;
  final bool isOwnCard;
  final VoidCallback? onGoToDashboard;
  const _ActionButtons({required this.provider, this.onFavoriteToggle, this.isOwnCard = false, this.onGoToDashboard});

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
    return Row(
      children: [
        Expanded(child: _ContactButton(label: 'WhatsApp', icon: Icons.chat_rounded, color: AppColors.whatsapp, onTap: () => _openWhatsApp())),
        const SizedBox(width: 8),
        Expanded(child: _ContactButton(label: 'Llamar',   icon: Icons.call_rounded,  color: AppColors.call,    onTap: () => _makeCall())),
        const SizedBox(width: 8),
        _FavoriteButton(isFavorite: provider.isFavorite, onToggle: onFavoriteToggle),
      ],
    );
  }

  Future<void> _openWhatsApp() async {
    final number  = (provider.whatsapp ?? provider.phone).replaceAll(RegExp(r'[\s\-\(\)]'), '');
    final message = Uri.encodeComponent(AppStrings.whatsappMessage(provider.businessName));
    final native  = Uri.parse('whatsapp://send?phone=$number&text=$message');
    final web     = Uri.parse('https://wa.me/$number?text=$message');
    if (await canLaunchUrl(native)) {
      await launchUrl(native);
    } else {
      await launchUrl(web, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _makeCall() async {
    final uri = Uri.parse('tel:${provider.phone}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }
}

class _ContactButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _ContactButton({required this.label, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}


class _FavoriteButton extends StatelessWidget {
  final bool isFavorite;
  final VoidCallback? onToggle;
  const _FavoriteButton({required this.isFavorite, this.onToggle});

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

class _VerifiedBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.verified.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppColors.verified.withValues(alpha: 0.4), blurRadius: 8)],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified_rounded, color: Colors.white, size: 14),
          SizedBox(width: 4),
          Text('Verificado', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _DistanceBadge extends StatelessWidget {
  final double km;
  const _DistanceBadge({required this.km});

  @override
  Widget build(BuildContext context) {
    final label = km < 1 ? '${(km * 1000).toInt()} m' : '${km.toStringAsFixed(1)} km';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 13),
          const SizedBox(width: 3),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

// ─── Badge de plan de suscripción ────────────────────────────

class _PlanBadge extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final Color textColor;
  final bool hasGlow;

  const _PlanBadge({
    required this.label,
    required this.icon,
    required this.color,
    required this.textColor,
    this.hasGlow = false,
  });

  factory _PlanBadge.premium() => const _PlanBadge(
    label: 'Premium',
    icon: Icons.star_rounded,
    color: AppColors.premium,
    textColor: Color(0xFF3D2B00),
    hasGlow: true,
  );

  factory _PlanBadge.standard() => const _PlanBadge(
    label: 'Estándar',
    icon: Icons.verified_rounded,
    color: AppColors.standard,
    textColor: Colors.white,
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
        boxShadow: hasGlow
            ? [BoxShadow(color: color.withValues(alpha: 0.55), blurRadius: 10, spreadRadius: 1)]
            : [BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: 6)],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: textColor, size: 12),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}
