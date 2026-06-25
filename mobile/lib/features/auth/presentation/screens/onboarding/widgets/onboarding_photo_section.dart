import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

class OnboardingPhotoSection extends StatelessWidget {
  final List<XFile> photos;
  final int maxPhotos;
  final VoidCallback onPickPhoto;
  final void Function(int index) onRemovePhoto;
  final void Function(int from, int to) onReorderPhotos;

  const OnboardingPhotoSection({
    super.key,
    required this.photos,
    required this.maxPhotos,
    required this.onPickPhoto,
    required this.onRemovePhoto,
    required this.onReorderPhotos,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.lightbulb_rounded, color: AppColors.primary, size: 18),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Agregar imágenes reales de tus servicios aumenta la confianza del cliente y mejora tu visibilidad.',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 12,
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: List.generate(maxPhotos, (i) {
              if (i < photos.length)
                return _FilledSlot(
                  index: i,
                  photos: photos,
                  onRemove: onRemovePhoto,
                  onReorder: onReorderPhotos,
                );
              return _EmptySlot(
                index: i,
                photosLength: photos.length,
                onPick: onPickPhoto,
              );
            }),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Formatos: JPG, PNG, WEBP  •  Máx. 5 MB por foto',
          style: TextStyle(color: c.textMuted, fontSize: 11),
        ),
        if (photos.isNotEmpty) ...[
          const SizedBox(height: 3),
          Text(
            'Mantén presionado y arrastra para reordenar  •  La primera foto es la portada',
            style: TextStyle(color: c.textMuted, fontSize: 11),
          ),
        ],
      ],
    );
  }
}

class _FilledSlot extends StatelessWidget {
  final int index;
  final List<XFile> photos;
  final void Function(int) onRemove;
  final void Function(int, int) onReorder;

  const _FilledSlot({
    required this.index,
    required this.photos,
    required this.onRemove,
    required this.onReorder,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DragTarget<int>(
      onWillAcceptWithDetails: (d) => d.data != index,
      onAcceptWithDetails: (d) => onReorder(d.data, index),
      builder: (ctx, candidates, _) {
        final isHovered = candidates.isNotEmpty;
        return LongPressDraggable<int>(
          data: index,
          hapticFeedbackOnStart: true,
          feedback: Material(
            color: Colors.transparent,
            child: Opacity(
              opacity: 0.85,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(
                  File(photos[index].path),
                  width: 100,
                  height: 100,
                  fit: BoxFit.cover,
                ),
              ),
            ),
          ),
          childWhenDragging: Container(
            width: 100,
            height: 100,
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.4),
                width: 2,
              ),
            ),
          ),
          child: Container(
            width: 100,
            height: 100,
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: isHovered
                  ? Border.all(color: AppColors.primary, width: 2)
                  : null,
            ),
            child: Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.file(
                    File(photos[index].path),
                    width: 100,
                    height: 100,
                    fit: BoxFit.cover,
                  ),
                ),
                if (isHovered)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                Positioned(
                  top: 4,
                  right: 4,
                  child: GestureDetector(
                    onTap: () => onRemove(index),
                    child: Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.65),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close_rounded,
                        color: Colors.white,
                        size: 14,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 4,
                  left: 4,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.55),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: const Icon(
                      Icons.drag_indicator_rounded,
                      color: Colors.white,
                      size: 13,
                    ),
                  ),
                ),
                if (index == 0)
                  Positioned(
                    bottom: 4,
                    right: 4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 5,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.amber.withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: Text(
                        'Portada',
                        style: TextStyle(
                          color: AppColors.onSolid(AppColors.amber),
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _EmptySlot extends StatelessWidget {
  final int index;
  final int photosLength;
  final VoidCallback onPick;

  const _EmptySlot({
    required this.index,
    required this.photosLength,
    required this.onPick,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isNext = index == photosLength;
    return GestureDetector(
      onTap: isNext ? onPick : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 100,
        height: 100,
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isNext
                ? AppColors.primary.withValues(alpha: 0.35)
                : c.border,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isNext ? Icons.add_photo_alternate_rounded : Icons.photo_outlined,
              color: isNext
                  ? AppColors.primary.withValues(alpha: 0.6)
                  : c.textMuted.withValues(alpha: 0.25),
              size: 28,
            ),
            const SizedBox(height: 4),
            Text(
              'Foto ${index + 1}',
              style: TextStyle(
                color: isNext
                    ? AppColors.primary.withValues(alpha: 0.6)
                    : c.textMuted.withValues(alpha: 0.25),
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
