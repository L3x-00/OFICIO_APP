import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/models/service_request_model.dart';
import '../providers/subastas_provider.dart';

class OfferComparisonSheet extends StatelessWidget {
  final ServiceRequestModel request;
  const OfferComparisonSheet({super.key, required this.request});

  static Future<void> show(BuildContext context, ServiceRequestModel request) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ChangeNotifierProvider.value(
        value: context.read<SubastasProvider>(),
        child: OfferComparisonSheet(request: request),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final prov = context.watch<SubastasProvider>();
    final pendingOffers = request.offers
        .where((o) => o.status == OfferStatus.pending)
        .toList()
      ..sort((a, b) => a.price.compareTo(b.price));

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (_, ctrl) => Container(
        decoration: BoxDecoration(
          color: c.bg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: c.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),

            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Comparar ofertas',
                            style: TextStyle(
                                color: c.textPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.w700)),
                        Text(
                          '${pendingOffers.length} oferta${pendingOffers.length == 1 ? '' : 's'} · ${request.categoryName}',
                          style: TextStyle(color: c.textMuted, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: c.textMuted),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            const Divider(height: 20),

            if (pendingOffers.isEmpty)
              Expanded(
                child: Center(
                  child: Text('Sin ofertas aún',
                      style: TextStyle(color: c.textMuted, fontSize: 15)),
                ),
              )
            else
              Expanded(
                child: ListView.separated(
                  controller: ctrl,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  itemCount: pendingOffers.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _OfferCard(
                    offer: pendingOffers[i],
                    isBestPrice: i == 0,
                    isSubmitting: prov.submitting,
                    onAccept: () async {
                      final confirm = await _confirmDialog(context, pendingOffers[i]);
                      if (confirm != true || !context.mounted) return;
                      final ok = await context
                          .read<SubastasProvider>()
                          .acceptOffer(pendingOffers[i].id, request.id);
                      if (ok && context.mounted) {
                        Navigator.of(context).pop();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                                '¡Oferta aceptada! ${pendingOffers[i].providerName} fue notificado.'),
                            backgroundColor: AppColors.available,
                          ),
                        );
                      }
                    },
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<bool?> _confirmDialog(BuildContext context, OfferModel offer) {
    final c = context.colors;
    return showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        title: Text('¿Confirmar elección?',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.w700)),
        content: Text(
          'Vas a elegir a ${offer.providerName} por S/ ${offer.price.toStringAsFixed(2)}. '
          'Las demás ofertas serán rechazadas.',
          style: TextStyle(color: c.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.available,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Aceptar'),
          ),
        ],
      ),
    );
  }
}

// ── Offer card ────────────────────────────────────────────────

class _OfferCard extends StatelessWidget {
  final OfferModel offer;
  final bool isBestPrice;
  final bool isSubmitting;
  final VoidCallback onAccept;

  const _OfferCard({
    required this.offer,
    required this.isBestPrice,
    required this.isSubmitting,
    required this.onAccept,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isBestPrice
              ? AppColors.available.withValues(alpha: 0.5)
              : c.border,
          width: isBestPrice ? 1.5 : 1,
        ),
      ),
      child: Column(
        children: [
          // Best price banner
          if (isBestPrice)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.available.withValues(alpha: 0.15),
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(13)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.thumb_up_alt_rounded,
                      size: 12, color: AppColors.available),
                  SizedBox(width: 4),
                  Text('Mejor precio',
                      style: TextStyle(
                          color: AppColors.available,
                          fontSize: 11,
                          fontWeight: FontWeight.w700)),
                ],
              ),
            ),

          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                  backgroundImage: offer.providerAvatarUrl != null
                      ? NetworkImage(offer.providerAvatarUrl!)
                      : null,
                  child: offer.providerAvatarUrl == null
                      ? Text(
                          offer.providerName.isNotEmpty
                              ? offer.providerName[0].toUpperCase()
                              : '?',
                          style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                              fontSize: 18),
                        )
                      : null,
                ),

                const SizedBox(width: 12),

                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(offer.providerName,
                                style: TextStyle(
                                    color: c.textPrimary,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                          ),
                          if (offer.providerIsTrusted)
                            Padding(
                              padding: const EdgeInsets.only(left: 4),
                              child: Tooltip(
                                message: 'Proveedor verificado',
                                child: const Icon(Icons.verified_rounded,
                                    color: AppColors.verified, size: 15),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      _StarRating(rating: offer.providerRating, reviews: offer.providerTotalReviews),
                      const SizedBox(height: 6),
                      Text('"${offer.message}"',
                          style: TextStyle(
                              color: c.textSecondary,
                              fontSize: 13,
                              fontStyle: FontStyle.italic),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Footer: price + accept
          Container(
            decoration: BoxDecoration(
              color: c.bg.withValues(alpha: 0.4),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(13)),
            ),
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Precio ofrecido',
                        style: TextStyle(color: c.textMuted, fontSize: 11)),
                    Text('S/ ${offer.price.toStringAsFixed(2)}',
                        style: const TextStyle(
                            color: AppColors.amber,
                            fontSize: 20,
                            fontWeight: FontWeight.w800)),
                  ],
                ),
                const Spacer(),
                SizedBox(
                  height: 40,
                  child: ElevatedButton(
                    onPressed: isSubmitting ? null : onAccept,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20)),
                    ),
                    child: isSubmitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Elegir',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Star rating ───────────────────────────────────────────────

class _StarRating extends StatelessWidget {
  final double rating;
  final int reviews;
  const _StarRating({required this.rating, required this.reviews});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ...List.generate(5, (i) => Icon(
              i < rating.round() ? Icons.star_rounded : Icons.star_outline_rounded,
              color: AppColors.star,
              size: 13,
            )),
        const SizedBox(width: 4),
        Text('($reviews)',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
      ],
    );
  }
}
