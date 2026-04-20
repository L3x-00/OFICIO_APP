import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../data/trust_validation_repository.dart';

/// Formulario de validación de confianza — cámara obligatoria, sin galería.
/// [providerType] — 'OFICIO' | 'NEGOCIO'
class TrustValidationFormScreen extends StatefulWidget {
  final String providerType;
  const TrustValidationFormScreen({super.key, required this.providerType});

  @override
  State<TrustValidationFormScreen> createState() => _TrustValidationFormScreenState();
}

class _TrustValidationFormScreenState extends State<TrustValidationFormScreen> {
  final _repo   = TrustValidationRepository();
  final _picker = ImagePicker();

  // Text controllers
  final _dniNumberCtrl      = TextEditingController();
  final _dniFirstNameCtrl   = TextEditingController();
  final _dniLastNameCtrl    = TextEditingController();
  final _dniAddressCtrl     = TextEditingController();
  final _rucCtrl            = TextEditingController();
  final _bizAddressCtrl     = TextEditingController();

  // Photo files
  File? _dniPhotoFront;
  File? _dniPhotoBack;
  File? _selfieWithDni;
  File? _businessPhoto;
  File? _ownerDniPhoto;

  bool _isLoading = false;

  bool get _isNegocio => widget.providerType == 'NEGOCIO';

  @override
  void dispose() {
    _dniNumberCtrl.dispose();
    _dniFirstNameCtrl.dispose();
    _dniLastNameCtrl.dispose();
    _dniAddressCtrl.dispose();
    _rucCtrl.dispose();
    _bizAddressCtrl.dispose();
    super.dispose();
  }

  Future<void> _capturePhoto(String slot) async {
    final xfile = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
      maxWidth: 1200,
    );
    if (xfile == null) return;
    final file = File(xfile.path);
    setState(() {
      switch (slot) {
        case 'dniPhotoFront': _dniPhotoFront  = file; break;
        case 'dniPhotoBack':  _dniPhotoBack   = file; break;
        case 'selfieWithDni': _selfieWithDni  = file; break;
        case 'businessPhoto': _businessPhoto  = file; break;
        case 'ownerDniPhoto': _ownerDniPhoto  = file; break;
      }
    });
  }

  bool get _canSubmit {
    final textOk = _dniNumberCtrl.text.trim().length == 8 &&
        _dniFirstNameCtrl.text.trim().isNotEmpty &&
        _dniLastNameCtrl.text.trim().isNotEmpty &&
        _dniAddressCtrl.text.trim().isNotEmpty;
    if (!textOk) return false;
    if (_dniPhotoFront == null || _dniPhotoBack == null || _selfieWithDni == null) return false;
    if (_isNegocio) {
      if (_rucCtrl.text.trim().length < 11) return false;
      if (_bizAddressCtrl.text.trim().isEmpty) return false;
      if (_businessPhoto == null || _ownerDniPhoto == null) return false;
    }
    return true;
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _isLoading = true);

    final result = await _repo.submitRequest(
      providerType: widget.providerType,
      fields: {
        'dniNumber':      _dniNumberCtrl.text.trim(),
        'dniFirstName':   _dniFirstNameCtrl.text.trim(),
        'dniLastName':    _dniLastNameCtrl.text.trim(),
        'dniAddress':     _dniAddressCtrl.text.trim(),
        if (_isNegocio) 'rucNumber':      _rucCtrl.text.trim(),
        if (_isNegocio) 'businessAddress': _bizAddressCtrl.text.trim(),
      },
      photos: {
        'dniPhotoFront': _dniPhotoFront,
        'dniPhotoBack':  _dniPhotoBack,
        'selfieWithDni': _selfieWithDni,
        if (_isNegocio) 'businessPhoto': _businessPhoto,
        if (_isNegocio) 'ownerDniPhoto': _ownerDniPhoto,
      },
    );

    if (!mounted) return;
    setState(() => _isLoading = false);

    result.when(
      success: (_) => _showSuccessDialog(),
      failure: (e) => _showError(e.message),
    );
  }

  void _showSuccessDialog() {
    final c = context.colors;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(
                  color: AppColors.available.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.verified_rounded, color: AppColors.available, size: 38),
              ),
              const SizedBox(height: 20),
              Text(
                'Formulario enviado',
                style: TextStyle(color: c.textPrimary, fontSize: 20, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              Text(
                'Formulario rellenado correctamente.\nEspera mientras validamos tus datos.\nNuestro equipo revisará la información en las próximas horas.',
                style: TextStyle(color: c.textSecondary, fontSize: 14, height: 1.5),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    Navigator.of(context).popUntil((r) => r.isFirst);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Ir al inicio', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: const Color(0xFFEF4444)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final title = _isNegocio ? 'Validar mi Negocio' : 'Validar mi Perfil';

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        title: Text(title, style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: c.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Header informativo
          _InfoBanner(isNegocio: _isNegocio),
          const SizedBox(height: 24),

          // ── Sección: Datos del DNI ─────────────────────────
          _SectionHeader(title: 'Datos del DNI', icon: Icons.badge_rounded),
          const SizedBox(height: 14),
          _Field(ctrl: _dniNumberCtrl, label: 'Número de DNI', hint: '12345678',
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(8)],
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 12),
          _Field(ctrl: _dniFirstNameCtrl, label: 'Nombre (como aparece en el DNI)', hint: 'JUAN CARLOS'),
          const SizedBox(height: 12),
          _Field(ctrl: _dniLastNameCtrl, label: 'Apellidos (como aparece en el DNI)', hint: 'PÉREZ QUISPE'),
          const SizedBox(height: 12),
          _Field(ctrl: _dniAddressCtrl, label: 'Dirección registrada en el DNI', hint: 'Jr. Los Álamos 123, El Tambo', maxLines: 2),

          const SizedBox(height: 24),

          // ── Sección: Fotos del DNI ─────────────────────────
          _SectionHeader(title: 'Fotos del DNI (solo cámara)', icon: Icons.camera_alt_rounded),
          const SizedBox(height: 8),
          _CameraHint(),
          const SizedBox(height: 14),
          _PhotoCapture(
            label: 'Foto frontal del DNI',
            icon: Icons.credit_card_rounded,
            file: _dniPhotoFront,
            onCapture: () => _capturePhoto('dniPhotoFront'),
          ),
          const SizedBox(height: 12),
          _PhotoCapture(
            label: 'Foto posterior del DNI',
            icon: Icons.flip_rounded,
            file: _dniPhotoBack,
            onCapture: () => _capturePhoto('dniPhotoBack'),
          ),
          const SizedBox(height: 12),
          _PhotoCapture(
            label: 'Selfie sosteniendo el DNI',
            icon: Icons.face_rounded,
            file: _selfieWithDni,
            onCapture: () => _capturePhoto('selfieWithDni'),
          ),

          if (_isNegocio) ...[
            const SizedBox(height: 24),
            _SectionHeader(title: 'Datos del Negocio', icon: Icons.storefront_rounded),
            const SizedBox(height: 14),
            _Field(ctrl: _rucCtrl, label: 'RUC del negocio', hint: '20123456789',
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(11)],
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            _Field(ctrl: _bizAddressCtrl, label: 'Dirección física del establecimiento', hint: 'Av. Principal 456, Huancayo', maxLines: 2),
            const SizedBox(height: 24),
            _SectionHeader(title: 'Fotos del Negocio', icon: Icons.photo_camera_rounded),
            const SizedBox(height: 14),
            _PhotoCapture(
              label: 'Foto del frente del local',
              icon: Icons.store_rounded,
              file: _businessPhoto,
              onCapture: () => _capturePhoto('businessPhoto'),
            ),
            const SizedBox(height: 12),
            _PhotoCapture(
              label: 'DNI del titular del negocio',
              icon: Icons.badge_rounded,
              file: _ownerDniPhoto,
              onCapture: () => _capturePhoto('ownerDniPhoto'),
            ),
          ],

          const SizedBox(height: 32),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: (_canSubmit && !_isLoading) ? _submit : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                disabledBackgroundColor: c.bgCard,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: _isLoading
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Enviar solicitud de validación', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

// ── Widgets auxiliares ────────────────────────────────────

class _InfoBanner extends StatelessWidget {
  final bool isNegocio;
  const _InfoBanner({required this.isNegocio});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.shield_rounded, color: AppColors.primary, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('¿Por qué validamos tu identidad?',
                  style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 4),
                Text(
                  isNegocio
                    ? 'Verificamos que tu negocio sea real y confiable. Tus datos se comparan con la información de registro para garantizar la seguridad de nuestros clientes.'
                    : 'Verificamos tu identidad para garantizar que eres un profesional real. Tus datos del DNI se comparan con la información que registraste.',
                  style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  const _SectionHeader({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      children: [
        Icon(icon, color: AppColors.primary, size: 18),
        const SizedBox(width: 8),
        Text(title, style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
      ],
    );
  }
}

class _CameraHint extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      children: [
        Icon(Icons.info_outline_rounded, color: AppColors.amber, size: 14),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            'Las fotos deben tomarse en tiempo real con la cámara. No se permiten imágenes de galería.',
            style: TextStyle(color: c.textMuted, fontSize: 12),
          ),
        ),
      ],
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final String hint;
  final int maxLines;
  final TextInputType keyboardType;
  final List<TextInputFormatter>? inputFormatters;

  const _Field({
    required this.ctrl,
    required this.label,
    required this.hint,
    this.maxLines = 1,
    this.keyboardType = TextInputType.text,
    this.inputFormatters,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 6),
        TextField(
          controller: ctrl,
          maxLines: maxLines,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          style: TextStyle(color: c.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: c.textMuted, fontSize: 14),
            filled: true,
            fillColor: c.bgInput,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: c.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: c.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
        ),
      ],
    );
  }
}

class _PhotoCapture extends StatelessWidget {
  final String label;
  final IconData icon;
  final File? file;
  final VoidCallback onCapture;

  const _PhotoCapture({
    required this.label,
    required this.icon,
    required this.file,
    required this.onCapture,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final captured = file != null;
    return GestureDetector(
      onTap: onCapture,
      child: Container(
        height: captured ? 160 : 90,
        decoration: BoxDecoration(
          color: captured ? Colors.transparent : c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: captured
              ? const Color(0xFF10B981).withValues(alpha: 0.5)
              : c.border,
            width: captured ? 1.5 : 1,
          ),
        ),
        child: captured
          ? Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(13),
                  child: Image.file(file!, fit: BoxFit.cover, width: double.infinity, height: double.infinity),
                ),
                Positioned(
                  top: 8, right: 8,
                  child: GestureDetector(
                    onTap: onCapture,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 16),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 8, left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_rounded, color: Colors.white, size: 12),
                        const SizedBox(width: 4),
                        Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
              ],
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: c.textMuted, size: 22),
                const SizedBox(width: 12),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.camera_alt_rounded, size: 12, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Text('Tomar foto', style: TextStyle(color: AppColors.primary, fontSize: 12)),
                      ],
                    ),
                  ],
                ),
              ],
            ),
      ),
    );
  }
}
