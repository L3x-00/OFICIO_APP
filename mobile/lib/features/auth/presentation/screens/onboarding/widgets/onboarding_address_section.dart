import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

class OnboardingAddressSection extends StatelessWidget {
  final TextEditingController addressController;
  final TextEditingController mapsUrlController;
  final bool showAddressSection;
  final bool gpsLoading;
  final Position? gpsPosition;
  final VoidCallback onToggleSection;
  final VoidCallback onFetchGps;
  final VoidCallback onClearGps;
  final VoidCallback onParseMapsUrl;

  const OnboardingAddressSection({
    super.key,
    required this.addressController,
    required this.mapsUrlController,
    required this.showAddressSection,
    required this.gpsLoading,
    required this.gpsPosition,
    required this.onToggleSection,
    required this.onFetchGps,
    required this.onClearGps,
    required this.onParseMapsUrl,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildAddressField(c, context),
        const SizedBox(height: 8),
        _buildToggle(c),
        if (showAddressSection) ...[
          const SizedBox(height: 10),
          _buildGpsButton(c),
          const SizedBox(height: 10),
          _buildDivider(c),
          const SizedBox(height: 10),
          _buildMapsUrlRow(c, context),
          const SizedBox(height: 4),
          Text(
            'Abre Google Maps → Comparte → Copia enlace → Pégalo aquí',
            style: TextStyle(color: c.textMuted, fontSize: 11),
          ),
        ],
      ],
    );
  }

  Widget _buildAddressField(AppThemeColors c, BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Dirección del negocio',
          style: TextStyle(
            color: c.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: addressController,
          style: TextStyle(color: c.textPrimary),
          decoration: InputDecoration(
            hintText: 'Jr. Ejemplo 123, Ciudad',
            hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
            prefixIcon: Icon(Icons.location_on_outlined, color: c.textMuted, size: 20),
            counterText: '',
            filled: true,
            fillColor: c.bgCard,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
            contentPadding: const EdgeInsets.all(14),
          ),
        ),
      ],
    );
  }

  Widget _buildToggle(AppThemeColors c) {
    return GestureDetector(
      onTap: onToggleSection,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: showAddressSection
              ? AppColors.primary.withValues(alpha: 0.08)
              : c.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: showAddressSection
                ? AppColors.primary.withValues(alpha: 0.35)
                : c.textMuted.withValues(alpha: 0.25),
          ),
        ),
        child: Row(
          children: [
            Icon(
              showAddressSection ? Icons.expand_less_rounded : Icons.language_rounded,
              color: showAddressSection ? AppColors.primary : c.textMuted,
              size: 17,
            ),
            const SizedBox(width: 10),
            Text(
              showAddressSection
                  ? 'Ocultar opciones de ubicación'
                  : 'Agregar GPS / URL Google Maps (opcional)',
              style: TextStyle(
                color: showAddressSection ? AppColors.primary : c.textMuted,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGpsButton(AppThemeColors c) {
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: gpsLoading ? null : onFetchGps,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 14),
              decoration: BoxDecoration(
                color: gpsPosition != null
                    ? AppColors.available.withValues(alpha: 0.08)
                    : AppColors.primary.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: gpsPosition != null
                      ? AppColors.available.withValues(alpha: 0.4)
                      : AppColors.primary.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (gpsLoading)
                    const SizedBox(
                      width: 16, height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                    )
                  else
                    Icon(
                      gpsPosition != null ? Icons.check_circle_rounded : Icons.my_location_rounded,
                      size: 16,
                      color: gpsPosition != null ? AppColors.available : AppColors.primary,
                    ),
                  const SizedBox(width: 7),
                  Flexible(
                    child: Text(
                      gpsLoading
                          ? 'Obteniendo ubicación...'
                          : gpsPosition != null ? 'GPS obtenido ✓' : 'Obtener ubicación actual',
                      style: TextStyle(
                        color: gpsPosition != null ? AppColors.available : AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (gpsPosition != null) ...[
          const SizedBox(width: 8),
          GestureDetector(
            onTap: onClearGps,
            child: Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: c.bgCard,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: c.border),
              ),
              child: Icon(Icons.close_rounded, size: 16, color: c.textMuted),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDivider(AppThemeColors c) {
    return Row(
      children: [
        Expanded(child: Divider(color: c.border, height: 1)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Text('ó', style: TextStyle(color: c.textMuted, fontSize: 12)),
        ),
        Expanded(child: Divider(color: c.border, height: 1)),
      ],
    );
  }

  Widget _buildMapsUrlRow(AppThemeColors c, BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: TextField(
            controller: mapsUrlController,
            style: TextStyle(color: c.textPrimary, fontSize: 13),
            decoration: InputDecoration(
              labelText: 'URL de Google Maps (opcional)',
              labelStyle: TextStyle(color: c.textMuted, fontSize: 13),
              hintText: 'Pega el enlace de tu ubicación en Maps',
              hintStyle: TextStyle(color: c.textMuted, fontSize: 12),
              prefixIcon: const Icon(Icons.map_outlined, color: AppColors.primary, size: 20),
              filled: true,
              fillColor: c.bgCard,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: onParseMapsUrl,
          child: Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20),
          ),
        ),
      ],
    );
  }
}
