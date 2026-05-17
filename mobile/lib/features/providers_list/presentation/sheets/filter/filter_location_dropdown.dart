import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';

/// Dropdown estilizado para Dept/Prov/Dist. Si `enabled` es false se
/// atenúa y no abre el menú. Si el `value` actual no está en `items`
/// (sanitización), se muestra como null para evitar el assert de
/// DropdownButton.
class LocationDropdown extends StatelessWidget {
  final String label;
  final String? value;
  final List<String> items;
  final bool enabled;
  final ValueChanged<String?> onChanged;

  const LocationDropdown({
    super.key,
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final effective = (value != null && items.contains(value)) ? value : null;

    return Opacity(
      opacity: enabled ? 1.0 : 0.45,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: c.border),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            value: effective,
            isExpanded: true,
            icon: Icon(Icons.expand_more_rounded, color: c.textMuted),
            dropdownColor: c.bgCard,
            hint: Row(
              children: [
                const Icon(Icons.location_on_outlined,
                    color: AppColors.amber, size: 18),
                const SizedBox(width: 8),
                Text(
                  enabled ? label : 'Selecciona el nivel anterior',
                  style: TextStyle(color: c.textMuted, fontSize: 13.5),
                ),
              ],
            ),
            selectedItemBuilder: (_) => items
                .map((it) => Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            color: AppColors.amber, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            it,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ))
                .toList(),
            items: items
                .map((it) => DropdownMenuItem<String>(
                      value: it,
                      child: Text(it, style: TextStyle(color: c.textPrimary)),
                    ))
                .toList(),
            onChanged: enabled ? onChanged : null,
          ),
        ),
      ),
    );
  }
}
