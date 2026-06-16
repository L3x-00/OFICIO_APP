import 'package:flutter/material.dart';
import '../../../../../features/localities/data/dynamic_locations.dart';
import '../../widgets/expand_search_banner.dart';
import 'filter_gps_button.dart';
import 'filter_location_dropdown.dart';
import 'filter_section_label.dart';

/// Sección de ubicación: GPS + dropdowns dept/prov/dist + banner de
/// "ampliar búsqueda". Es stateless: el state vive en el FilterSheet,
/// que pasa los callbacks de selección y la acción de "ampliar".
class LocationSection extends StatelessWidget {
  final String? department;
  final String? province;
  final String? district;
  final bool gpsLoading;
  final VoidCallback onUseGps;
  final ValueChanged<String?> onDepartmentChanged;
  final ValueChanged<String?> onProvinceChanged;
  final ValueChanged<String?> onDistrictChanged;
  final VoidCallback onExpandToDepartment;

  const LocationSection({
    super.key,
    required this.department,
    required this.province,
    required this.district,
    required this.gpsLoading,
    required this.onUseGps,
    required this.onDepartmentChanged,
    required this.onProvinceChanged,
    required this.onDistrictChanged,
    required this.onExpandToDepartment,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionLabel(label: 'UBICACIÓN'),
        const SizedBox(height: 10),
        GpsButton(isLoading: gpsLoading, onTap: onUseGps),
        const SizedBox(height: 12),
        ListenableBuilder(
          listenable: DynamicLocations.instance,
          builder: (_, _) {
            final dyn = DynamicLocations.instance;
            final provList = department == null
                ? const <String>[]
                : dyn.provincesOf(department!);
            final distList = province == null
                ? const <String>[]
                : dyn.districtsOf(province!);
            return Column(
              children: [
                LocationDropdown(
                  label: 'Departamento',
                  value: department,
                  items: dyn.departments,
                  onChanged: onDepartmentChanged,
                ),
                const SizedBox(height: 10),
                LocationDropdown(
                  label: 'Provincia',
                  value: province,
                  items: provList,
                  enabled: department != null,
                  onChanged: onProvinceChanged,
                ),
                const SizedBox(height: 10),
                LocationDropdown(
                  label: 'Distrito',
                  value: district,
                  items: distList,
                  enabled: province != null && distList.isNotEmpty,
                  onChanged: onDistrictChanged,
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 14),
        // Banner: ampliar búsqueda a todo el departamento.
        if (department != null)
          ExpandSearchBanner(
            department: department!,
            // true = búsqueda ampliada (solo dept, sin prov/dist)
            isExpanded:
                department != null && province == null && district == null,
            onExpand: onExpandToDepartment,
          ),
        const SizedBox(height: 24),
      ],
    );
  }
}
