import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../../provider_dashboard/domain/models/service_item_model.dart';
import '../../../domain/models/provider_model.dart';
import 'service_detail_dialog.dart';

/// Fila de chips de servicios (OFICIO) o productos (NEGOCIO). Muestra hasta
/// 3 y un chip "+N más" si hay extras.
class ServicesRow extends StatelessWidget {
  final List<ServiceItem> services;
  final bool isNegocio;
  final ProviderModel provider;
  const ServicesRow({
    super.key,
    required this.services,
    required this.provider,
    this.isNegocio = false,
  });

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
            ...visible.map((s) => ServiceChip(
                  item: s,
                  isNegocio: isNegocio,
                  provider: provider,
                )),
            if (extra > 0)
              ServiceChip(label: '+$extra más', isExtra: true, isNegocio: isNegocio),
          ],
        ),
      ],
    );
  }
}

/// Chip individual de un servicio/producto. Si el item tiene imageUrl
/// se muestra como avatar leading. Tap abre el ServiceDetailDialog.
class ServiceChip extends StatelessWidget {
  final ServiceItem? item;
  final String? label;
  final bool isExtra;
  final bool isNegocio;
  /// Proveedor dueño del servicio — necesario para el botón "Consultar
  /// precio" del [ServiceDetailDialog]. Null sólo en el chip "+N más".
  final ProviderModel? provider;

  const ServiceChip({
    super.key,
    this.item,
    this.label,
    this.isExtra = false,
    this.isNegocio = false,
    this.provider,
  });

  @override
  Widget build(BuildContext context) {
    final c    = context.colors;
    final text = label ?? item!.name;
    final price = (!isExtra && item?.price != null) ? item!.priceLabel : null;
    final hasImage = !isExtra && item?.imageUrl != null && item!.imageUrl!.isNotEmpty;
    final accent = isNegocio ? AppColors.amber : AppColors.primary;

    final chip = Container(
      padding: EdgeInsets.fromLTRB(hasImage ? 4 : 9, 4, 9, 4),
      decoration: BoxDecoration(
        color: isExtra
            ? c.bgInput
            : accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isExtra
              ? c.border
              : accent.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (hasImage) ...[
            ClipOval(
              child: Image.network(
                item!.imageUrl!,
                width: 20,
                height: 20,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Icon(
                  isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                  size: 14,
                  color: accent,
                ),
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            text,
            style: TextStyle(
              color: isExtra ? c.textMuted : accent,
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

    // Sólo chips reales (no el "+N más") abren el dialog.
    if (isExtra || item == null || provider == null) return chip;
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () => ServiceDetailDialog.show(context,
          service: item!, isNegocio: isNegocio, provider: provider!),
      child: chip,
    );
  }
}
