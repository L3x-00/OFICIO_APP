import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';
import '../../../domain/models/provider_model.dart';

/// Nombre del negocio + categoría.
class ProviderInfo extends StatelessWidget {
  final ProviderModel provider;
  const ProviderInfo({super.key, required this.provider});

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
        // Especialidad principal (isPrimary) destacada.
        Text(
          provider.categoryName,
          style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
        ),
        // Especialidades secundarias como chips pequeños.
        if (provider.secondaryCategoryNames.isNotEmpty) ...[
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: provider.secondaryCategoryNames.map((name) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
              ),
              child: Text(
                name,
                style: const TextStyle(
                  color: AppColors.primary, fontSize: 10.5, fontWeight: FontWeight.w500,
                ),
              ),
            )).toList(),
          ),
        ],
      ],
    );
  }
}

/// Fila de estrellas + recomendaciones + badge de disponibilidad.
class RatingRowData extends StatelessWidget {
  final ProviderModel provider;
  const RatingRowData({super.key, required this.provider});

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

/// Fila horizontal de miniaturas de productos (solo NEGOCIO).
class ThumbnailRow extends StatelessWidget {
  final List<String> urls;
  const ThumbnailRow({super.key, required this.urls});

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
            child: AppNetworkImage(
              url: url,
              width: 64, height: 64,
              fit: BoxFit.cover,
              placeholder: Container(width: 64, height: 64, color: c.bgInput),
              errorWidget: Container(
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
