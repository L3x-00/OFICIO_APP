import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import 'filter_section_label.dart';

class VerificationSection extends StatelessWidget {
  final bool verifiedOnly;
  final ValueChanged<bool> onChanged;

  const VerificationSection({
    super.key,
    required this.verifiedOnly,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionLabel(label: 'VERIFICACIÓN'),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: () => onChanged(!verifiedOnly),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: verifiedOnly
                  ? AppColors.verified.withValues(alpha: 0.08)
                  : c.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: verifiedOnly
                    ? AppColors.verified.withValues(alpha: 0.4)
                    : c.border,
                width: verifiedOnly ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.verified_rounded,
                  color: verifiedOnly
                      ? AppColors.tintOn(AppColors.verified, c.isDark)
                      : c.textMuted,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Solo proveedores verificados',
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        'Con el check azul de confianza',
                        style: TextStyle(color: c.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: verifiedOnly,
                  onChanged: onChanged,
                  activeThumbColor: AppColors.verified,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}
