import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constans/app_colors.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/reviews_repository.dart';

/// Bottom sheet para crear una reseña
/// Se abre desde el detalle del proveedor
class CreateReviewSheet extends StatefulWidget {
  final int providerId;
  final String providerName;
  // En una app real, el userId vendría del AuthProvider
  // Por ahora lo pasamos directamente para simplificar
  final int userId;

  const CreateReviewSheet({
    super.key,
    required this.providerId,
    required this.providerName,
    required this.userId,
  });

  static Future<bool?> show(
    BuildContext context, {
    required int providerId,
    required String providerName,
    int userId = 1, // Valor temporal hasta implementar auth completo
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CreateReviewSheet(
        providerId: providerId,
        providerName: providerName,
        userId: userId,
      ),
    );
  }

  @override
  State<CreateReviewSheet> createState() => _CreateReviewSheetState();
}

class _CreateReviewSheetState extends State<CreateReviewSheet> {
  final _repo = ReviewsRepository();
  final _commentController = TextEditingController();
  final _qrController = TextEditingController();

  int _rating = 0;
  File? _selectedImage;
  bool _isLoading = false;
  String? _errorMessage;

  // Validación: 0 = sin método elegido, 1 = GPS, 2 = QR
  int _validationMethod = 0;

  @override
  void dispose() {
    _commentController.dispose();
    _qrController.dispose();
    super.dispose();
  }

  // ── Seleccionar imagen ────────────────────────────────────
  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: source,
      maxWidth: 1200,
      maxHeight: 1200,
      imageQuality: 80,
    );

    if (picked != null) {
      setState(() {
        _selectedImage = File(picked.path);
        _errorMessage = null;
      });
    }
  }

  // ── Enviar reseña ─────────────────────────────────────────
  Future<void> _submitReview() async {
    // Validaciones locales
    if (_rating == 0) {
      setState(() => _errorMessage = 'Por favor selecciona una calificación');
      return;
    }

    if (_selectedImage == null) {
      setState(() => _errorMessage = 'La foto es obligatoria como evidencia');
      return;
    }

    if (_validationMethod == 0) {
      setState(
        () => _errorMessage = 'Elige un método de verificación (GPS o QR)',
      );
      return;
    }

    if (_validationMethod == 2 && _qrController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Ingresa el código QR del proveedor');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Paso 1: Subir la foto
      final photoUrl = await _repo.uploadPhoto(_selectedImage!);

      // Paso 2: Crear la reseña
      await _repo.createReview(
        providerId: widget.providerId,
        userId: widget.userId,
        rating: _rating,
        photoUrl: photoUrl,
        comment: _commentController.text.trim().isNotEmpty
            ? _commentController.text.trim()
            : null,
        qrCode: _validationMethod == 2
            ? _qrController.text.trim()
            : null,
      );

      if (mounted) {
        Navigator.of(context).pop(true); // true = reseña creada con éxito
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Reseña publicada con éxito! Gracias.'),
            backgroundColor: AppColors.available,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: AppColors.bgDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: AppColors.textMuted.withOpacity(0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Título
            Text(
              'Reseñar a ${widget.providerName}',
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Tu opinión ayuda a otros usuarios a elegir mejor',
              style: TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
            const SizedBox(height: 24),

            // ── Calificación con estrellas ─────────────────
            const Text(
              'Calificación *',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            RatingBar.builder(
              initialRating: _rating.toDouble(),
              minRating: 1,
              direction: Axis.horizontal,
              allowHalfRating: false,
              itemCount: 5,
              itemSize: 40,
              itemBuilder: (context, _) => const Icon(
                Icons.star_rounded,
                color: AppColors.star,
              ),
              onRatingUpdate: (rating) {
                setState(() => _rating = rating.toInt());
              },
            ),
            const SizedBox(height: 20),

            // ── Foto obligatoria ───────────────────────────
            const Text(
              'Foto de evidencia *',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Sube una foto del trabajo realizado o del local',
              style: TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 10),
            _buildPhotoSelector(),
            const SizedBox(height: 20),

            // ── Comentario opcional ────────────────────────
            const Text(
              'Comentario (opcional)',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _commentController,
              style: const TextStyle(color: AppColors.textPrimary),
              maxLines: 3,
              maxLength: 500,
              decoration: InputDecoration(
                hintText: 'Describe tu experiencia...',
                hintStyle: const TextStyle(color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.bgCard,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                counterStyle:
                    const TextStyle(color: AppColors.textMuted, fontSize: 11),
              ),
            ),
            const SizedBox(height: 16),

            // ── Método de verificación ─────────────────────
            _buildVerificationSelector(),
            const SizedBox(height: 20),

            // ── Error ──────────────────────────────────────
            if (_errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.busy.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.busy.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline,
                        color: AppColors.busy, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(
                            color: AppColors.busy, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),

            // ── Botón enviar ───────────────────────────────
            SizedBox(
              width: double.infinity,
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                          color: AppColors.primary),
                    )
                  : ElevatedButton(
                      onPressed: _submitReview,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Publicar Reseña',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Selector de foto ─────────────────────────────────────

  Widget _buildPhotoSelector() {
    if (_selectedImage != null) {
      return Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.file(
              _selectedImage!,
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
          Positioned(
            top: 8,
            right: 8,
            child: GestureDetector(
              onTap: () => setState(() => _selectedImage = null),
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.6),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close,
                    color: Colors.white, size: 18),
              ),
            ),
          ),
        ],
      );
    }

    return Row(
      children: [
        Expanded(
          child: _PhotoOptionButton(
            icon: Icons.camera_alt_rounded,
            label: 'Cámara',
            onTap: () => _pickImage(ImageSource.camera),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _PhotoOptionButton(
            icon: Icons.photo_library_rounded,
            label: 'Galería',
            onTap: () => _pickImage(ImageSource.gallery),
          ),
        ),
      ],
    );
  }

  // ─── Selector de método de verificación ──────────────────

  Widget _buildVerificationSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Verificación anti-fraude *',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Elige cómo verificar que usaste este servicio',
          style: TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
        const SizedBox(height: 12),

        // Opción GPS
        _VerificationOption(
          icon: Icons.gps_fixed_rounded,
          title: 'Verificar con GPS',
          subtitle: 'Confirma que estuviste en el lugar',
          isSelected: _validationMethod == 1,
          onTap: () => setState(() => _validationMethod = 1),
        ),
        const SizedBox(height: 8),

        // Opción QR
        _VerificationOption(
          icon: Icons.qr_code_scanner_rounded,
          title: 'Código QR del proveedor',
          subtitle: 'El proveedor te da un código al terminar',
          isSelected: _validationMethod == 2,
          onTap: () => setState(() => _validationMethod = 2),
        ),

        // Campo QR si eligió esa opción
        if (_validationMethod == 2) ...[
          const SizedBox(height: 12),
          TextField(
            controller: _qrController,
            style: const TextStyle(color: AppColors.textPrimary),
            decoration: InputDecoration(
              hintText: 'Ingresa el código del proveedor',
              hintStyle: const TextStyle(color: AppColors.textMuted),
              prefixIcon: const Icon(Icons.lock_outline,
                  color: AppColors.textMuted),
              filled: true,
              fillColor: AppColors.bgCard,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// ─── Botón de opción de foto ──────────────────────────────

class _PhotoOptionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _PhotoOptionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: AppColors.primary.withOpacity(0.3),
            style: BorderStyle.solid,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 28),
            const SizedBox(height: 6),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Opción de verificación ───────────────────────────────

class _VerificationOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  const _VerificationOption({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withOpacity(0.08)
              : AppColors.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected
                ? AppColors.primary.withOpacity(0.5)
                : Colors.white.withOpacity(0.06),
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withOpacity(0.15)
                    : AppColors.bgInput,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: isSelected ? AppColors.primary : AppColors.textMuted,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isSelected
                          ? AppColors.textPrimary
                          : AppColors.textSecondary,
                      fontSize: 14,
                      fontWeight: isSelected
                          ? FontWeight.w600
                          : FontWeight.normal,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 12,
                    ),
                  ),
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