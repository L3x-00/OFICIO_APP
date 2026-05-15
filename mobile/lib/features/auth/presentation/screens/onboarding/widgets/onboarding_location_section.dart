import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/location_picker_sheet.dart';

/// Sección de UI encargada de mostrar y seleccionar la ubicación administrativa (Dept/Prov/Dist).
class OnboardingLocationSection extends StatelessWidget {
  final String? department;
  final String? province;
  final String? district;

  const OnboardingLocationSection({
    super.key,
    required this.department,
    required this.province,
    required this.district,
  });

  bool get hasLocation => department != null && province != null && district != null;

  // Usamos var/future dinámico para evitar dependencias de modelos externos aquí.
  // Dart inferirá el tipo correcto basado en tu LocationPickerSheet.show()
  Future<dynamic> showPicker(BuildContext context) async {
    return await LocationPickerSheet.show(
      context,
      initialDepartment: department,
      initialProvince:   province,
      initialDistrict:   district,
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasLoc = hasLocation;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: hasLoc
              ? AppColors.primary.withValues(alpha: 0.4)
              : AppColors.busy.withValues(alpha: 0.5),
        ),
      ),
      child: Row(
        children: [
          Icon(
            hasLoc ? Icons.location_on_rounded : Icons.location_off_rounded,
            color: hasLoc ? AppColors.primary : AppColors.busy,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  hasLoc
                      ? '$district, $province'
                      : 'Seleccionar ubicación *',
                  style: TextStyle(
                    color: hasLoc ? c.textPrimary : AppColors.busy,
                    fontSize: 14,
                    fontWeight: hasLoc ? FontWeight.w500 : FontWeight.normal,
                  ),
                ),
                if (hasLoc)
                  Text(
                    department!,
                    style: TextStyle(color: c.textSecondary, fontSize: 12),
                  ),
              ],
            ),
          ),
          Icon(Icons.edit_rounded, color: c.textMuted, size: 16),
        ],
      ),
    );
  }
}