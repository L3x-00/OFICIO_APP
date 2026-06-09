import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../provider_dashboard/domain/models/service_item_model.dart';
import '../../domain/models/provider_model.dart';
import 'service_cards/service_detail_dialog.dart';

/// ─── Lista de productos (NEGOCIO) o servicios (OFICIO) ─────
///
/// Cada fila muestra la foto del servicio (si la tiene) y al tocarla
/// abre el [ServiceDetailDialog] con el detalle completo y el botón
/// "Consultar precio" que lleva al chat con el proveedor.
class ServicesList extends StatelessWidget {
  final ProviderModel provider;
  final Color accent;
  final int limit; // 👈 NUEVO: Cantidad máxima a mostrar (0 = sin límite)
  final int skip; // 👈 NUEVO: Cantidad a saltar desde el inicio (0 = no saltar)

  const ServicesList({
    super.key,
    required this.provider,
    required this.accent,
    this.limit = 0, // Valor por defecto: sin límite
    this.skip = 0, // Valor por defecto: no saltar
  });

  @override
  Widget build(BuildContext context) {
    var services = provider.services;
    if (services.isEmpty) return const SizedBox.shrink();

    // ── Aplicar lógica de paginación ──────────────────────
    // 1. Saltar los primeros 'skip' (usado cuando se expande para no repetir los 2 primeros)
    if (skip > 0) {
      services = services.skip(skip).toList();
    }
    // 2. Limitar la cantidad a mostrar (usado para mostrar solo 2 inicialmente)
    if (limit > 0) {
      services = services.take(limit).toList();
    }

    final isNegocio = provider.type == ProviderType.negocio;
    final c = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: services.map((item) {
        final hasImage = item.imageUrl != null && item.imageUrl!.isNotEmpty;
        return InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => ServiceDetailDialog.show(
            context,
            service: item,
            isNegocio: isNegocio,
            provider: provider,
          ),
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.border),
            ),
            child: Row(
              children: [
                // Foto del servicio/producto — si no hay, icono genérico.
                // `contain` sobre fondo neutro: la miniatura se ve completa
                // aunque sea vertical/cuadrada (antes `cover` recortaba).
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: hasImage
                      ? Container(
                          width: 48,
                          height: 48,
                          color: c.bgInput,
                          child: Image.network(
                            item.imageUrl!,
                            fit: BoxFit.contain,
                            errorBuilder: (_, _, _) => _iconBox(isNegocio),
                          ),
                        )
                      : _iconBox(isNegocio),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (item.description != null &&
                          item.description!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          item.description!,
                          style: TextStyle(color: c.textMuted, fontSize: 12),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      if (item.phone != null && item.phone!.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            Icon(
                              Icons.phone_outlined,
                              color: c.textMuted,
                              size: 12,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              item.phone!,
                              style: TextStyle(
                                color: c.textMuted,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        item.priceLabel,
                        style: TextStyle(
                          color: accent,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: c.textMuted,
                      size: 16,
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _iconBox(bool isNegocio) => Container(
    width: 48,
    height: 48,
    color: accent.withValues(alpha: 0.10),
    child: Icon(
      isNegocio ? Icons.inventory_2_rounded : Icons.build_circle_outlined,
      color: accent,
      size: 22,
    ),
  );
}

/// ─── Tabla de horarios semanales ────────────────────────────

class ScheduleTable extends StatelessWidget {
  final Map<String, dynamic> schedule;
  final int limit; // 👈 NUEVO
  final int skip; // 👈 NUEVO

  const ScheduleTable({
    super.key,
    required this.schedule,
    this.limit = 0, // 0 = sin límite
    this.skip = 0, // 0 = no saltar
  });

  /// Lee la hora del día tolerando perfiles legacy que persistieron
  /// `mié`/`sáb` con tilde — el editor nuevo usa `mie`/`sab`.
  static String? _readHours(Map<String, dynamic> schedule, String key) {
    final v = schedule[key];
    if (v is String) return v;
    const legacy = {'mie': 'mié', 'sab': 'sáb'};
    final alt = legacy[key];
    if (alt != null) {
      final lv = schedule[alt];
      if (lv is String) return lv;
    }
    return null;
  }

  /// true si el scheduleJson tiene al menos un día con horario definido
  static bool hasScheduleData(Map<String, dynamic> schedule) {
    const dayKeys = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
    return dayKeys.any((d) => _readHours(schedule, d) != null);
  }

  /// Cuenta cuántos días tienen horario definido (para saber si mostrar el botón "Ver más")
  static int countActiveDays(Map<String, dynamic> schedule) {
    const dayKeys = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
    return dayKeys.where((d) => _readHours(schedule, d) != null).length;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    // Mantenemos el orden correcto de los días
    final daysMap = {
      'lun': 'Lunes',
      'mar': 'Martes',
      'mie': 'Miércoles',
      'jue': 'Jueves',
      'vie': 'Viernes',
      'sab': 'Sábado',
      'dom': 'Domingo',
    };

    // 1. Filtrar solo los días que tienen horario
    var activeDays = daysMap.entries
        .where((entry) => _readHours(schedule, entry.key) != null)
        .toList();

    // 2. Aplicar lógica de paginación
    if (skip > 0) {
      activeDays = activeDays.skip(skip).toList();
    }
    if (limit > 0) {
      activeDays = activeDays.take(limit).toList();
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: activeDays.map((entry) {
          final hours = _readHours(
            schedule,
            entry.key,
          )!; // Ya filtramos los nulos arriba
          final isClosed = hours == 'Cerrado';
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                SizedBox(
                  width: 88,
                  child: Text(
                    entry.value,
                    style: TextStyle(color: c.textSecondary, fontSize: 13),
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
