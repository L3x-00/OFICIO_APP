import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../domain/models/service_item_model.dart';

/// Tarjeta de un servicio (OFICIO) o producto (NEGOCIO) con botones de
/// editar y eliminar.
class ServiceCard extends StatelessWidget {
  final ServiceItem service;
  final bool isNegocio;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const ServiceCard({
    super.key,
    required this.service,
    this.isNegocio = false,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Row(
        children: [
          // Imagen del servicio si existe; si no, icono por defecto.
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: (service.imageUrl != null && service.imageUrl!.isNotEmpty)
                ? Image.network(
                    service.imageUrl!,
                    width: 56,
                    height: 56,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _fallbackIcon(c),
                  )
                : _fallbackIcon(c),
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
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (service.description != null &&
                    service.description!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    service.description!,
                    style: TextStyle(color: c.textMuted, fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.amber.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    service.priceLabel,
                    style: TextStyle(
                      color: AppColors.tintOn(AppColors.amber, c.isDark),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Column(
            children: [
              IconButton(
                onPressed: onEdit,
                icon: Icon(Icons.edit_rounded, size: 18, color: c.textMuted),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                splashRadius: 20,
              ),
              const SizedBox(height: 4),
              IconButton(
                onPressed: onDelete,
                icon: Icon(
                  Icons.delete_rounded,
                  size: 18,
                  color: AppColors.busy,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                splashRadius: 20,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _fallbackIcon(AppThemeColors c) => Container(
    width: 56,
    height: 56,
    decoration: BoxDecoration(
      color: c.warmDeep,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Icon(
      isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
      color: AppColors.tintOn(AppColors.amber, c.isDark),
      size: 24,
    ),
  );
}
