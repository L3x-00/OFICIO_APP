import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../shared/widgets/app_network_image.dart';
import '../../domain/models/menu_item_model.dart';

/// Tarjeta de un plato en la carta PÚBLICA (vista cliente).
/// Muestra foto, nombre, descripción, precio (con oferta tachada), badge
/// "Agotado" y botón "Pedir por WhatsApp" si el proveedor lo permite.
class MenuItemCard extends StatelessWidget {
  const MenuItemCard({super.key, required this.item});

  final MenuItemModel item;

  String _money(double v) => 'S/ ${v.toStringAsFixed(2)}';

  Future<void> _order() async {
    final url = item.whatsappOrderUrl;
    if (url == null) return;
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final agotado = !item.isAvailable;
    final canOrder = !agotado && item.whatsappOrderUrl != null;

    return Opacity(
      opacity: agotado ? 0.55 : 1,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (item.photoUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: AppNetworkImage(
                  url: item.photoUrl!,
                  width: 76,
                  height: 76,
                  fit: BoxFit.cover,
                ),
              ),
            if (item.photoUrl != null) const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (item.isFeatured) ...[
                        const Icon(
                          Icons.star,
                          size: 14,
                          color: AppColors.amber,
                        ),
                        const SizedBox(width: 4),
                      ],
                      Expanded(
                        child: Text(
                          item.name,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                            fontSize: 14.5,
                          ),
                        ),
                      ),
                      if (agotado)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.busy.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: const Text(
                            'Agotado',
                            style: TextStyle(
                              color: AppColors.busy,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                  if (item.description != null &&
                      item.description!.trim().isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      item.description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12.5,
                        height: 1.3,
                      ),
                    ),
                  ],
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (item.hasOffer) ...[
                        Text(
                          _money(item.price),
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                        const SizedBox(width: 6),
                      ],
                      Text(
                        _money(item.effectivePrice),
                        style: TextStyle(
                          color: item.hasOffer
                              ? AppColors.available
                              : AppColors.amber,
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                      ),
                      const Spacer(),
                      if (canOrder)
                        InkWell(
                          onTap: _order,
                          borderRadius: BorderRadius.circular(99),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.whatsapp.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.chat,
                                  size: 14,
                                  color: AppColors.whatsapp,
                                ),
                                SizedBox(width: 5),
                                Text(
                                  'Pedir',
                                  style: TextStyle(
                                    color: AppColors.whatsapp,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
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
    );
  }
}
