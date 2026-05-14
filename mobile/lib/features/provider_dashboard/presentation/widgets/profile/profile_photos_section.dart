import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constans/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../../core/utils/plan_limits.dart';
import '../../../domain/models/dashboard_profile_model.dart';
import '../../providers/dashboard_provider.dart';

/// Sección de fotos del servicio. Muestra la grilla de fotos con límite
/// por plan, permite añadir (galería, ≤5 MB) y eliminar con confirmación.
///
/// Las acciones consumen [DashboardProvider] directamente; el indicador de
/// carga del AppBar usa `dash.isUploadingPhoto`, por lo que [onSavingChanged]
/// se mantiene por consistencia de API pero la subida ya se refleja vía el
/// provider.
class ProfilePhotosSection extends StatefulWidget {
  final DashboardProfileModel? profile;
  final ValueSetter<bool> onSavingChanged;

  const ProfilePhotosSection({
    super.key,
    required this.profile,
    required this.onSavingChanged,
  });

  @override
  State<ProfilePhotosSection> createState() => _ProfilePhotosSectionState();
}

class _ProfilePhotosSectionState extends State<ProfilePhotosSection> {
  Future<void> _pickPhoto() async {
    final dash = context.read<DashboardProvider>();
    if (dash.isUploadingPhoto) return; // evitar doble tap

    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (file == null || !mounted) return;

    // Validar tamaño antes de subir (5 MB)
    final bytes = await file.readAsBytes();
    if (!mounted) return;
    if (bytes.length > 5 * 1024 * 1024) {
      _showSnack('La imagen supera 5 MB. Elige una más pequeña.', isError: true);
      return;
    }

    final url = await dash.uploadProviderPhoto(file.path);

    if (!mounted) return;

    if (url != null) {
      _showSnack('¡Foto subida con éxito!');
    } else {
      _showSnack(
        dash.uploadError ?? 'Error al subir la imagen. Inténtalo de nuevo.',
        isError: true,
      );
    }
  }

  void _showSnack(String message, {bool isError = false}) {
    if (!mounted) return;
    if (isError) {
      context.showErrorSnack(message);
    } else {
      context.showSuccessSnack(message);
    }
  }

  void _confirmDeletePhoto(ProfileImage img) {
    final c = context.colors;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Eliminar foto', style: TextStyle(color: c.textPrimary)),
        content: Text(
          '¿Quieres eliminar esta foto de tu perfil?',
          style: TextStyle(color: c.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final dash = context.read<DashboardProvider>();
              final ok = await dash.deleteProviderImage(img.id);
              if (!mounted) return;
              _showSnack(
                ok ? 'Foto eliminada' : 'Error al eliminar la foto',
                isError: !ok,
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.busy),
            child: Text('Eliminar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c        = context.colors;
    final profile  = widget.profile;
    final images   = profile?.images ?? [];
    final plan     = profile?.subscription?.plan ?? 'GRATIS';
    final maxFotos = PlanLimits.photos(plan);
    final canAdd   = PlanLimits.canAddPhoto(plan, images.length);
    // Espaciadores: slots vacíos hasta completar la fila visual (max 4 slots visibles)
    final visibleSlots = maxFotos.clamp(0, 4);
    final emptySlots   = (visibleSlots - images.length - (canAdd ? 1 : 0)).clamp(0, visibleSlots);

    final planColor = switch (plan.toUpperCase()) {
      'PREMIUM'  => AppColors.premium,
      'ESTANDAR' => AppColors.primary,
      _          => c.textMuted,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header: título + chip de límite siempre visible
        Row(
          children: [
            Icon(Icons.photo_library_rounded, color: AppColors.amber, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text('Fotos del servicio',
                  style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700)),
            ),
            // Chip prominente: X/N fotos · Plan
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: planColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: planColor.withValues(alpha: 0.4)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.photo_camera_rounded, size: 12, color: planColor),
                  const SizedBox(width: 4),
                  Text(
                    '${images.length}/$maxFotos  ·  ${plan[0]}${plan.substring(1).toLowerCase()}',
                    style: TextStyle(
                        color: planColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 100,
          child: Row(
            children: [
              ...images.take(maxFotos).map((img) => PhotoTile(
                    url: img.url,
                    onDelete: () => _confirmDeletePhoto(img),
                  )),
              if (canAdd) AddPhotoTile(onTap: _pickPhoto),
              ...List.generate(emptySlots, (_) => const EmptyPhotoTile()),
            ],
          ),
        ),
        const SizedBox(height: 8),
        if (!canAdd)
          PhotoLimitNote(plan: plan, max: maxFotos, c: c)
        else
          Text(
            'La primera foto es tu imagen principal. Toca para reordenar.',
            style: TextStyle(color: c.textMuted, fontSize: 11),
          ),
      ],
    );
  }
}

/// Miniatura de foto con botón de eliminar superpuesto.
class PhotoTile extends StatelessWidget {
  final String url;
  final VoidCallback onDelete;

  const PhotoTile({super.key, required this.url, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: 90,
      height: 90,
      margin: const EdgeInsets.only(right: 8),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(12),
        image: DecorationImage(
          image: NetworkImage(url),
          fit: BoxFit.cover,
          onError: (_, _) {},
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: 4,
            right: 4,
            child: GestureDetector(
              onTap: onDelete,
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: AppColors.busy,
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.close_rounded, color: Colors.white, size: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Slot para añadir una nueva foto (borde punteado amber).
class AddPhotoTile extends StatelessWidget {
  final VoidCallback onTap;
  const AddPhotoTile({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 90,
        height: 90,
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.amber.withValues(alpha: 0.4), width: 1.5),
        ),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_photo_alternate_rounded, color: AppColors.amber, size: 28),
            SizedBox(height: 4),
            Text('Añadir', style: TextStyle(color: AppColors.amber, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}

/// Nota que aparece cuando el proveedor alcanzó el límite de fotos.
class PhotoLimitNote extends StatelessWidget {
  final String plan;
  final int max;
  final AppThemeColors c;
  const PhotoLimitNote({super.key, required this.plan, required this.max, required this.c});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(Icons.lock_rounded, color: AppColors.busy, size: 13),
        const SizedBox(width: 5),
        Expanded(
          child: Text(
            'Límite de $max fotos (plan ${plan.toLowerCase()}). '
            'Sube al plan ${PlanLimits.nextPlan(plan)} para añadir más.',
            style: TextStyle(color: AppColors.busy, fontSize: 11, height: 1.4),
          ),
        ),
      ],
    );
  }
}

/// Slot vacío (placeholder visual) para completar la fila de fotos.
class EmptyPhotoTile extends StatelessWidget {
  const EmptyPhotoTile({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: 90,
      height: 90,
      margin: const EdgeInsets.only(right: 8),
      decoration: BoxDecoration(
        color: c.bgCard.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
    );
  }
}
