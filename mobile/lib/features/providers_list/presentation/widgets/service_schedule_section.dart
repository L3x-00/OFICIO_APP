import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/models/provider_model.dart';

/// ─── Lista de productos (NEGOCIO) o servicios (OFICIO) ─────
///
/// Lee la lista "services" del `scheduleJson` del proveedor.
class ServicesList extends StatelessWidget {
  final ProviderModel provider;
  final Color accent;

  const ServicesList({super.key, required this.provider, required this.accent});

  @override
  Widget build(BuildContext context) {
    final schedule = provider.scheduleJson;
    final rawServices = schedule?['services'];
    if (rawServices is! List || rawServices.isEmpty) {
      return const SizedBox.shrink();
    }

    final isNegocio = provider.type == ProviderType.negocio;
    final c = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...rawServices.map((raw) {
          if (raw is! Map<String, dynamic>) return const SizedBox.shrink();
          final name  = raw['name']  as String? ?? '';
          final desc  = raw['description'] as String?;
          final price = (raw['price'] as num?)?.toDouble();
          final unit  = raw['unit']  as String?;
          final phone = raw['phone'] as String?;

          String priceLabel = 'Consultar precio';
          if (price != null) {
            final formatted = price % 1 == 0
                ? 'S/ ${price.toInt()}'
                : 'S/ ${price.toStringAsFixed(2)}';
            priceLabel = unit != null ? '$formatted $unit' : formatted;
          }

          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.border),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                      isNegocio ? Icons.inventory_2_rounded : Icons.build_circle_outlined,
                      color: accent, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name,
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          )),
                      if (desc != null && desc.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(desc,
                            style: TextStyle(
                              color: c.textMuted,
                              fontSize: 12,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis),
                      ],
                      if (phone != null && phone.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            Icon(Icons.phone_outlined,
                                color: c.textMuted, size: 12),
                            const SizedBox(width: 4),
                            Text(phone,
                                style: TextStyle(
                                  color: c.textMuted,
                                  fontSize: 11,
                                )),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    priceLabel,
                    style: TextStyle(
                      color: accent,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

/// ─── Tabla de horarios semanales ────────────────────────────

class ScheduleTable extends StatelessWidget {
  final Map<String, dynamic> schedule;
  const ScheduleTable({super.key, required this.schedule});

  /// true si el scheduleJson tiene al menos un día con horario definido
  static bool hasScheduleData(Map<String, dynamic> schedule) {
    const dayKeys = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
    return dayKeys.any((d) => schedule[d] != null);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final days = {
      'lun': 'Lunes',
      'mar': 'Martes',
      'mie': 'Miércoles',
      'jue': 'Jueves',
      'vie': 'Viernes',
      'sab': 'Sábado',
      'dom': 'Domingo',
    };

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: days.entries.map((entry) {
          final hours = schedule[entry.key] as String?;
          if (hours == null) return const SizedBox.shrink();
          final isClosed = hours == 'Cerrado';
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                SizedBox(
                  width: 88,
                  child: Text(
                    entry.value,
                    style: TextStyle(
                      color: c.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                ),
                Text(
                  hours,
                  style: TextStyle(
                    color: isClosed ? AppColors.busy : c.textPrimary,
                    fontSize: 13,
                    fontWeight: isClosed ? FontWeight.normal : FontWeight.w500,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
