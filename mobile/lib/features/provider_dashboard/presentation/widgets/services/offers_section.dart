import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../../core/utils/plan_limits.dart';
import '../../../domain/models/offer_post_model.dart';

/// Sección "Mis Ofertas" dentro del tab de servicios: contador X/N por plan,
/// botón "Publicar" y lista de ofertas activas.
class OfferPostsSection extends StatelessWidget {
  final String plan;
  final List<OfferPostModel> offers;
  final bool isLoading;
  final VoidCallback onPublish;
  final void Function(int id) onDelete;
  final void Function(OfferPostModel offer)? onEdit;

  const OfferPostsSection({
    super.key,
    required this.plan,
    required this.offers,
    required this.isLoading,
    required this.onPublish,
    required this.onDelete,
    this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Divider(color: Colors.white.withValues(alpha: 0.06)),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
          child: Row(
            children: [
              const Icon(Icons.local_offer_rounded, color: AppColors.amber, size: 16),
              const SizedBox(width: 6),
              Text('Mis Ofertas', style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: AppColors.amber.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                child: Text('${offers.length}/${PlanLimits.offers(plan)}', style: const TextStyle(color: AppColors.amber, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: onPublish,
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text('Publicar'),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.amber,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
        if (isLoading)
          const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator(color: AppColors.amber, strokeWidth: 2)),
          )
        else if (offers.isEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Text(
              'Sin ofertas activas. Publica una promoción o precio especial.',
              style: TextStyle(color: c.textMuted, fontSize: 12, height: 1.4),
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
            child: Column(
              children: offers.map((o) => OfferCard(
                offer: o,
                onDelete: () => onDelete(o.id),
                onEdit: onEdit == null ? null : () => onEdit!(o),
              )).toList(),
            ),
          ),
        const SizedBox(height: 8),
      ],
    );
  }
}

/// Tarjeta compacta de una oferta activa con precio, tiempo restante,
/// botón de editar y eliminar.
class OfferCard extends StatelessWidget {
  final OfferPostModel offer;
  final VoidCallback onDelete;
  final VoidCallback? onEdit;

  const OfferCard({
    super.key,
    required this.offer,
    required this.onDelete,
    this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.amber.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          // Foto de la oferta si existe; si no, icono por defecto.
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: (offer.photoUrl != null && offer.photoUrl!.isNotEmpty)
                ? Image.network(
                    offer.photoUrl!,
                    width: 52,
                    height: 52,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _fallbackOfferIcon(),
                  )
                : _fallbackOfferIcon(),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(offer.title, style: TextStyle(color: c.textPrimary, fontSize: 13, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: AppColors.amber.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(5)),
                      child: Text(offer.priceLabel, style: const TextStyle(color: AppColors.amber, fontSize: 11, fontWeight: FontWeight.w600)),
                    ),
                    const SizedBox(width: 6),
                    Text(offer.timeLeftLabel, style: TextStyle(color: c.textMuted, fontSize: 11)),
                  ],
                ),
              ],
            ),
          ),
          if (onEdit != null)
            IconButton(
              onPressed: onEdit,
              icon: Icon(Icons.edit_rounded, size: 18, color: AppColors.amber),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              splashRadius: 18,
            ),
          if (onEdit != null) const SizedBox(width: 4),
          IconButton(
            onPressed: onDelete,
            icon: Icon(Icons.delete_rounded, size: 18, color: AppColors.busy),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            splashRadius: 18,
          ),
        ],
      ),
    );
  }

  Widget _fallbackOfferIcon() => Container(
    width: 52,
    height: 52,
    decoration: BoxDecoration(
      color: AppColors.amber.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(10),
    ),
    child: const Icon(Icons.local_offer_rounded, color: AppColors.amber, size: 22),
  );
}
