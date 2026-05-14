import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../../provider_dashboard/domain/models/service_item_model.dart';

/// Fila de chips de servicios (OFICIO) o productos (NEGOCIO). Muestra hasta
/// 3 y un chip "+N más" si hay extras.
class ServicesRow extends StatelessWidget {
  final List<ServiceItem> services;
  final bool isNegocio;
  const ServicesRow({super.key, required this.services, this.isNegocio = false});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const maxVisible = 3;
    final visible = services.take(maxVisible).toList();
    final extra   = services.length - maxVisible;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              isNegocio ? Icons.inventory_2_outlined : Icons.build_circle_outlined,
              size: 13,
              color: isNegocio ? AppColors.amber : AppColors.primary,
            ),
            const SizedBox(width: 5),
            Text(
              isNegocio ? 'Productos' : 'Servicios',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 5,
          children: [
            ...visible.map((s) => ServiceChip(item: s)),
            if (extra > 0)
              ServiceChip(label: '+$extra más', isExtra: true),
          ],
        ),
      ],
    );
  }
}

/// Chip individual de un servicio/producto, con precio opcional.
class ServiceChip extends StatelessWidget {
  final ServiceItem? item;
  final String? label;
  final bool isExtra;

  const ServiceChip({super.key, this.item, this.label, this.isExtra = false});

  @override
  Widget build(BuildContext context) {
    final c    = context.colors;
    final text = label ?? item!.name;
    final price = (!isExtra && item?.price != null) ? item!.priceLabel : null;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: isExtra
            ? c.bgInput
            : AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isExtra
              ? c.border
              : AppColors.primary.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            text,
            style: TextStyle(
              color: isExtra ? c.textMuted : AppColors.primary,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (price != null) ...[
            const SizedBox(width: 4),
            Text(
              '· $price',
              style: TextStyle(color: c.textMuted, fontSize: 10),
            ),
          ],
        ],
      ),
    );
  }
}
