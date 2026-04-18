import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/errors/app_exception.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/utils/permission_service.dart';
import '../../data/reviews_repository.dart';
import '../../domain/models/review_model.dart';

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
        providerId:            providerId,
        providerName:          providerName,
        userId:                userId,
        existingReview:        existingReview,
        initiallyRecommended:  initiallyRecommended,
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

  int      _rating           = 0;
  File?    _selectedImage;       // nueva foto elegida (local)
  bool     _keepExistingPhoto = true; // solo aplica en edit mode
  bool     _isLoading        = false;
  String?  _errorMessage;
  int      _validationMethod = 0; // 0=ninguno, 1=GPS, 2=QR

  // GPS
  Position? _gpsPosition;
  bool      _gpsLoading = false;

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
    _qrController.dispose();
    super.dispose();
  }

  // ─── Permisos + picker ──────────────────────────────────

  Future<void> _pickImage(ImageSource source) async {
    if (source == ImageSource.camera) {
      final ok = await PermissionService.requestCamera(context);
      if (!ok) return;
    } else {
      final ok = await PermissionService.requestGallery(context);
      if (!ok) return;
    }
    if (!context.mounted) return;
    final picked = await ImagePicker().pickImage(
      source: source, maxWidth: 1200, maxHeight: 1200, imageQuality: 80,
    );
    if (picked != null && mounted) {
      setState(() {
        _selectedImage     = File(picked.path);
        _keepExistingPhoto = false;
        _errorMessage      = null;
      });
    }
  }

  Future<void> _fetchGpsLocation() async {
    setState(() { _gpsLoading = true; _errorMessage = null; });
    final position = await PermissionService.getCurrentLocation(context);
    if (!mounted) return;
    setState(() {
      _gpsPosition     = position;
      _validationMethod = position != null ? 1 : _validationMethod;
      _gpsLoading      = false;
    });
  }

  // ─── Submit ─────────────────────────────────────────────

  Future<void> _submitReview() async {
    if (_rating == 0) {
      setState(() => _errorMessage = 'Por favor selecciona una calificación');
      return;
    }

    // En create mode: foto y verificación son obligatorias
    if (!_isEditMode) {
      if (_selectedImage == null) {
        setState(() => _errorMessage = 'La foto es obligatoria como evidencia');
        return;
      }
      if (_validationMethod == 0) {
        setState(() => _errorMessage = 'Elige un método de verificación (GPS o QR)');
        return;
      }
      if (_validationMethod == 1 && _gpsPosition == null) {
        setState(() => _errorMessage = 'Primero obtén tu ubicación GPS');
        return;
      }
      if (_validationMethod == 2 && _qrController.text.trim().isEmpty) {
        setState(() => _errorMessage = 'Ingresa el código QR del proveedor');
        return;
      }
    } else {
      // En edit mode: si no hay foto nueva ni existente, error
      if (_selectedImage == null && !_keepExistingPhoto) {
        setState(() => _errorMessage = 'La foto es obligatoria');
        return;
      }
    }

    setState(() { _isLoading = true; _errorMessage = null; });
    try {
      // Determinar URL de foto final
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
          userId:   widget.userId,
          rating:   _rating,
          photoUrl: photoUrl,
          comment:  _commentController.text.trim().isNotEmpty
              ? _commentController.text.trim()
              : null,
        );
      } else {
        // ── CREAR ──────────────────────────────────────────
        await _repo.createReview(
          providerId: widget.providerId,
          userId:     widget.userId,
          rating:     _rating,
          photoUrl:   photoUrl,
          comment:    _commentController.text.trim().isNotEmpty
              ? _commentController.text.trim()
              : null,
          qrCode:  _validationMethod == 2 ? _qrController.text.trim() : null,
          userLat: _gpsPosition?.latitude,
          userLng: _gpsPosition?.longitude,
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
            // Handle
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

            // Título
            Text(
              _isEditMode
                  ? 'Editar tu reseña'
                  : 'Reseñar a ${widget.providerName}',
              style: TextStyle(color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
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
            Text('Calificación *',
                style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
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

            // ── Foto ──────────────────────────────────────
            Text('Foto de evidencia *',
                style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text('Sube una foto del trabajo realizado o del local',
                style: TextStyle(color: c.textMuted, fontSize: 12)),
            const SizedBox(height: 10),
            _buildPhotoSelector(c),
            const SizedBox(height: 20),

            // ── Comentario ────────────────────────────────
            Text('Comentario (opcional)',
                style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
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

            // ── Verificación (solo create mode) ───────────
            if (!_isEditMode) ...[
              _buildVerificationSelector(c),
              const SizedBox(height: 16),
            ] else ...[
              // En edit mode, mostrar aviso de verificación ya hecha
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.available.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.available.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.verified_rounded, color: AppColors.available, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Tu reseña original ya fue verificada.',
                        style: TextStyle(color: AppColors.available, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

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
                  border: Border.all(color: AppColors.busy.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.busy, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                        child: Text(_errorMessage!,
                            style: const TextStyle(color: AppColors.busy, fontSize: 13))),
                  ],
                ),
              ),

            // ── Botón enviar ──────────────────────────────
            SizedBox(
              width: double.infinity,
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.primary))
                  : ElevatedButton(
                      onPressed: _submitReview,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text(
                        _isEditMode ? 'Guardar cambios' : 'Publicar Reseña',
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Selector de foto ────────────────────────────────────

  Widget _buildPhotoSelector(AppThemeColors c) {
    // Prioridad: nueva foto local > foto existente en red > picker vacío
    if (_selectedImage != null) {
      return Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.file(_selectedImage!,
                height: 160, width: double.infinity, fit: BoxFit.cover),
          ),
          Positioned(
            top: 8, right: 8,
            child: GestureDetector(
              onTap: () => setState(() {
                _selectedImage     = null;
                _keepExistingPhoto = _isEditMode; // en edit, vuelve a la original
              }),
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

    if (_isEditMode && _keepExistingPhoto && widget.existingReview!.photoUrl.isNotEmpty) {
      return Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.network(
              widget.existingReview!.photoUrl,
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
              onTap: () => _showPhotoSourcePicker(),
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
            onTap: () => _pickImage(ImageSource.camera),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _PhotoOptionButton(
            icon: Icons.photo_library_rounded,
            label: 'Galería',
            bgCard: c.bgCard,
            onTap: () => _pickImage(ImageSource.gallery),
          ),
        ),
      ],
    );
  }

  Future<void> _showPhotoSourcePicker() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded),
              title: const Text('Cámara'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: const Text('Galería'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source != null && mounted) await _pickImage(source);
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
                      fontWeight: _isRecommended ? FontWeight.w600 : FontWeight.normal,
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
                  ? const Icon(Icons.check_circle_rounded,
                      color: AppColors.primary, size: 20, key: ValueKey(true))
                  : Icon(Icons.radio_button_unchecked,
                      color: c.textMuted, size: 20, key: ValueKey(false)),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Selector de verificación (solo create mode) ─────────

  Widget _buildVerificationSelector(AppThemeColors c) {
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
          subtitle: _gpsPosition != null
              ? 'Ubicación obtenida ✓'
              : 'Confirma que estuviste en el lugar',
          isSelected: _validationMethod == 1,
          onTap: () {
            setState(() => _validationMethod = 1);
            if (_gpsPosition == null) _fetchGpsLocation();
          },
        ),

        if (_validationMethod == 1) ...[
          const SizedBox(height: 10),
          if (_gpsLoading)
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
          else if (_gpsPosition != null)
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
                          'Lat: ${_gpsPosition!.latitude.toStringAsFixed(5)}  Lng: ${_gpsPosition!.longitude.toStringAsFixed(5)}',
                          style: TextStyle(color: c.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: _fetchGpsLocation,
                    child:
                        Icon(Icons.refresh_rounded, color: c.textMuted, size: 18),
                  ),
                ],
              ),
            )
          else
            GestureDetector(
              onTap: _fetchGpsLocation,
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
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none),
            ),
          ),
        ],
      ],
    );
  }

  // ─── devuelve el estado de recomendación al padre ─────────
  /// Llama a esto en el pop para que el padre sepa si cambió la rec.
  bool get recommendationChanged =>
      _isEditMode && _isRecommended != widget.initiallyRecommended;
  bool get currentRecommendation => _isRecommended;
}

// ─────────────────────────────────────────────────────────

class _PhotoOptionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color bgCard;
  final VoidCallback onTap;
  const _PhotoOptionButton(
      {required this.icon,
      required this.label,
      required this.bgCard,
      required this.onTap});

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
