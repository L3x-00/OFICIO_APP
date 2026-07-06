import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/errors/app_exception.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/utils/permission_service.dart';
import '../../data/reviews_repository.dart';
import '../../domain/models/review_model.dart';
import 'photo_evidence_picker.dart';
import 'photo_source_sheet.dart';

/// Bottom sheet para crear o editar una reseña.
/// - [existingReview] null → modo creación; no null → modo edición.
/// - [initiallyRecommended] estado actual de recomendación del usuario.
class CreateReviewSheet extends StatefulWidget {
  final int providerId;
  final String providerName;
  final int userId;
  final ReviewModel? existingReview;
  final bool initiallyRecommended;

  const CreateReviewSheet({
    super.key,
    required this.providerId,
    required this.providerName,
    required this.userId,
    this.existingReview,
    this.initiallyRecommended = false,
  });

  static Future<bool?> show(
    BuildContext context, {
    required int providerId,
    required String providerName,
    int userId = 1,
    ReviewModel? existingReview,
    bool initiallyRecommended = false,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CreateReviewSheet(
        providerId: providerId,
        providerName: providerName,
        userId: userId,
        existingReview: existingReview,
        initiallyRecommended: initiallyRecommended,
      ),
    );
  }

  @override
  State<CreateReviewSheet> createState() => _CreateReviewSheetState();
}

class _CreateReviewSheetState extends State<CreateReviewSheet> {
  final _repo = ReviewsRepository();
  final _commentController = TextEditingController();

  int _rating = 0;
  File? _selectedImage; // nueva foto elegida (local)
  bool _keepExistingPhoto = true; // solo aplica en edit mode
  bool _isLoading = false;
  String? _errorMessage;

  // Recomendación (solo edit mode)
  late bool _isRecommended;

  bool get _isEditMode => widget.existingReview != null;

  @override
  void initState() {
    super.initState();
    _isRecommended = widget.initiallyRecommended;
    if (_isEditMode) {
      // Pre-rellenar con datos existentes
      _rating = widget.existingReview!.rating;
      _commentController.text = widget.existingReview!.comment ?? '';
      // En edit mode la foto puede ser la original (red) o una nueva (local)
      _keepExistingPhoto = widget.existingReview!.photoUrl.isNotEmpty;
    }
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  // ─── Permisos + picker ──────────────────────────────────

  Future<void> _pickImage(ImageSource source) async {
    // Solo CÁMARA requiere permiso explícito (CAMERA runtime perm).
    // GALERÍA: en Android 13+ image_picker usa Photo Picker (sin permiso);
    // en iOS image_picker pide PHPhotoLibraryUsageDescription internamente.
    // El requestGallery anterior usaba Permission.photos que en Android
    // <13 SIEMPRE retorna denied → el picker nunca abría.
    if (source == ImageSource.camera) {
      final ok = await PermissionService.requestCamera(context);
      if (!ok) return;
    }
    if (!context.mounted) return;
    final picked = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1200,
      maxHeight: 1200,
      imageQuality: 80,
    );
    if (picked != null && mounted) {
      setState(() {
        _selectedImage = File(picked.path);
        _keepExistingPhoto = false;
        _errorMessage = null;
      });
    }
  }

  Future<void> _onShowSourcePicker() async {
    final source = await PhotoSourceSheet.show(context);
    if (source != null && mounted) await _pickImage(source);
  }

  // ─── Submit ─────────────────────────────────────────────

  /// Validación síncrona. Devuelve `null` si pasa; si no, el mensaje
  /// de error listo para mostrar en `_errorMessage`.
  String? _validateReview() {
    if (_rating == 0) {
      return 'Por favor selecciona una calificación';
    }
    if (!_isEditMode) {
      // En create mode la foto de evidencia es obligatoria. La validación
      // de interacción (subasta/contacto/chat) la hace el backend.
      if (_selectedImage == null) {
        return 'La foto es obligatoria como evidencia';
      }
    } else {
      // En edit mode: si no hay foto nueva ni existente, error.
      if (_selectedImage == null && !_keepExistingPhoto) {
        return 'La foto es obligatoria';
      }
    }
    return null;
  }

  /// Subida real al backend. Asume que la validación ya pasó. Maneja
  /// el `_isLoading`, sube la foto si corresponde, llama a create o
  /// update según el modo y gestiona el error "ya existe" como éxito
  /// silencioso (cierra con `true`).
  Future<void> _performSubmit() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      // Determinar URL de foto final.
      String photoUrl;
      if (_selectedImage != null) {
        photoUrl = await _repo.uploadPhoto(_selectedImage!);
      } else if (_isEditMode && _keepExistingPhoto) {
        photoUrl = widget.existingReview!.photoUrl;
      } else {
        photoUrl = '';
      }

      if (_isEditMode) {
        // ── EDITAR ─────────────────────────────────────────
        await _repo.updateReview(
          reviewId: widget.existingReview!.id,
          userId: widget.userId,
          rating: _rating,
          photoUrl: photoUrl,
          comment: _commentController.text.trim().isNotEmpty
              ? _commentController.text.trim()
              : null,
        );
      } else {
        // ── CREAR ──────────────────────────────────────────
        await _repo.createReview(
          providerId: widget.providerId,
          userId: widget.userId,
          rating: _rating,
          photoUrl: photoUrl,
          comment: _commentController.text.trim().isNotEmpty
              ? _commentController.text.trim()
              : null,
        );
      }

      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      final msg = _extractErrorMessage(e);
      if (!_isEditMode && _isAlreadySubmittedError(msg)) {
        if (mounted) Navigator.of(context).pop(true);
        return;
      }
      if (mounted) setState(() => _errorMessage = msg);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _submitReview() async {
    final error = _validateReview();
    if (error != null) {
      setState(() => _errorMessage = error);
      return;
    }
    await _performSubmit();
  }

  String _extractErrorMessage(Object e) {
    if (e is DioException) {
      final inner = e.error;
      if (inner is AppException) return inner.message;
      if (e.message != null && e.message!.isNotEmpty) return e.message!;
    }
    if (e is AppException) return e.message;
    return e.toString();
  }

  bool _isAlreadySubmittedError(String msg) {
    final lower = msg.toLowerCase();
    return lower.contains('ya dejaste') ||
        lower.contains('ya existe') ||
        lower.contains('already') ||
        lower.contains('duplicate');
  }

  // ─── Build ──────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
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
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: c.textMuted.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Título
            Text(
              _isEditMode
                  ? 'Editar tu reseña'
                  : 'Reseñar a ${widget.providerName}',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _isEditMode
                  ? 'Actualiza tu calificación, foto o comentario'
                  : 'Tu opinión ayuda a otros usuarios a elegir mejor',
              style: TextStyle(color: c.textMuted, fontSize: 13),
            ),
            const SizedBox(height: 24),

            // ── Calificación ───────────────────────────────
            Text(
              'Calificación *',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            RatingBar.builder(
              initialRating: _rating.toDouble(),
              minRating: 1,
              allowHalfRating: false,
              itemCount: 5,
              itemSize: 40,
              itemBuilder: (_, _) =>
                  const Icon(Icons.star_rounded, color: AppColors.star),
              onRatingUpdate: (r) => setState(() => _rating = r.toInt()),
            ),
            const SizedBox(height: 20),

            // ── Foto ──────────────────────────────────────
            Text(
              'Foto de evidencia *',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Sube una foto del trabajo realizado o del local',
              style: TextStyle(color: c.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 10),
            PhotoEvidencePicker(
              selectedImage: _selectedImage,
              existingPhotoUrl: _isEditMode
                  ? widget.existingReview!.photoUrl
                  : null,
              isEditMode: _isEditMode,
              keepExistingPhoto: _keepExistingPhoto,
              onPickImage: _pickImage,
              onRemovePhoto: () => setState(() {
                _selectedImage = null;
                _keepExistingPhoto =
                    _isEditMode; // en edit, vuelve a la original
              }),
              onShowSourcePicker: _onShowSourcePicker,
              colors: c,
            ),
            const SizedBox(height: 20),

            // ── Comentario ────────────────────────────────
            Text(
              'Comentario (opcional)',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
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

            // ── Toggle recomendación (solo edit mode) ─────
            if (_isEditMode) ...[
              _buildRecommendToggle(c),
              const SizedBox(height: 20),
            ],

            // ── Error ─────────────────────────────────────
            if (_errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.busy.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: AppColors.busy.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.error_outline,
                      color: AppColors.tintOn(AppColors.busy, c.isDark),
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(
                          color: AppColors.tintOn(AppColors.busy, c.isDark),
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // ── Botón enviar ──────────────────────────────
            SizedBox(
              width: double.infinity,
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primary,
                      ),
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
                      child: Text(
                        _isEditMode ? 'Guardar cambios' : 'Publicar Reseña',
                        style: const TextStyle(
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

  // ─── Toggle recomendación ────────────────────────────────

  Widget _buildRecommendToggle(AppThemeColors c) {
    return GestureDetector(
      onTap: () => setState(() => _isRecommended = !_isRecommended),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _isRecommended
              ? AppColors.primary.withValues(alpha: 0.08)
              : c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: _isRecommended
                ? AppColors.primary.withValues(alpha: 0.4)
                : c.border,
          ),
        ),
        child: Row(
          children: [
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: Icon(
                _isRecommended
                    ? Icons.thumb_up_rounded
                    : Icons.thumb_up_outlined,
                color: _isRecommended ? AppColors.primary : c.textMuted,
                size: 22,
                key: ValueKey(_isRecommended),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '¿Recomiendas este servicio?',
                    style: TextStyle(
                      color: _isRecommended ? c.textPrimary : c.textSecondary,
                      fontSize: 14,
                      fontWeight: _isRecommended
                          ? FontWeight.w600
                          : FontWeight.normal,
                    ),
                  ),
                  Text(
                    _isRecommended
                        ? 'Sí, lo recomiendo'
                        : 'Toca para recomendar',
                    style: TextStyle(color: c.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: _isRecommended
                  ? const Icon(
                      Icons.check_circle_rounded,
                      color: AppColors.primary,
                      size: 20,
                      key: ValueKey(true),
                    )
                  : Icon(
                      Icons.radio_button_unchecked,
                      color: c.textMuted,
                      size: 20,
                      key: ValueKey(false),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── devuelve el estado de recomendación al padre ─────────
  /// Llama a esto en el pop para que el padre sepa si cambió la rec.
  bool get recommendationChanged =>
      _isEditMode && _isRecommended != widget.initiallyRecommended;
  bool get currentRecommendation => _isRecommended;
}
