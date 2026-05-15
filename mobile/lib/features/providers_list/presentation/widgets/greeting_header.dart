import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/location_picker_sheet.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/providers_provider.dart';

/// Saludo del usuario + botón de ubicación. Se renderiza en la cabecera
/// de la pantalla de proveedores.
///
/// [liveProvince] y [liveDistrict] permiten sobreescribir la etiqueta del
/// botón con la zona detectada por el stream GPS (en vivo, no requiere
/// recarga). Cuando ambos están presentes se compone "Distrito · Provincia"
/// para que el usuario vea su ubicación real, no solo el departamento.
class GreetingHeader extends StatelessWidget {
  final String? liveProvince;
  final String? liveDistrict;
  const GreetingHeader({super.key, this.liveProvince, this.liveDistrict});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final firstName = user?.firstName ?? (auth.isGuest ? null : 'Usuario');

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  firstName != null ? '¡Hola, $firstName!' : '¡Explora los servicios!',
                  style: TextStyle(color: c.textPrimary, fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 2),
                Text(
                  firstName != null ? '¿Qué necesitas hoy?' : 'Contrata sin registro • Es gratis',
                  style: TextStyle(color: c.textSecondary, fontSize: 13),
                ),
              ],
            ),
          ),
          _LocationButton(liveProvince: liveProvince, liveDistrict: liveDistrict),
        ],
      ),
    );
  }
}

class _LocationButton extends StatelessWidget {
  /// Province label from live GPS (overrides ProvidersProvider value when set).
  final String? liveProvince;
  /// District label from live GPS. Combinado con [liveProvince] produce
  /// "Distrito · Provincia".
  final String? liveDistrict;
  const _LocationButton({this.liveProvince, this.liveDistrict});

  @override
  Widget build(BuildContext context) {
    final c    = context.colors;
    final prov = context.watch<ProvidersProvider>();

    // El label prioriza el GPS en vivo (distrito + provincia) sobre el
    // filtro almacenado. Si solo hay uno, se muestra. Fallback final:
    // valores del filtro, luego departamento del perfil.
    final liveParts = <String>[
      if (liveDistrict != null && liveDistrict!.isNotEmpty) liveDistrict!,
      if (liveProvince != null && liveProvince!.isNotEmpty) liveProvince!,
    ];
    String label;
    if (liveParts.isNotEmpty) {
      label = liveParts.join(' · ');
    } else {
      final storedParts = <String>[
        if (prov.district != null && prov.district!.isNotEmpty) prov.district!,
        if (prov.province != null && prov.province!.isNotEmpty) prov.province!,
      ];
      label = storedParts.isNotEmpty
          ? storedParts.join(' · ')
          : (prov.department ?? 'Ubicación');
    }

    return GestureDetector(
      onTap: () async {
        final result = await LocationPickerSheet.show(
          context,
          initialDepartment: prov.department,
          initialProvince:   prov.province,
          initialDistrict:   prov.district,
        );
        if (result != null && context.mounted) {
          context.read<ProvidersProvider>().setUserLocation(
            department: result.department,
            province:   result.province,
            district:   result.district,
          );
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: prov.hasLocationFilter ? AppColors.primary.withValues(alpha: 0.4) : c.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.location_on_rounded,
                color: prov.hasLocationFilter ? AppColors.primary : AppColors.amber, size: 14),
            const SizedBox(width: 4),
            Text(label,
                style: TextStyle(
                  color: prov.hasLocationFilter ? AppColors.primary : c.textSecondary,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                )),
            const SizedBox(width: 4),
            Icon(Icons.expand_more_rounded,
                color: prov.hasLocationFilter ? AppColors.primary : c.textMuted, size: 13),
          ],
        ),
      ),
    );
  }
}
