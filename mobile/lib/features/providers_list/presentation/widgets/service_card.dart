import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/constans/app_strings.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../domain/models/provider_model.dart';

/// Tarjeta principal de servicio
/// Se usa en el listado de proveedores y en búsquedas
class ServiceCard extends StatelessWidget {
  final ProviderModel provider;
  final VoidCallback? onTap;           // Abre el detalle
  final VoidCallback? onFavoriteToggle; // Agrega/quita de favoritos

  const ServiceCard({
    super.key,
    required this.provider,
    this.onTap,
    this.onFavoriteToggle,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white.withOpacity(0.06)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.35),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Foto de portada + insignias ──────────────
            _CoverImage(provider: provider),

            // ── Información principal ────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: _ProviderInfo(provider: provider),
            ),

            // ── Calificación y disponibilidad ────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: _RatingRow(provider: provider),
            ),

            // ── Miniaturas (solo negocios) ───────────────
            if (provider.type == ProviderType.negocio &&
                provider.thumbnailUrls.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                child: _ThumbnailRow(urls: provider.thumbnailUrls),
              ),

            // ── Botones de acción ────────────────────────
            Padding(
              padding: const EdgeInsets.all(16),
              child: _ActionButtons(
                provider: provider,
                onFavoriteToggle: onFavoriteToggle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Subwidget: Foto de portada ───────────────────────────

class _CoverImage extends StatelessWidget {
  final ProviderModel provider;
  const _CoverImage({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Imagen principal
        ClipRRect(
          borderRadius: const BorderRadius.only(
            topLeft:  Radius.circular(24),
            topRight: Radius.circular(24),
          ),
          child: provider.coverImageUrl != null
              ? CachedNetworkImage(
                  imageUrl: provider.coverImageUrl!,
                  height: 160,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => _imagePlaceholder(),
                  errorWidget:  (_, __, ___) => _imagePlaceholder(),
                )
              : _imagePlaceholder(),
        ),

        // Insignia "Verificado" — esquina superior derecha
        if (provider.isVerified)
          Positioned(
            top: 12,
            right: 12,
            child: _VerifiedBadge(),
          ),

        // Distancia — esquina superior izquierda
        if (provider.distanceKm != null)
          Positioned(
            top: 12,
            left: 12,
            child: _DistanceBadge(km: provider.distanceKm!),
          ),
      ],
    );
  }

  Widget _imagePlaceholder() {
    return Container(
      height: 160,
      width: double.infinity,
      color: AppColors.bgInput,
      child: const Icon(
        Icons.storefront_rounded,
        size: 48,
        color: AppColors.textMuted,
      ),
    );
  }
}

// ─── Subwidget: Nombre, categoría ────────────────────────

class _ProviderInfo extends StatelessWidget {
  final ProviderModel provider;
  const _ProviderInfo({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Nombre del negocio/profesional
              Text(
                provider.businessName,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.3,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              // Categoría
              Text(
                provider.categoryName,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Subwidget: Estrellas + disponibilidad ────────────────

class _RatingRow extends StatelessWidget {
  final ProviderModel provider;
  const _RatingRow({required this.provider});

  @override
  Widget build(BuildContext context) {
    // Color del indicador de disponibilidad
    final Color availColor = switch (provider.availability) {
      AvailabilityStatus.disponible => AppColors.available,
      AvailabilityStatus.ocupado    => AppColors.busy,
      AvailabilityStatus.conDemora  => AppColors.delayed,
    };

    return Row(
      children: [
        // Estrellas
        RatingBarIndicator(
          rating: provider.averageRating,
          itemBuilder: (_, __) => const Icon(
            Icons.star_rounded,
            color: AppColors.star,
          ),
          itemCount: 5,
          itemSize: 18,
        ),
        const SizedBox(width: 6),
        Text(
          '${provider.averageRating.toStringAsFixed(1)} '
          '(${provider.totalReviews})',
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 12,
          ),
        ),
        const Spacer(),
        // Indicador de disponibilidad
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: availColor.withOpacity(0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: availColor.withOpacity(0.4)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7, height: 7,
                decoration: BoxDecoration(
                  color: availColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 5),
              Text(
                provider.availability.label,
                style: TextStyle(
                  color: availColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Subwidget: Miniaturas de productos (negocios) ────────

class _ThumbnailRow extends StatelessWidget {
  final List<String> urls;
  const _ThumbnailRow({required this.urls});

  @override
  Widget build(BuildContext context) {
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
              placeholder: (_, __) => Container(
                width: 64, height: 64,
                color: AppColors.bgInput,
              ),
              errorWidget: (_, __, ___) => Container(
                width: 64, height: 64,
                color: AppColors.bgInput,
                child: const Icon(Icons.image_not_supported,
                    color: AppColors.textMuted, size: 24),
              ),
            ),
          ),
        )).toList(),
      ),
    );
  }
}

// ─── Subwidget: Botones de acción ─────────────────────────

class _ActionButtons extends StatelessWidget {
  final ProviderModel provider;
  final VoidCallback? onFavoriteToggle;
  const _ActionButtons({required this.provider, this.onFavoriteToggle});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Botón WhatsApp
        Expanded(
          child: _ContactButton(
            label: 'WhatsApp',
            icon: Icons.chat_rounded,
            color: AppColors.whatsapp,
            onTap: () => _openWhatsApp(context),
          ),
        ),
        const SizedBox(width: 8),
        // Botón Llamar
        Expanded(
          child: _ContactButton(
            label: 'Llamar',
            icon: Icons.call_rounded,
            color: AppColors.call,
            onTap: () => _makeCall(context),
          ),
        ),
        const SizedBox(width: 8),
        // Botón Favorito (corazón)
        _FavoriteButton(
          isFavorite: provider.isFavorite,
          onToggle: onFavoriteToggle,
        ),
      ],
    );
  }

  /// Abre WhatsApp con mensaje predefinido
  Future<void> _openWhatsApp(BuildContext context) async {
    // Normaliza el número: quita espacios y guiones
    final number = (provider.whatsapp ?? provider.phone)
        .replaceAll(RegExp(r'[\s\-\(\)]'), '');

    final message = Uri.encodeComponent(
      AppStrings.whatsappMessage(provider.businessName),
    );

    // Intenta abrir la app nativa primero, luego el web
    final nativeUrl = Uri.parse('whatsapp://send?phone=$number&text=$message');
    final webUrl    = Uri.parse('https://wa.me/$number?text=$message');

    if (await canLaunchUrl(nativeUrl)) {
      await launchUrl(nativeUrl);
    } else {
      await launchUrl(webUrl, mode: LaunchMode.externalApplication);
    }
  }

  /// Abre el marcador telefónico
  Future<void> _makeCall(BuildContext context) async {
    final uri = Uri.parse('tel:${provider.phone}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}

// ─── Subwidget: Botón de contacto (WhatsApp/Llamar) ──────

class _ContactButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ContactButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Subwidget: Botón de favorito ─────────────────────────

class _FavoriteButton extends StatelessWidget {
  final bool isFavorite;
  final VoidCallback? onToggle;

  const _FavoriteButton({required this.isFavorite, this.onToggle});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onToggle,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isFavorite
              ? AppColors.favorite.withOpacity(0.15)
              : AppColors.bgInput,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isFavorite
                ? AppColors.favorite.withOpacity(0.4)
                : Colors.white.withOpacity(0.08),
          ),
        ),
        child: Icon(
          isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
          color: isFavorite ? AppColors.favorite : AppColors.textMuted,
          size: 22,
        ),
      ),
    );
  }
}

// ─── Subwidget: Insignia Verificado ──────────────────────

class _VerifiedBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.verified.withOpacity(0.9),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.verified.withOpacity(0.4),
            blurRadius: 8,
          ),
        ],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified_rounded, color: Colors.white, size: 14),
          SizedBox(width: 4),
          Text(
            'Verificado',
            style: TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Subwidget: Insignia de distancia ────────────────────

class _DistanceBadge extends StatelessWidget {
  final double km;
  const _DistanceBadge({required this.km});

  @override
  Widget build(BuildContext context) {
    final label = km < 1
        ? '${(km * 1000).toInt()} m'
        : '${km.toStringAsFixed(1)} km';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.6),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.location_on_rounded,
              color: AppColors.primary, size: 13),
          const SizedBox(width: 3),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}