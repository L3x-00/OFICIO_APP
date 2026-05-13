import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../shared/widgets/location_picker_sheet.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/providers_provider.dart';

/// Saludo del usuario + botón de ubicación. Se renderiza en la cabecera
/// de la pantalla de proveedores.
///
/// [liveProvince] permite sobreescribir la etiqueta del botón con la
/// provincia detectada por el stream GPS (en vivo, no requiere recarga).
class GreetingHeader extends StatelessWidget {
  final String? liveProvince;
  const GreetingHeader({super.key, this.liveProvince});

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
          _LocationButton(liveProvince: liveProvince),
        ],
      ),
    );
  }
}

class _LocationButton extends StatelessWidget {
  /// Province label from live GPS (overrides ProvidersProvider value when set).
  final String? liveProvince;
  const _LocationButton({this.liveProvince});

  @override
  Widget build(BuildContext context) {
    final c    = context.colors;
    final prov = context.watch<ProvidersProvider>();

    // Live GPS province takes priority over the stored filter value.
    final label = liveProvince
        ?? prov.province
        ?? prov.district
        ?? prov.department
        ?? 'Ubicación';

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
