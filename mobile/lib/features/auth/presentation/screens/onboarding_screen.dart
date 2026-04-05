import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

/// Se muestra la primera vez que el usuario se registra
/// para elegir qué tipo de perfil quiere crear
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  String? _selectedRole; // 'USUARIO', 'OFICIO', 'NEGOCIO'

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),

              // Título
              Text(
                '¿Cómo te ayudamos\nhoy?',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Cuéntanos quién eres para personalizar tu experiencia',
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 36),

              // Opciones
              _RoleOption(
                icon: Icons.search_rounded,
                title: 'Soy cliente',
                subtitle: 'Busco, comparo y contrato profesionales o negocios en mi zona.',
                roleValue: 'USUARIO',
                isSelected: _selectedRole == 'USUARIO',
                onTap: () => setState(() => _selectedRole = 'USUARIO'),
              ),
              const SizedBox(height: 14),
              _RoleOption(
                icon: Icons.handyman_rounded,
                title: 'Soy profesional',
                subtitle: 'Ofrezco mis servicios como independiente y quiero conseguir más clientes.',
                roleValue: 'OFICIO',
                isSelected: _selectedRole == 'OFICIO',
                onTap: () => _goToProviderForm('OFICIO'),
              ),
              const SizedBox(height: 14),
              _RoleOption(
                icon: Icons.storefront_rounded,
                title: 'Tengo un negocio',
                subtitle: 'Promociono mi establecimiento y llego a más personas en mi ciudad.',
                roleValue: 'NEGOCIO',
                isSelected: _selectedRole == 'NEGOCIO',
                onTap: () => _goToProviderForm('NEGOCIO'),
              ),

              const Spacer(),

              // Botón continuar
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _selectedRole == null ? null : _continue,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    disabledBackgroundColor: c.bgCard,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    _selectedRole == null ? 'Elige una opción' : 'Continuar',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _continue() {
    // Solo llega aquí para el rol 'USUARIO'
    context.read<AuthProvider>().completeOnboarding(role: _selectedRole!);
    // _AppRoot detectará needsOnboarding = false y mostrará _MainNavigation
  }

  /// Navega directamente al formulario de proveedor sin pasar por "Continuar"
  void _goToProviderForm(String type) {
    setState(() => _selectedRole = type);
    // push (no pushReplacement) para que _AppRoot quede en el stack
    // y al completar el onboarding podamos volver al home con pop()
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProviderOnboardingForm(providerType: type),
      ),
    );
  }
}

// ─── Opción de rol ─────────────────────────────────────────

class _RoleOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String roleValue;
  final bool isSelected;
  final VoidCallback onTap;

  const _RoleOption({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.roleValue,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withOpacity(0.1)
              : c.bgCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected
                ? AppColors.primary.withOpacity(0.6)
                : c.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withOpacity(0.2)
                    : c.bgInput,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: isSelected ? AppColors.primary : c.textMuted,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isSelected
                          ? c.textPrimary
                          : c.textSecondary,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: c.textMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(
                Icons.check_circle_rounded,
                color: AppColors.primary,
                size: 22,
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Formulario de perfil de proveedor ────────────────────

/// [providerType] — 'OFICIO' | 'NEGOCIO'
/// [isStandalone] — true cuando el usuario ya está autenticado (viene del modal
///                  "Quiero ser parte" o de agregar un segundo perfil).
class ProviderOnboardingForm extends StatefulWidget {
  final String? providerType;
  final bool isStandalone;

  const ProviderOnboardingForm({
    super.key,
    this.providerType,
    this.isStandalone = false,
  });

  @override
  State<ProviderOnboardingForm> createState() => _ProviderOnboardingFormState();
}

class _ProviderOnboardingFormState extends State<ProviderOnboardingForm> {
  final _businessNameController = TextEditingController();
  final _dniController          = TextEditingController();
  final _phoneController        = TextEditingController();
  final _descriptionController  = TextEditingController();
  final _addressController      = TextEditingController();

  final List<XFile> _photos = [];
  final _picker = ImagePicker();
  bool _isLoading = false;

  static const _maxPhotos = 4;
  static const _maxMB     = 5;

  @override
  void dispose() {
    _businessNameController.dispose();
    _dniController.dispose();
    _phoneController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  bool get _isOficio => widget.providerType == 'OFICIO';

  String get _formTitle => _isOficio
      ? 'Perfil de Profesional'
      : widget.providerType == 'NEGOCIO'
          ? 'Perfil de Negocio'
          : 'Configura tu perfil';

  String get _formSubtitle => _isOficio
      ? 'Completa los datos de tu servicio independiente'
      : widget.providerType == 'NEGOCIO'
          ? 'Completa los datos de tu establecimiento'
          : 'Esta información aparecerá en tu tarjeta de servicio';

  // ─── Picker de fotos ─────────────────────────────────────

  Future<void> _pickPhoto() async {
    if (_photos.length >= _maxPhotos) return;

    final file = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (file == null || !mounted) return;

    // Validar formato por extensión del nombre original
    final ext = file.name.split('.').last.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].contains(ext)) {
      _showSnack('Formato no válido. Usa JPG, PNG o WEBP.', isError: true);
      return;
    }

    // Validar tamaño (máx _maxMB MB)
    final bytes = await file.readAsBytes();
    if (!mounted) return;
    if (bytes.length > _maxMB * 1024 * 1024) {
      _showSnack('La imagen supera $_maxMB MB. Elige una más pequeña.', isError: true);
      return;
    }

    setState(() => _photos.add(file));
  }

  void _removePhoto(int index) => setState(() => _photos.removeAt(index));

  void _reorderPhotos(int from, int to) {
    if (from == to) return;
    setState(() {
      final photo = _photos.removeAt(from);
      _photos.insert(to, photo);
    });
  }

  void _showSnack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? AppColors.busy : AppColors.available,
      ),
    );
  }

  // ─── Submit ──────────────────────────────────────────────

  Future<void> _submit() async {
    final name  = _businessNameController.text.trim();
    final phone = _phoneController.text.trim();
    final dni   = _dniController.text.trim();

    if (name.isEmpty || phone.isEmpty) {
      _showSnack('El nombre y el teléfono son obligatorios.', isError: true);
      return;
    }
    if (dni.isNotEmpty && !RegExp(r'^\d{8}$').hasMatch(dni)) {
      _showSnack('El DNI debe tener exactamente 8 dígitos.', isError: true);
      return;
    }

    setState(() => _isLoading = true);

    final auth   = context.read<AuthProvider>();
    final result = await auth.registerProvider(
      businessName: name,
      phone:        phone,
      type:         widget.providerType ?? 'OFICIO',
      dni:          dni.isNotEmpty ? dni : null,
      description:  _descriptionController.text.trim(),
      address:      _addressController.text.trim(),
    );

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (!result) {
      _showSnack(auth.error ?? 'Error al crear el perfil', isError: true);
      return;
    }

    _showSuccessDialog();
  }

  void _showSuccessDialog() {
    final c = context.colors;
    final auth = context.read<AuthProvider>();

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
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: AppColors.available.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.available,
                  size: 44,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                '¡Perfil Profesional Creado!',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Tu información está siendo revisada. Te notificaremos cuando esté aprobado.',
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 14,
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop(); // cerrar diálogo
                    // Completar onboarding → _AppRoot rebuild → _MainNavigation
                    auth.completeOnboarding(role: widget.providerType ?? 'OFICIO');
                    // Pop el formulario (standalone o no) para revelar _AppRoot
                    Navigator.of(context).popUntil((route) => route.isFirst);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Ir al inicio',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Build principal ─────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        leading: widget.isStandalone
            ? IconButton(
                icon: Icon(Icons.close, color: c.textSecondary),
                onPressed: () => Navigator.of(context).pop(),
              )
            : null,
        title: Text(
          _formTitle,
          style: TextStyle(color: c.textPrimary),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Badge de tipo
            if (widget.providerType != null) ...[
              _TypeBadge(isOficio: _isOficio),
              const SizedBox(height: 14),
            ],

            Text(
              'Cuéntanos sobre tu servicio',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _formSubtitle,
              style: TextStyle(
                  color: c.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 24),

            // ── Sección: Información básica ──────────────
            _FormSectionHeader(label: 'INFORMACIÓN BÁSICA'),
            const SizedBox(height: 12),

            _buildField(
              controller: _businessNameController,
              label: _isOficio
                  ? 'Nombre del profesional *'
                  : 'Nombre del negocio *',
              hint: _isOficio
                  ? 'Ej: Juan Electricista'
                  : 'Ej: Restaurante El Sabor',
              icon: _isOficio
                  ? Icons.handyman_outlined
                  : Icons.storefront_outlined,
            ),
            const SizedBox(height: 14),

            _buildField(
              controller: _dniController,
              label: 'DNI del titular',
              hint: '12345678',
              icon: Icons.badge_outlined,
              keyboardType: TextInputType.number,
              maxLength: 8,
            ),
            const SizedBox(height: 14),

            _buildField(
              controller: _phoneController,
              label: 'Teléfono de contacto *',
              hint: '+51 987 654 321',
              icon: Icons.phone_outlined,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 14),

            _buildField(
              controller: _addressController,
              label: 'Dirección (opcional)',
              hint: 'Jr. Ejemplo 123, Ciudad',
              icon: Icons.location_on_outlined,
            ),
            const SizedBox(height: 24),

            // ── Sección: Descripción ──────────────────────
            _FormSectionHeader(label: 'DESCRIPCIÓN'),
            const SizedBox(height: 12),

            _buildField(
              controller: _descriptionController,
              label: _isOficio
                  ? 'Describe tu servicio'
                  : 'Describe tu negocio',
              hint: _isOficio
                  ? 'Experiencia, especialidades, horario de trabajo...'
                  : 'Qué ofreces, horarios, especialidades...',
              icon: Icons.description_outlined,
              maxLines: 4,
            ),
            const SizedBox(height: 24),

            // ── Sección: Fotos ────────────────────────────
            _FormSectionHeader(label: 'FOTOS DEL SERVICIO'),
            const SizedBox(height: 12),
            _buildPhotoSection(),
            const SizedBox(height: 32),

            // ── Botón enviar ──────────────────────────────
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: c.bgCard,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'Crear mi perfil de proveedor',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: TextButton(
                onPressed: () {
                  if (widget.isStandalone) {
                    Navigator.of(context).pop();
                  } else {
                    context
                        .read<AuthProvider>()
                        .completeOnboarding(role: 'USUARIO');
                  }
                },
                child: Text(
                  'Completar después',
                  style: TextStyle(color: c.textMuted),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Sección de fotos ─────────────────────────────────────

  Widget _buildPhotoSection() {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Tip de conversión
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.07),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primary.withOpacity(0.2)),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.lightbulb_rounded,
                  color: AppColors.primary, size: 18),
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

        // Grid de 4 slots
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: List.generate(_maxPhotos, (i) {
              if (i < _photos.length) return _buildFilledSlot(i);
              return _buildEmptySlot(i);
            }),
          ),
        ),
        const SizedBox(height: 8),

        Text(
          'Formatos: JPG, PNG, WEBP  •  Máx. 5 MB por foto',
          style: TextStyle(color: c.textMuted, fontSize: 11),
        ),
        if (_photos.isNotEmpty) ...[
          const SizedBox(height: 3),
          Text(
            'Mantén presionado y arrastra para reordenar  •  La primera foto es la portada',
            style: TextStyle(color: c.textMuted, fontSize: 11),
          ),
        ],
      ],
    );
  }

  /// Slot con imagen seleccionada: draggable + delete + cover badge
  Widget _buildFilledSlot(int index) {
    final c = context.colors;
    return DragTarget<int>(
      onWillAcceptWithDetails: (d) => d.data != index,
      onAcceptWithDetails:     (d) => _reorderPhotos(d.data, index),
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
                  File(_photos[index].path),
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
                color: AppColors.primary.withOpacity(0.4),
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
                // Imagen
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.file(
                    File(_photos[index].path),
                    width: 100,
                    height: 100,
                    fit: BoxFit.cover,
                  ),
                ),
                // Overlay de drop
                if (isHovered)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.25),
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                // Botón eliminar
                Positioned(
                  top: 4,
                  right: 4,
                  child: GestureDetector(
                    onTap: () => _removePhoto(index),
                    child: Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.65),
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
                // Icono de arrastrar
                Positioned(
                  bottom: 4,
                  left: 4,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.55),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: const Icon(
                      Icons.drag_indicator_rounded,
                      color: Colors.white,
                      size: 13,
                    ),
                  ),
                ),
                // Badge "Portada" en la primera foto
                if (index == 0)
                  Positioned(
                    bottom: 4,
                    right: 4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.amber.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: const Text(
                        'Portada',
                        style: TextStyle(
                          color: Colors.white,
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

  /// Slot vacío: solo el siguiente disponible es tappable
  Widget _buildEmptySlot(int index) {
    final c = context.colors;
    final isNext = index == _photos.length;
    return GestureDetector(
      onTap: isNext ? _pickPhoto : null,
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
                ? AppColors.primary.withOpacity(0.35)
                : c.border,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isNext
                  ? Icons.add_photo_alternate_rounded
                  : Icons.photo_outlined,
              color: isNext
                  ? AppColors.primary.withOpacity(0.6)
                  : c.textMuted.withOpacity(0.25),
              size: 28,
            ),
            const SizedBox(height: 4),
            Text(
              'Foto ${index + 1}',
              style: TextStyle(
                color: isNext
                    ? AppColors.primary.withOpacity(0.6)
                    : c.textMuted.withOpacity(0.25),
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Constructor de campos de texto ──────────────────────

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    int maxLines = 1,
    int? maxLength,
  }) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: c.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          maxLength: maxLength,
          style: TextStyle(color: c.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
                color: c.textMuted, fontSize: 13),
            prefixIcon: maxLines == 1
                ? Icon(icon, color: c.textMuted, size: 20)
                : null,
            counterText: '',
            filled: true,
            fillColor: c.bgCard,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(
                  color: AppColors.primary, width: 1.5),
            ),
            contentPadding: EdgeInsets.all(maxLines > 1 ? 16 : 14),
          ),
        ),
      ],
    );
  }
}

// ─── Widgets auxiliares del formulario ─────────────────────

class _FormSectionHeader extends StatelessWidget {
  final String label;
  const _FormSectionHeader({required this.label});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Text(
      label,
      style: TextStyle(
        color: c.textMuted,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _TypeBadge extends StatelessWidget {
  final bool isOficio;
  const _TypeBadge({required this.isOficio});

  @override
  Widget build(BuildContext context) {
    final color =
        isOficio ? AppColors.primary : const Color(0xFF8E2DE2);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isOficio ? Icons.handyman_rounded : Icons.storefront_rounded,
            size: 14,
            color: color,
          ),
          const SizedBox(width: 6),
          Text(
            isOficio ? 'Profesional Independiente' : 'Negocio',
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
