import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/errors/app_exception.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../data/reviews_repository.dart';

/// Bottom sheet para crear una reseña
class CreateReviewSheet extends StatefulWidget {
  final int providerId;
  final String providerName;
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
    int userId = 1,
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
  final _repo              = ReviewsRepository();
  final _commentController = TextEditingController();
  final _qrController      = TextEditingController();

  int   _rating           = 0;
  File? _selectedImage;
  bool  _isLoading        = false;
  String? _errorMessage;
  int   _validationMethod = 0; // 0=ninguno, 1=GPS, 2=QR

  @override
  void dispose() {
    _commentController.dispose();
    _qrController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    final picked = await ImagePicker().pickImage(
      source: source, maxWidth: 1200, maxHeight: 1200, imageQuality: 80,
    );
    if (picked != null) {
      setState(() { _selectedImage = File(picked.path); _errorMessage = null; });
    }
  }

  Future<void> _submitReview() async {
    if (_rating == 0) {
      setState(() => _errorMessage = 'Por favor selecciona una calificación');
      return;
    }
    if (_selectedImage == null) {
      setState(() => _errorMessage = 'La foto es obligatoria como evidencia');
      return;
    }
    if (_validationMethod == 0) {
      setState(() => _errorMessage = 'Elige un método de verificación (GPS o QR)');
      return;
    }
    if (_validationMethod == 2 && _qrController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Ingresa el código QR del proveedor');
      return;
    }
    setState(() { _isLoading = true; _errorMessage = null; });
    try {
      final photoUrl = await _repo.uploadPhoto(_selectedImage!);
      await _repo.createReview(
        providerId: widget.providerId,
        userId:     widget.userId,
        rating:     _rating,
        photoUrl:   photoUrl,
        comment:    _commentController.text.trim().isNotEmpty ? _commentController.text.trim() : null,
        qrCode:     _validationMethod == 2 ? _qrController.text.trim() : null,
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      final msg = _extractErrorMessage(e);
      // Si el backend dice "ya existe" es porque la reseña SÍ se guardó
      // en un intento anterior (race condition). Tratarlo como éxito.
      if (_isAlreadySubmittedError(msg)) {
        if (mounted) Navigator.of(context).pop(true);
        return;
      }
      if (mounted) setState(() => _errorMessage = msg);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Extrae el mensaje legible de cualquier tipo de excepción.
  String _extractErrorMessage(Object e) {
    if (e is DioException) {
      final inner = e.error;
      if (inner is AppException) return inner.message;
      if (e.message != null && e.message!.isNotEmpty) return e.message!;
    }
    if (e is AppException) return e.message;
    return e.toString();
  }

  /// Detecta si el error indica que la reseña ya fue guardada previamente.
  bool _isAlreadySubmittedError(String msg) {
    final lower = msg.toLowerCase();
    return lower.contains('ya dejaste') ||
        lower.contains('ya existe') ||
        lower.contains('already') ||
        lower.contains('duplicate');
  }

  @override
  Widget build(BuildContext context) {
    final c           = context.colors;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: c.textMuted.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Reseñar a ${widget.providerName}',
              style: TextStyle(color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Tu opinión ayuda a otros usuarios a elegir mejor',
              style: TextStyle(color: c.textMuted, fontSize: 13),
            ),
            const SizedBox(height: 24),
            Text('Calificación *', style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            RatingBar.builder(
              initialRating: _rating.toDouble(),
              minRating: 1,
              allowHalfRating: false,
              itemCount: 5,
              itemSize: 40,
              itemBuilder: (_, _) => const Icon(Icons.star_rounded, color: AppColors.star),
              onRatingUpdate: (r) => setState(() => _rating = r.toInt()),
            ),
            const SizedBox(height: 20),
            Text('Foto de evidencia *', style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text('Sube una foto del trabajo realizado o del local', style: TextStyle(color: c.textMuted, fontSize: 12)),
            const SizedBox(height: 10),
            _buildPhotoSelector(c),
            const SizedBox(height: 20),
            Text('Comentario (opcional)', style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _commentController,
              style: TextStyle(color: c.textPrimary),
              maxLines: 3,
              maxLength: 500,
              decoration: InputDecoration(
                hintText: 'Describe tu experiencia...',
                hintStyle: TextStyle(color: c.textMuted),
                filled: true,
                fillColor: c.bgCard,
                counterStyle: TextStyle(color: c.textMuted, fontSize: 11),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildVerificationSelector(c),
            const SizedBox(height: 20),
            if (_errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.busy.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.busy.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.busy, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_errorMessage!, style: const TextStyle(color: AppColors.busy, fontSize: 13))),
                  ],
                ),
              ),
            SizedBox(
              width: double.infinity,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : ElevatedButton(
                      onPressed: _submitReview,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: const Text('Publicar Reseña', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoSelector(AppThemeColors c) {
    if (_selectedImage != null) {
      return Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.file(_selectedImage!, height: 160, width: double.infinity, fit: BoxFit.cover),
          ),
          Positioned(
            top: 8, right: 8,
            child: GestureDetector(
              onTap: () => setState(() => _selectedImage = null),
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.6), shape: BoxShape.circle),
                child: const Icon(Icons.close, color: Colors.white, size: 18),
              ),
            ),
          ),
        ],
      );
    }
    return Row(
      children: [
        Expanded(child: _PhotoOptionButton(icon: Icons.camera_alt_rounded,   label: 'Cámara',  bgCard: c.bgCard, onTap: () => _pickImage(ImageSource.camera))),
        const SizedBox(width: 12),
        Expanded(child: _PhotoOptionButton(icon: Icons.photo_library_rounded, label: 'Galería', bgCard: c.bgCard, onTap: () => _pickImage(ImageSource.gallery))),
      ],
    );
  }

  Widget _buildVerificationSelector(AppThemeColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Verificación anti-fraude *', style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text('Elige cómo verificar que usaste este servicio', style: TextStyle(color: c.textMuted, fontSize: 12)),
        const SizedBox(height: 12),
        _VerificationOption(
          icon: Icons.gps_fixed_rounded,
          title: 'Verificar con GPS',
          subtitle: 'Confirma que estuviste en el lugar',
          isSelected: _validationMethod == 1,
          onTap: () => setState(() => _validationMethod = 1),
        ),
        const SizedBox(height: 8),
        _VerificationOption(
          icon: Icons.qr_code_scanner_rounded,
          title: 'Código QR del proveedor',
          subtitle: 'El proveedor te da un código al terminar',
          isSelected: _validationMethod == 2,
          onTap: () => setState(() => _validationMethod = 2),
        ),
        if (_validationMethod == 2) ...[
          const SizedBox(height: 12),
          TextField(
            controller: _qrController,
            style: TextStyle(color: c.textPrimary),
            decoration: InputDecoration(
              hintText: 'Ingresa el código del proveedor',
              hintStyle: TextStyle(color: c.textMuted),
              prefixIcon: Icon(Icons.lock_outline, color: c.textMuted),
              filled: true,
              fillColor: c.bgCard,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
            ),
          ),
        ],
      ],
    );
  }
}

class _PhotoOptionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color bgCard;
  final VoidCallback onTap;
  const _PhotoOptionButton({required this.icon, required this.label, required this.bgCard, required this.onTap});

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
            Text(label, style: TextStyle(color: context.colors.textSecondary, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

class _VerificationOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;
  const _VerificationOption({required this.icon, required this.title, required this.subtitle, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withValues(alpha: 0.08) : c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isSelected ? AppColors.primary.withValues(alpha: 0.5) : c.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary.withValues(alpha: 0.15) : c.bgInput,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: isSelected ? AppColors.primary : c.textMuted, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: isSelected ? c.textPrimary : c.textSecondary, fontSize: 14, fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal)),
                  Text(subtitle, style: TextStyle(color: c.textMuted, fontSize: 12)),
                ],
              ),
            ),
            if (isSelected) const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20),
          ],
        ),
      ),
    );
  }
}
