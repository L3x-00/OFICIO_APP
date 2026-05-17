import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/app_network_image.dart';
import '../../../providers_list/data/providers_repository.dart';
import '../../../providers_list/presentation/screens/provider_detail_screen.dart';
import '../../domain/models/public_offer_model.dart';

/// Detalle completo de una oferta pública.
///
/// Se abre al tocar una tarjeta del listado. Muestra foto, descripción
/// extendida, precio, datos del proveedor y un botón que redirige al
/// perfil del profesional o a la carta del negocio (según el tipo).
class OfferDetailSheet extends StatelessWidget {
  final PublicOfferModel offer;
  const OfferDetailSheet({super.key, required this.offer});

  static Future<void> show(BuildContext context, PublicOfferModel offer) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (_) => OfferDetailSheet(offer: offer),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final screenH = MediaQuery.of(context).size.height;
    final p = offer.provider;

    return Container(
      height: screenH * 0.85,
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Handle
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 8),
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (offer.photoUrl != null)
                    AppNetworkImage(
                      url: offer.photoUrl!,
                      width: double.infinity,
                      height: 240,
                      fit: BoxFit.cover,
                    ),
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Chips de categoría
                        if (offer.categories.isNotEmpty)
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: offer.categories.map((cat) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.amber.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(cat.name,
                                  style: const TextStyle(
                                      color: AppColors.amber,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600)),
                            )).toList(),
                          ),
                        const SizedBox(height: 12),

                        // Título + tiempo restante
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(offer.title,
                                  style: TextStyle(
                                      color: c.textPrimary,
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: c.bgInput,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(offer.timeLeftLabel,
                                  style: TextStyle(color: c.textMuted, fontSize: 12)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // Precio
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.amber.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.local_offer_rounded, color: AppColors.amber, size: 18),
                              const SizedBox(width: 6),
                              Text(offer.priceLabel,
                                  style: const TextStyle(
                                      color: AppColors.amber,
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Descripción
                        Text('Detalles',
                            style: TextStyle(
                                color: c.textSecondary,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.0)),
                        const SizedBox(height: 6),
                        Text(offer.description,
                            style: TextStyle(
                                color: c.textPrimary,
                                fontSize: 14,
                                height: 1.5)),
                        const SizedBox(height: 22),

                        // Proveedor — separador visual
                        Container(height: 1, color: c.border),
                        const SizedBox(height: 16),

                        Row(
                          children: [
                            Container(
                              width: 44, height: 44,
                              decoration: BoxDecoration(
                                color: c.bgInput,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              clipBehavior: Clip.hardEdge,
                              child: p.coverUrl != null
                                  ? AppNetworkImage(url: p.coverUrl!, fit: BoxFit.cover)
                                  : Icon(Icons.storefront_rounded, color: c.textMuted),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(
                                        child: Text(p.businessName,
                                            style: TextStyle(
                                                color: c.textPrimary,
                                                fontSize: 14,
                                                fontWeight: FontWeight.w700),
                                            overflow: TextOverflow.ellipsis),
                                      ),
                                      if (p.isVerified) ...[
                                        const SizedBox(width: 4),
                                        const Icon(Icons.verified_rounded,
                                            color: AppColors.amber, size: 14),
                                      ],
                                    ],
                                  ),
                                  Row(
                                    children: [
                                      const Icon(Icons.star_rounded,
                                          color: AppColors.star, size: 13),
                                      const SizedBox(width: 2),
                                      Text(p.averageRating.toStringAsFixed(1),
                                          style: TextStyle(color: c.textMuted, fontSize: 11)),
                                      if (p.localityName != null) ...[
                                        const SizedBox(width: 8),
                                        Icon(Icons.place_outlined,
                                            color: c.textMuted, size: 12),
                                        const SizedBox(width: 2),
                                        Flexible(
                                          child: Text(p.localityName!,
                                              style: TextStyle(color: c.textMuted, fontSize: 11),
                                              overflow: TextOverflow.ellipsis),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // CTA — Ver perfil profesional / Ver negocio
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () => _openProviderCard(context),
                            icon: Icon(
                              p.isBusiness
                                  ? Icons.storefront_rounded
                                  : Icons.person_rounded,
                              size: 18,
                            ),
                            label: Text(
                              p.isBusiness
                                  ? 'Ver negocio'
                                  : 'Ver perfil profesional',
                              style: const TextStyle(
                                  fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14)),
                              elevation: 0,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Botones de contacto rápido (mantienen utilidad)
                        Row(
                          children: [
                            if (p.whatsapp != null)
                              Expanded(
                                child: _ContactBtn(
                                  icon: Icons.chat_rounded,
                                  label: 'WhatsApp',
                                  color: const Color(0xFF25D366),
                                  onTap: () => launchUrl(Uri.parse(
                                      'https://wa.me/${p.whatsapp!.replaceAll(RegExp(r'[^\d]'), '')}?text=Hola, vi tu oferta "${offer.title}" en OficioApp')),
                                ),
                              ),
                            if (p.whatsapp != null && p.phone != null)
                              const SizedBox(width: 8),
                            if (p.phone != null)
                              Expanded(
                                child: _ContactBtn(
                                  icon: Icons.phone_rounded,
                                  label: 'Llamar',
                                  color: AppColors.primary,
                                  onTap: () => launchUrl(Uri.parse('tel:${p.phone}')),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Cierra este sheet y abre el detalle completo del proveedor.
  /// Cargar el proveedor por id es necesario porque el modelo `OfferProviderInfo`
  /// solo trae un subset; `ProviderDetailSheet` necesita el ProviderModel
  /// completo (servicios, redes, horarios, etc.).
  Future<void> _openProviderCard(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);
    nav.pop(); // cierra este sheet primero

    final result = await ProvidersRepository().getProviderDetail(offer.provider.id);
    if (!context.mounted) return;

    if (result.isSuccess) {
      ProviderDetailSheet.show(context, result.data);
    } else {
      messenger.showSnackBar(
        const SnackBar(content: Text('No se pudo abrir el perfil del proveedor')),
      );
    }
  }
}

class _ContactBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ContactBtn({
    required this.icon,
    required this.label,
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
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Text(label,
                style: TextStyle(
                    color: color, fontSize: 13, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
