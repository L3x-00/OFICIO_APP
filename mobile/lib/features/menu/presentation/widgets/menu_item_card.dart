import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/app_network_image.dart';
import '../../domain/models/menu_item_model.dart';

/// Tarjeta de un plato en la carta PÚBLICA (vista cliente).
/// Muestra foto, nombre, descripción, precio (con oferta tachada), badge
/// "Agotado" y un control de carrito (Agregar / − N +) cuando es pedible.
class MenuItemCard extends StatelessWidget {
  const MenuItemCard({
    super.key,
    required this.item,
    this.quantity = 0,
    this.onAdd,
    this.onRemove,
  });

  final MenuItemModel item;

  /// Cantidad actual en el carrito.
  final int quantity;

  /// Si se pasan, la tarjeta muestra el control de carrito. El screen solo
  /// los provee cuando el proveedor es "pedible" (tiene WhatsApp visible).
  final VoidCallback? onAdd;
  final VoidCallback? onRemove;

  String _money(double v) => 'S/ ${v.toStringAsFixed(2)}';

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final agotado = !item.isAvailable;
    final canOrder = !agotado && onAdd != null;

    return Opacity(
      opacity: agotado ? 0.55 : 1,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.border),
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
                          style: TextStyle(
                            color: c.textPrimary,
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
                          child: Text(
                            'Agotado',
                            style: TextStyle(
                              color: AppColors.tintOn(AppColors.busy, c.isDark),
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
                      style: TextStyle(
                        color: c.textSecondary,
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
                          style: TextStyle(
                            color: c.textMuted,
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
                      if (canOrder) _cartControl(c),
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

  Widget _cartControl(AppThemeColors c) {
    final onWhatsappTint = AppColors.tintOn(AppColors.whatsapp, c.isDark);
    if (quantity <= 0) {
      return InkWell(
        onTap: onAdd,
        borderRadius: BorderRadius.circular(99),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.whatsapp.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(99),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.add, size: 15, color: onWhatsappTint),
              const SizedBox(width: 4),
              Text(
                'Agregar',
                style: TextStyle(
                  color: onWhatsappTint,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      );
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _StepBtn(icon: Icons.remove, onTap: onRemove),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Text(
            '$quantity',
            style: TextStyle(
              color: c.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 15,
            ),
          ),
        ),
        _StepBtn(icon: Icons.add, onTap: onAdd),
      ],
    );
  }
}

class _StepBtn extends StatelessWidget {
  const _StepBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(99),
      child: Container(
        padding: const EdgeInsets.all(5),
        decoration: BoxDecoration(
          color: AppColors.whatsapp.withValues(alpha: 0.15),
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 16,
          color: AppColors.tintOn(AppColors.whatsapp, c.isDark),
        ),
      ),
    );
  }
}
