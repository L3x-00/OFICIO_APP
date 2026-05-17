import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

/// Bottom sheet "Cámara / Galería" para elegir fuente de imagen.
/// Devuelve la [ImageSource] elegida o null si el usuario canceló.
class PhotoSourceSheet {
  PhotoSourceSheet._();

  static Future<ImageSource?> show(BuildContext context) {
    return showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded),
              title: const Text('Cámara'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: const Text('Galería'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
  }
}
