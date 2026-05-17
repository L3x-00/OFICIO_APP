import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import 'filter_chip.dart';
import 'filter_section_label.dart';

class AvailabilitySection extends StatelessWidget {
  final String? availability;
  final ValueChanged<String?> onChanged;

  const AvailabilitySection({
    super.key,
    required this.availability,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionLabel(label: 'DISPONIBILIDAD'),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          children: [
            AppFilterChip(
              label: '🟢  Disponible ahora',
              isSelected: availability == 'DISPONIBLE',
              color: AppColors.available,
              onTap: () => onChanged(
                  availability == 'DISPONIBLE' ? null : 'DISPONIBLE'),
            ),
            AppFilterChip(
              label: '🟠  Con demora',
              isSelected: availability == 'CON_DEMORA',
              color: AppColors.delayed,
              onTap: () => onChanged(
                  availability == 'CON_DEMORA' ? null : 'CON_DEMORA'),
            ),
          ],
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}
