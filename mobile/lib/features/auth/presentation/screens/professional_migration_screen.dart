import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../providers_list/data/providers_repository.dart';
import '../providers/auth_provider.dart';
import 'onboarding/widgets/onboarding_category_section.dart';

/// Formulario de migración OFICIO → PROFESIONAL.
///
/// El `Provider.id` se conserva — NO crea un perfil nuevo. Solo se piden
/// los datos NUEVOS (especialidad, formación, categorías profesionales);
/// nombre, teléfono y fotos ya existen y no cambian con la migración.
/// Un admin revisa la solicitud; mientras tanto el perfil sigue visible
/// como Oficio.
class ProfessionalMigrationScreen extends StatefulWidget {
  const ProfessionalMigrationScreen({super.key});

  @override
  State<ProfessionalMigrationScreen> createState() =>
      _ProfessionalMigrationScreenState();
}

class _ProfessionalMigrationScreenState
    extends State<ProfessionalMigrationScreen> {
  final _categoriesRepo = ProvidersRepository();
  final _picker = ImagePicker();

  final _specialtyCtrl = TextEditingController();
  final _institutionCtrl = TextEditingController();
  final _yearsCtrl = TextEditingController();
  final _titleCtrl = TextEditingController();
  final _registrationNumberCtrl = TextEditingController();
  final _registrationIssuerCtrl = TextEditingController();

  List<CategoryModel> _categories = [];
  List<CategorySelectionResult> _selectedCategories = [];
  int? _primaryCategoryId;
  final List<File> _credentials = [];

  bool _loadingCategories = true;
  bool _loadingStatus = true;
  bool _submitting = false;
  bool _retryRequested = false;

  /// Respuesta cruda de GET .../professional-migration.
  Map<String, dynamic>? _migrationDetail;

  Map<String, dynamic>? get _request =>
      _migrationDetail?['request'] as Map<String, dynamic>?;
  String? get _status => _request?['status'] as String?;
  bool get _isPending => _status == 'PENDING';
  bool get _isRejected => _status == 'REJECTED';

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _loadStatus();
  }

  @override
  void dispose() {
    _specialtyCtrl.dispose();
    _institutionCtrl.dispose();
    _yearsCtrl.dispose();
    _titleCtrl.dispose();
    _registrationNumberCtrl.dispose();
    _registrationIssuerCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    final result = await _categoriesRepo.getCategories(forType: 'PROFESIONAL');
    if (!mounted) return;
    result.when(
      success: (list) => setState(() {
        _categories = list;
        _loadingCategories = false;
      }),
      failure: (_) => setState(() => _loadingCategories = false),
    );
  }

  Future<void> _loadStatus() async {
    final auth = context.read<AuthProvider>();
    final detail = await auth.fetchProfessionalMigrationDetail();
    if (!mounted) return;
    setState(() {
      // Si el GET falla (red), no asumimos "sin solicitud" — eso dejaría
      // reenviar el formulario aunque ya exista una PENDING cacheada
      // localmente desde /users/my-provider-status. Fallback al estado
      // compacto ya sincronizado por AuthProvider.
      _migrationDetail = detail ?? _fallbackDetailFromCache(auth);
      _loadingStatus = false;
      // Prefill de reintento: si hubo una solicitud previa (rechazada),
      // recuperamos lo que el usuario ya había escrito para que EDITE en
      // vez de arrancar de cero (las categorías no viajan en este
      // endpoint, así que esas sí se vuelven a elegir).
      final req = _request;
      if (req != null) {
        _specialtyCtrl.text = (req['specialty'] as String?) ?? '';
        _institutionCtrl.text = (req['institution'] as String?) ?? '';
        _yearsCtrl.text = (req['yearsExperience'] as num?)?.toString() ?? '';
        _titleCtrl.text = (req['professionalTitle'] as String?) ?? '';
        _registrationNumberCtrl.text =
            (req['registrationNumber'] as String?) ?? '';
        _registrationIssuerCtrl.text =
            (req['registrationIssuer'] as String?) ?? '';
      }
    });
  }

  /// Reconstruye un `request` mínimo a partir del `professionalMigration`
  /// compacto que ya vive en AuthProvider (viene de
  /// /users/my-provider-status y no requiere red adicional).
  Map<String, dynamic>? _fallbackDetailFromCache(AuthProvider auth) {
    final cached = auth.professionalMigration;
    if (cached == null) return null;
    return {'request': cached};
  }

  bool get _canSubmit {
    final specialty = _specialtyCtrl.text.trim();
    final specialtyOk = specialty.length >= 2 && specialty.length <= 120;
    final categoriesOk =
        _selectedCategories.isNotEmpty && _selectedCategories.length <= 6;
    return specialtyOk && categoriesOk && !_submitting;
  }

  Future<void> _addCredential() async {
    if (_credentials.length >= 4) return;
    final c = context.colors;
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.35),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(
                Icons.camera_alt_rounded,
                color: AppColors.available,
              ),
              title: Text('Tomar foto', style: TextStyle(color: c.textPrimary)),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(
                Icons.photo_library_rounded,
                color: AppColors.available,
              ),
              title: Text(
                'Seleccionar de la galería',
                style: TextStyle(color: c.textPrimary),
              ),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (source == null) return;
    final picked = await _picker.pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 1600,
    );
    if (picked == null || !mounted) return;
    setState(() => _credentials.add(File(picked.path)));
  }

  void _removeCredential(int index) {
    setState(() => _credentials.removeAt(index));
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _submitting = true);

    final auth = context.read<AuthProvider>();
    final years = int.tryParse(_yearsCtrl.text.trim());
    final ok = await auth.submitProfessionalMigration(
      specialty: _specialtyCtrl.text.trim(),
      institution: _institutionCtrl.text.trim().isEmpty
          ? null
          : _institutionCtrl.text.trim(),
      yearsExperience: years,
      professionalTitle: _titleCtrl.text.trim().isEmpty
          ? null
          : _titleCtrl.text.trim(),
      registrationNumber: _registrationNumberCtrl.text.trim().isEmpty
          ? null
          : _registrationNumberCtrl.text.trim(),
      registrationIssuer: _registrationIssuerCtrl.text.trim().isEmpty
          ? null
          : _registrationIssuerCtrl.text.trim(),
      categoryIds: _selectedCategories.map((s) => s.id).toList(),
      credentials: _credentials.isEmpty ? null : _credentials,
    );

    if (!mounted) return;
    setState(() {
      _submitting = false;
      _retryRequested = false;
    });

    if (ok) {
      await _loadStatus();
      if (!mounted) return;
      _showSuccessDialog();
    } else {
      _showError(auth.error ?? 'Error al enviar la solicitud');
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: const Color(0xFFEF4444)),
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
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.available.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.school_rounded,
                  color: AppColors.tintOn(AppColors.available, c.isDark),
                  size: 38,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Solicitud enviada',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              Text(
                'Tu perfil seguirá visible como Oficio mientras un admin '
                'revisa tu solicitud de Servicio profesional.',
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 14,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    Navigator.of(context).pop();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.available,
                    foregroundColor: AppColors.onSolid(AppColors.available),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Entendido',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        title: Text(
          'Servicio profesional',
          style: TextStyle(
            color: c.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: c.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _loadingStatus
          ? const Center(child: CircularProgressIndicator())
          : _isPending
          ? _PendingStatusView(request: _request!)
          : (_isRejected && !_retryRequested)
          ? _RejectedStatusView(
              request: _request!,
              onRetry: () => setState(() => _retryRequested = true),
            )
          : _buildForm(c),
    );
  }

  Widget _buildForm(AppThemeColors c) {
    final auth = context.watch<AuthProvider>();
    final oficioData = auth.providerDataFor('OFICIO');
    final businessName = oficioData?['businessName'] as String?;
    final phone = oficioData?['phone'] as String?;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _InfoBanner(businessName: businessName, phone: phone),
        const SizedBox(height: 24),

        _SectionHeader(
          title: 'Especialidad profesional',
          icon: Icons.school_rounded,
        ),
        const SizedBox(height: 14),
        _Field(
          ctrl: _specialtyCtrl,
          label: 'Especialidad *',
          hint: 'Ej. Abogado laboral, Nutricionista clínico',
          maxLength: 120,
          onChanged: () => setState(() {}),
        ),
        const SizedBox(height: 12),
        _Field(
          ctrl: _institutionCtrl,
          label: 'Institución donde estudiaste (opcional)',
          hint: 'Universidad, instituto...',
          maxLength: 160,
        ),
        const SizedBox(height: 12),
        _Field(
          ctrl: _yearsCtrl,
          label: 'Años de experiencia (opcional)',
          hint: '5',
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(2),
          ],
        ),
        const SizedBox(height: 12),
        _Field(
          ctrl: _titleCtrl,
          label: 'Título profesional (opcional)',
          hint: 'Ej. Licenciado en Derecho',
          maxLength: 160,
        ),
        const SizedBox(height: 12),
        _Field(
          ctrl: _registrationNumberCtrl,
          label: 'N° de colegiatura (opcional)',
          hint: 'CAL 12345',
          maxLength: 80,
        ),
        const SizedBox(height: 12),
        _Field(
          ctrl: _registrationIssuerCtrl,
          label: 'Colegio/entidad que lo emite (opcional)',
          hint: 'Colegio de Abogados de Junín',
          maxLength: 160,
        ),

        const SizedBox(height: 24),
        _SectionHeader(
          title: 'Categorías profesionales',
          icon: Icons.category_rounded,
        ),
        const SizedBox(height: 14),
        OnboardingCategorySection(
          providerType: 'PROFESIONAL',
          categories: _categories,
          selected: _selectedCategories,
          primaryCategoryId: _primaryCategoryId,
          maxCategories: 6,
          onChanged: (selected, primaryId) => setState(() {
            _selectedCategories = selected;
            _primaryCategoryId = primaryId;
          }),
        ),
        if (_loadingCategories)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Cargando categorías...',
              style: TextStyle(color: c.textMuted, fontSize: 12),
            ),
          ),

        const SizedBox(height: 24),
        _SectionHeader(
          title: 'Documentos o credenciales (opcional, hasta 4)',
          icon: Icons.attach_file_rounded,
        ),
        const SizedBox(height: 8),
        Text(
          'Diplomas, certificados o constancias que respalden tu especialidad.',
          style: TextStyle(color: c.textMuted, fontSize: 12),
        ),
        const SizedBox(height: 14),
        _CredentialsGrid(
          files: _credentials,
          onAdd: _addCredential,
          onRemove: _removeCredential,
        ),

        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: (_canSubmit && !_submitting) ? _submit : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.available,
              disabledBackgroundColor: c.bgCard,
              foregroundColor: AppColors.onSolid(AppColors.available),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: _submitting
                ? SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      color: AppColors.onSolid(AppColors.available),
                      strokeWidth: 2,
                    ),
                  )
                : const Text(
                    'Enviar solicitud',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
          ),
        ),
        const SizedBox(height: 40),
      ],
    );
  }
}

// ── Widgets auxiliares ────────────────────────────────────

class _InfoBanner extends StatelessWidget {
  final String? businessName;
  final String? phone;
  const _InfoBanner({this.businessName, this.phone});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.available.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.available.withValues(alpha: 0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.school_rounded,
            color: AppColors.tintOn(AppColors.available, c.isDark),
            size: 22,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tu perfil seguirá visible como Oficio mientras revisamos tu solicitud',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Tu nombre, teléfono y fotos no cambian — solo pedimos los '
                  'datos nuevos de tu especialidad. Un admin revisará tu '
                  'solicitud y no se crea un perfil nuevo.',
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 12,
                    height: 1.5,
                  ),
                ),
                if (businessName != null || phone != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    [?businessName, ?phone].join(' · '),
                    style: TextStyle(color: c.textMuted, fontSize: 12),
                  ),
                ],
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
        Icon(icon, color: AppColors.available, size: 18),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            color: c.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 15,
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
  final int? maxLength;
  final TextInputType keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final VoidCallback? onChanged;

  const _Field({
    required this.ctrl,
    required this.label,
    required this.hint,
    this.maxLength,
    this.keyboardType = TextInputType.text,
    this.inputFormatters,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: c.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: ctrl,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          maxLength: maxLength,
          onChanged: onChanged == null ? null : (_) => onChanged!(),
          style: TextStyle(color: c.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: c.textMuted, fontSize: 14),
            filled: true,
            fillColor: c.bgInput,
            counterText: '',
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
              borderSide: const BorderSide(
                color: AppColors.available,
                width: 1.5,
              ),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
          ),
        ),
      ],
    );
  }
}

class _CredentialsGrid extends StatelessWidget {
  final List<File> files;
  final VoidCallback onAdd;
  final void Function(int index) onRemove;

  const _CredentialsGrid({
    required this.files,
    required this.onAdd,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        for (var i = 0; i < files.length; i++)
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(
                  files[i],
                  width: 84,
                  height: 84,
                  fit: BoxFit.cover,
                ),
              ),
              Positioned(
                top: 4,
                right: 4,
                child: GestureDetector(
                  onTap: () => onRemove(i),
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(
                      color: Colors.black54,
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
            ],
          ),
        if (files.length < 4)
          GestureDetector(
            onTap: onAdd,
            child: Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                color: c.bgCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: c.border),
              ),
              child: Icon(
                Icons.add_a_photo_rounded,
                color: c.textMuted,
                size: 24,
              ),
            ),
          ),
      ],
    );
  }
}

/// Estado "en revisión" — no permite reenviar mientras haya un PENDING.
class _PendingStatusView extends StatelessWidget {
  final Map<String, dynamic> request;
  const _PendingStatusView({required this.request});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final specialty = request['specialty'] as String? ?? '';
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.available.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppColors.available.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.hourglass_top_rounded,
                    color: AppColors.tintOn(AppColors.available, c.isDark),
                    size: 22,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Solicitud en revisión',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                'Un admin está revisando tu solicitud para pasar a Servicio '
                'profesional${specialty.isNotEmpty ? ' ($specialty)' : ''}. '
                'Tu perfil sigue visible como Oficio mientras tanto.',
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Estado "rechazada" — muestra el motivo y permite reintentar.
class _RejectedStatusView extends StatelessWidget {
  final Map<String, dynamic> request;
  final VoidCallback onRetry;
  const _RejectedStatusView({required this.request, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const accent = Color(0xFFEF4444);
    final reason = request['rejectionReason'] as String?;
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: accent.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: accent.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.cancel_rounded, color: accent, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Solicitud rechazada',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Motivo:',
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                (reason == null || reason.isEmpty)
                    ? 'No se especificó un motivo.'
                    : reason,
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: const Text('Reintentar'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    textStyle: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
