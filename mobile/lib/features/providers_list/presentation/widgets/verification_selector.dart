import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Selector de verificación anti-fraude usado en el flujo de crear
/// reseña (NO se muestra en edit mode).
///   - `validationMethod`: 0=ninguno, 1=GPS, 2=QR.
///   - El padre conserva el estado y reacciona a los callbacks.
class VerificationSelector extends StatelessWidget {
  final int validationMethod;
  final Position? gpsPosition;
  final bool gpsLoading;
  final TextEditingController qrController;
  final ValueChanged<int> onSelectMethod;
  final VoidCallback onFetchGps;
  final AppThemeColors colors;

  const VerificationSelector({
    super.key,
    required this.validationMethod,
    required this.gpsPosition,
    required this.gpsLoading,
    required this.qrController,
    required this.onSelectMethod,
    required this.onFetchGps,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    final c = colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Verificación anti-fraude *',
            style: TextStyle(
                color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text('Elige cómo verificar que usaste este servicio',
            style: TextStyle(color: c.textMuted, fontSize: 12)),
        const SizedBox(height: 12),

        // GPS
        _VerificationOption(
          icon: Icons.gps_fixed_rounded,
          title: 'Verificar con GPS',
          subtitle: gpsPosition != null
              ? 'Ubicación obtenida ✓'
              : 'Confirma que estuviste en el lugar',
          isSelected: validationMethod == 1,
          onTap: () {
            onSelectMethod(1);
            if (gpsPosition == null) onFetchGps();
          },
        ),

        if (validationMethod == 1) ...[
          const SizedBox(height: 10),
          if (gpsLoading)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  const SizedBox(width: 14),
                  const SizedBox(
                    width: 16, height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: AppColors.primary),
                  ),
                  const SizedBox(width: 10),
                  Text('Obteniendo ubicación...',
                      style: TextStyle(color: c.textMuted, fontSize: 13)),
                ],
              ),
            )
          else if (gpsPosition != null)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.available.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: AppColors.available.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_rounded,
                      color: AppColors.available, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Ubicación verificada',
                            style: TextStyle(
                                color: AppColors.available,
                                fontSize: 13,
                                fontWeight: FontWeight.w600)),
                        Text(
                          'Lat: ${gpsPosition!.latitude.toStringAsFixed(5)}  Lng: ${gpsPosition!.longitude.toStringAsFixed(5)}',
                          style: TextStyle(color: c.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: onFetchGps,
                    child:
                        Icon(Icons.refresh_rounded, color: c.textMuted, size: 18),
                  ),
                ],
              ),
            )
          else
            GestureDetector(
              onTap: onFetchGps,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 11),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.my_location_rounded,
                        color: AppColors.primary, size: 18),
                    const SizedBox(width: 8),
                    Text('Obtener mi ubicación actual',
                        style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
        ],

        const SizedBox(height: 8),

        // QR
        _VerificationOption(
          icon: Icons.qr_code_scanner_rounded,
          title: 'Código QR del proveedor',
          subtitle: 'El proveedor te da un código al terminar',
          isSelected: validationMethod == 2,
          onTap: () => onSelectMethod(2),
        ),
        if (validationMethod == 2) ...[
          const SizedBox(height: 12),
          TextField(
            controller: qrController,
            style: TextStyle(color: c.textPrimary),
            decoration: InputDecoration(
              hintText: 'Ingresa el código del proveedor',
              hintStyle: TextStyle(color: c.textMuted),
              prefixIcon: Icon(Icons.lock_outline, color: c.textMuted),
              filled: true,
              fillColor: c.bgCard,
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none),
            ),
          ),
        ],
      ],
    );
  }
}

class _VerificationOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;
  const _VerificationOption(
      {required this.icon,
      required this.title,
      required this.subtitle,
      required this.isSelected,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.08)
              : c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: isSelected
                  ? AppColors.primary.withValues(alpha: 0.5)
                  : c.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withValues(alpha: 0.15)
                    : c.bgInput,
                shape: BoxShape.circle,
              ),
              child: Icon(icon,
                  color: isSelected ? AppColors.primary : c.textMuted,
                  size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: TextStyle(
                          color: isSelected
                              ? c.textPrimary
                              : c.textSecondary,
                          fontSize: 14,
                          fontWeight: isSelected
                              ? FontWeight.w600
                              : FontWeight.normal)),
                  Text(subtitle,
                      style:
                          TextStyle(color: c.textMuted, fontSize: 12)),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle_rounded,
                  color: AppColors.primary, size: 20),
          ],
        ),
      ),
    );
  }
}
