import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Selector de foto de evidencia para la reseña. Tres estados:
///   1) `selectedImage != null` → preview local + botón X para quitar.
///   2) edit mode + `keepExistingPhoto` + URL no vacía → preview de
///      red + botón "Cambiar".
///   3) caso por defecto → fila de 2 botones (Cámara / Galería).
class PhotoEvidencePicker extends StatelessWidget {
  final File? selectedImage;
  final String? existingPhotoUrl;
  final bool isEditMode;
  final bool keepExistingPhoto;
  final ValueChanged<ImageSource> onPickImage;
  final VoidCallback onRemovePhoto;
  final VoidCallback onShowSourcePicker;
  final AppThemeColors colors;

  const PhotoEvidencePicker({
    super.key,
    required this.selectedImage,
    required this.existingPhotoUrl,
    required this.isEditMode,
    required this.keepExistingPhoto,
    required this.onPickImage,
    required this.onRemovePhoto,
    required this.onShowSourcePicker,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    final c = colors;

    // 1) Foto nueva local
    if (selectedImage != null) {
      return Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.file(selectedImage!,
                height: 160, width: double.infinity, fit: BoxFit.cover),
          ),
          Positioned(
            top: 8, right: 8,
            child: GestureDetector(
              onTap: onRemovePhoto,
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.6), shape: BoxShape.circle),
                child: const Icon(Icons.close, color: Colors.white, size: 18),
              ),
            ),
          ),
        ],
      );
    }

    // 2) Foto existente en red (edit mode)
    if (isEditMode &&
        keepExistingPhoto &&
        existingPhotoUrl != null &&
        existingPhotoUrl!.isNotEmpty) {
      return Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.network(
              existingPhotoUrl!,
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _photoPickerRow(c),
            ),
          ),
          // Botón para reemplazar
          Positioned(
            bottom: 8, right: 8,
            child: GestureDetector(
              onTap: onShowSourcePicker,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.65),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.edit_rounded, color: Colors.white, size: 14),
                    SizedBox(width: 5),
                    Text('Cambiar', style: TextStyle(color: Colors.white, fontSize: 12)),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    // 3) Placeholder vacío
    return _photoPickerRow(c);
  }

  Widget _photoPickerRow(AppThemeColors c) {
    return Row(
      children: [
        Expanded(
          child: _PhotoOptionButton(
            icon: Icons.camera_alt_rounded,
            label: 'Cámara',
            bgCard: c.bgCard,
            onTap: () => onPickImage(ImageSource.camera),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _PhotoOptionButton(
            icon: Icons.photo_library_rounded,
            label: 'Galería',
            bgCard: c.bgCard,
            onTap: () => onPickImage(ImageSource.gallery),
          ),
        ),
      ],
    );
  }
}

class _PhotoOptionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color bgCard;
  final VoidCallback onTap;
  const _PhotoOptionButton({
    required this.icon,
    required this.label,
    required this.bgCard,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 28),
            const SizedBox(height: 6),
            Text(label,
                style: TextStyle(
                    color: context.colors.textSecondary, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
