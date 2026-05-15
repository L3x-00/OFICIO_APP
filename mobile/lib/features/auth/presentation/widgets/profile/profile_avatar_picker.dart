import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

/// Avatar circular con iniciales del nombre — fallback cuando el usuario
/// no tiene `avatarUrl` o la imagen falla al cargar.
class InitialsAvatar extends StatelessWidget {
  final String name;
  const InitialsAvatar({super.key, required this.name});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.transparent,
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 32,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

/// Gestor de selección y subida de avatar. Expone:
///   - [uploading] como [ValueNotifier<bool>] para que la UI muestre el
///     spinner sobre el avatar mientras sube la imagen.
///   - [pickAndUpload]: pipeline cámara/galería → `auth.updateProfilePicture`.
///   - [showOptions]: bottom sheet con cámara/galería.
///
/// El widget que lo usa debe instanciarlo en `initState` y llamar
/// [dispose] en su `dispose`.
class AvatarPickerManager {
  final ValueNotifier<bool> uploading = ValueNotifier<bool>(false);

  void dispose() => uploading.dispose();

  Future<void> pickAndUpload(BuildContext context, ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: source,
      imageQuality: 80,
      maxWidth: 800,
    );
    if (picked == null || !context.mounted) return;

    uploading.value = true;
    final auth = context.read<AuthProvider>();
    final ok = await auth.updateProfilePicture(File(picked.path));
    uploading.value = false;
    if (!context.mounted) return;

    if (!ok) {
      context.showErrorSnack(auth.error ?? 'Error al subir la imagen');
    }
  }

  void showOptions(BuildContext context) {
    final c = context.colors;
    showModalBottomSheet(
      context: context,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(
                Icons.camera_alt_rounded,
                color: AppColors.primary,
              ),
              title: Text('Tomar foto', style: TextStyle(color: c.textPrimary)),
              onTap: () {
                Navigator.pop(context);
                pickAndUpload(context, ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.photo_library_rounded,
                color: AppColors.primary,
              ),
              title: Text(
                'Seleccionar de la galería',
                style: TextStyle(color: c.textPrimary),
              ),
              onTap: () {
                Navigator.pop(context);
                pickAndUpload(context, ImageSource.gallery);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
