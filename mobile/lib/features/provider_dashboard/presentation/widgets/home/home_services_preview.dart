import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../../shared/widgets/app_network_image.dart';
import '../../../domain/models/service_item_model.dart';

/// Resumen de servicios/productos del proveedor en el Inicio (FASE 2 · #4).
///
/// Muestra hasta 4 ítems con su precio; "Gestionar →" lleva al tab
/// Servicios/Productos (índice 3) vía [onViewAll]. Empty state con CTA.
class HomeServicesPreview extends StatelessWidget {
  final bool isNegocio;
  final List<ServiceItem> services;
  final VoidCallback onViewAll;

  const HomeServicesPreview({
    super.key,
    required this.isNegocio,
    required this.services,
    required this.onViewAll,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final title = isNegocio ? 'Tus productos' : 'Tus servicios';
    final preview = services.take(4).toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (services.isNotEmpty)
                TextButton(
                  onPressed: onViewAll,
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'Gestionar →',
                    style: TextStyle(color: AppColors.amber, fontSize: 13),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (services.isEmpty)
            _Empty(isNegocio: isNegocio, onTap: onViewAll)
          else
            ...preview.map((s) => _ServiceRow(service: s, onTap: onViewAll)),
        ],
      ),
    );
  }
}

class _ServiceRow extends StatelessWidget {
  final ServiceItem service;
  final VoidCallback onTap;
  const _ServiceRow({required this.service, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasImg = service.imageUrl != null && service.imageUrl!.isNotEmpty;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                width: 44,
                height: 44,
                child: hasImg
                    ? AppNetworkImage(
                        url: service.imageUrl!,
                        width: 44,
                        height: 44,
                        fit: BoxFit.cover,
                        placeholder: _thumbFallback(c),
                        errorWidget: _thumbFallback(c),
                      )
                    : _thumbFallback(c),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    service.name,
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    service.priceLabel,
                    style: TextStyle(color: AppColors.amber, fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _thumbFallback(AppThemeColors c) => Container(
    color: c.bgInput,
    child: Icon(Icons.design_services_rounded, color: c.textMuted, size: 20),
  );
}

class _Empty extends StatelessWidget {
  final bool isNegocio;
  final VoidCallback onTap;
  const _Empty({required this.isNegocio, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final noun = isNegocio ? 'productos' : 'servicios';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: AppColors.amber.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.add_rounded,
                color: AppColors.amber,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Agrega tus $noun para que los clientes los vean',
                style: TextStyle(color: c.textSecondary, fontSize: 13),
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 20),
          ],
        ),
      ),
    );
  }
}
