import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/location_picker_sheet.dart';
import '../providers/providers_provider.dart';

/// Chip único de ubicación de la pantalla principal. Antes coexistía con
/// otro chip en la cabecera (`GreetingHeader`) que mostraba el mismo
/// dato y confundía al usuario — se eliminó ese duplicado y este chip
/// asume el rol completo:
///
///   1) Sin ubicación activa: CTA "Detectar mi ubicación" que llama a
///      [ProvidersProvider.detectAndSetGpsLocation] (extrae las
///      coordenadas exactas y persiste dept/prov/dist en
///      SharedPreferences).
///   2) Con ubicación activa: muestra "Distrito · Provincia · Dept"
///      (live del stream GPS si disponible), permite tocar para abrir
///      el picker manual, y exhibe un botón X para limpiar el filtro.
///
/// El stream GPS en `ProvidersProvider.startGpsStream()` actualiza el
/// chip y dispara un reload del catálogo cuando el usuario se mueve
/// ≥2 km o cambia de distrito/provincia. Si no se mueve, el snapshot
/// persistido se mantiene.
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
    await context.read<ProvidersProvider>().clearLocationFilter();
  }

  Future<void> _openManualPicker() async {
    final prov = context.read<ProvidersProvider>();
    final result = await LocationPickerSheet.show(
      context,
      initialDepartment: prov.department,
      initialProvince:   prov.province,
      initialDistrict:   prov.district,
    );
    if (result != null && mounted) {
      await prov.setUserLocation(
        department: result.department,
        province:   result.province,
        district:   result.district,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final prov = context.watch<ProvidersProvider>();
    final hasLocation = prov.department != null;

    // Si el stream GPS está activo y tenemos live values, los
    // priorizamos sobre los persistidos — el chip refleja la zona real
    // del usuario en tiempo real.
    final liveDistrict = prov.liveDistrict;
    final liveProvince = prov.liveProvince;
    final displayDistrict = (liveDistrict?.isNotEmpty ?? false) ? liveDistrict : prov.district;
    final displayProvince = (liveProvince?.isNotEmpty ?? false) ? liveProvince : prov.province;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        child: hasLocation
            ? _ActiveLocationChip(
                key: const ValueKey('active'),
                c: c,
                department: prov.department!,
                province:   displayProvince,
                district:   displayDistrict,
                onClear:    _clearLocation,
                onTap:      _openManualPicker,
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
  /// Tap sobre el cuerpo del chip — abre el LocationPickerSheet para
  /// elegir manualmente dept/prov/dist. La X sigue limpiando el filtro.
  final VoidCallback onTap;
  const _ActiveLocationChip({
    super.key,
    required this.c,
    required this.department,
    required this.province,
    required this.district,
    required this.onClear,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final parts = <String>[
      ?district,
      ?province,
      department,
    ];
    final label = parts.join(' · ');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
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
