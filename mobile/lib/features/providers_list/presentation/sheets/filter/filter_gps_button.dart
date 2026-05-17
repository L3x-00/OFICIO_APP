import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';

/// Botón "Usar mi ubicación actual" — outlined, con loader inline.
class GpsButton extends StatelessWidget {
  final bool isLoading;
  final VoidCallback onTap;
  const GpsButton({
    super.key,
    required this.isLoading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: isLoading ? null : onTap,
        icon: isLoading
            ? const SizedBox(
                width: 14, height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primary,
                ),
              )
            : const Icon(Icons.my_location_rounded,
                size: 16, color: AppColors.primary),
        label: Text(
          isLoading ? 'Detectando…' : 'Usar mi ubicación actual',
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 12),
          side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
