import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../providers/providers_provider.dart';

/// Chip de detección rápida de ubicación / filtro activo.
///
/// Vive entre los filtros de categoría y el banner de subastas. Dos modos:
///
///   1) `hasLocationFilter == true`: muestra "📍 Dept · Prov · Dist" con
///      botón X para limpiar el filtro estructurado.
///   2) Sin filtro: ofrece un atajo one-tap "Detectar mi ubicación" que
///      delega al método [ProvidersProvider.detectAndSetGpsLocation] —
///      éste maneja permisos, GPS, geocoding, sanitización y SnackBar
///      de "Añadir al catálogo" si la ubicación no existe.
class LocationChipBar extends StatefulWidget {
  const LocationChipBar({super.key});

  @override
  State<LocationChipBar> createState() => _LocationChipBarState();
}

class _LocationChipBarState extends State<LocationChipBar> {
  bool _busy = false;

  Future<void> _detectGps() async {
    if (_busy) return;
    setState(() => _busy = true);
    await context.read<ProvidersProvider>().detectAndSetGpsLocation(context);
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _clearLocation() async {
    await context.read<ProvidersProvider>().setUserLocation();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final prov = context.watch<ProvidersProvider>();
    final hasLocation = prov.department != null;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        child: hasLocation
            ? _ActiveLocationChip(
                key: const ValueKey('active'),
                c: c,
                department: prov.department!,
                province:   prov.province,
                district:   prov.district,
                onClear:    _clearLocation,
              )
            : _DetectGpsChip(
                key: const ValueKey('detect'),
                c: c,
                busy: _busy,
                onTap: _detectGps,
              ),
      ),
    );
  }
}

class _ActiveLocationChip extends StatelessWidget {
  final AppThemeColors c;
  final String department;
  final String? province;
  final String? district;
  final VoidCallback onClear;
  const _ActiveLocationChip({
    super.key,
    required this.c,
    required this.department,
    required this.province,
    required this.district,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final parts = <String>[
      ?district,
      ?province,
      department,
    ];
    final label = parts.join(' · ');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Icon(Icons.place_rounded, color: AppColors.primary, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Mostrando servicios en: $label',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 6),
          InkWell(
            onTap: onClear,
            customBorder: const CircleBorder(),
            child: Padding(
              padding: const EdgeInsets.all(2),
              child: Icon(Icons.close_rounded, color: c.textMuted, size: 16),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetectGpsChip extends StatelessWidget {
  final AppThemeColors c;
  final bool busy;
  final VoidCallback onTap;
  const _DetectGpsChip({
    super.key,
    required this.c,
    required this.busy,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: busy ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: c.border),
        ),
        child: Row(
          children: [
            busy
                ? const SizedBox(
                    width: 14, height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  )
                : Icon(Icons.my_location_rounded, color: AppColors.primary, size: 16),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                busy
                    ? 'Detectando tu ubicación…'
                    : 'Detectar mi ubicación para ver servicios cercanos',
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}
