import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import 'filter_section_label.dart';
import 'filter_sort_options.dart';

class SortBySection extends StatelessWidget {
  final String? sortBy;
  final ValueChanged<String?> onChanged;

  const SortBySection({
    super.key,
    required this.sortBy,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionLabel(label: 'ORDENAR POR'),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: c.border),
          ),
          child: Column(
            children: List.generate(kSortOptions.length, (i) {
              final opt = kSortOptions[i];
              final isSelected = sortBy == opt.value;
              final isLast = i == kSortOptions.length - 1;
              return Column(
                children: [
                  SortOptionItem(
                    option: opt,
                    isSelected: isSelected,
                    isLast: isLast,
                    index: i,
                    onTap: () => onChanged(opt.value),
                  ),
                  if (!isLast)
                    Divider(
                      height: 1,
                      indent: 14,
                      endIndent: 14,
                      color: c.border,
                    ),
                ],
              );
            }),
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}

class SortOptionItem extends StatelessWidget {
  final SortOption option;
  final bool isSelected;
  final bool isLast;
  final int index;
  final VoidCallback onTap;

  const SortOptionItem({
    super.key,
    required this.option,
    required this.isSelected,
    required this.isLast,
    required this.index,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(
            horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.06)
              : Colors.transparent,
          borderRadius: BorderRadius.vertical(
            top: index == 0
                ? const Radius.circular(14)
                : Radius.zero,
            bottom: isLast
                ? const Radius.circular(14)
                : Radius.zero,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withValues(alpha: 0.15)
                    : c.bgInput,
                shape: BoxShape.circle,
              ),
              child: Icon(
                option.icon,
                size: 18,
                color: isSelected ? AppColors.primary : c.textMuted,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    option.label,
                    style: TextStyle(
                      color: isSelected ? AppColors.primary : c.textPrimary,
                      fontSize: 14,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    ),
                  ),
                  Text(
                    option.subtitle,
                    style: TextStyle(color: c.textMuted, fontSize: 11),
                  ),
                ],
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppColors.primary : c.border,
                  width: isSelected ? 0 : 1.5,
                ),
                color: isSelected ? AppColors.primary : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check, color: Colors.white, size: 13)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
