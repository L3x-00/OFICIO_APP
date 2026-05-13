import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:mobile/core/utils/permission_service.dart';
import 'package:mobile/features/referrals/data/referrals_repository.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../../../provider_dashboard/data/dashboard_repository.dart';
import '../../../../providers_list/data/providers_repository.dart';
import '../../../../../core/errors/failures.dart';
import '../../../../../shared/widgets/location_picker_sheet.dart';
import '../../../../../shared/widgets/phone_input_section.dart';
import '../../../../../shared/widgets/collapsible_schedule.dart';
import 'widgets/onboarding_photo_section.dart';
import 'widgets/onboarding_address_section.dart';
import 'widgets/onboarding_social_section.dart';

class ProviderOnboardingForm extends StatefulWidget {
  final String? providerType;
  final bool isStandalone;
  final Map<String, dynamic>? initialData;

  const ProviderOnboardingForm({
    super.key,
    this.providerType,
    this.isStandalone = false,
    this.initialData,
  });

  @override
  State<ProviderOnboardingForm> createState() => _ProviderOnboardingFormState();
}

class _ProviderOnboardingFormState extends State<ProviderOnboardingForm> {
  // ── Controllers ─────────────────────────────────────────
  final _businessNameController    = TextEditingController();
  final _dniController             = TextEditingController();
  final _rucController             = TextEditingController();
  final _nombreComercialController = TextEditingController();
  final _razonSocialController     = TextEditingController();
  final _descriptionController     = TextEditingController();
  final _addressController         = TextEditingController();
  final _mapsUrlController         = TextEditingController();
  final _referralCodeCtrl          = TextEditingController();
  final _websiteCtrl               = TextEditingController();
  final _instagramCtrl             = TextEditingController();
  final _tiktokCtrl                = TextEditingController();
  final _facebookCtrl              = TextEditingController();
  final _linkedinCtrl              = TextEditingController();
  final _twitterCtrl               = TextEditingController();
  final _telegramCtrl              = TextEditingController();
  final _whatsappBizCtrl           = TextEditingController();

  // ── State ────────────────────────────────────────────────
  String  _phone    = '';
  String  _whatsapp = '';
  bool    _hasDelivery       = false;
  bool    _plenaCoordinacion = false;
  bool    _isLoading         = false;
  bool    _showAddressSection = false;
  bool    _gpsLoading         = false;

  Position?              _gpsPosition;
  String?                _department;
  String?                _province;
  String?                _district;
  int?                   _selectedCategoryId;
  String                 _selectedCategoryName = '';
  String                 _selectedParentName   = '';
  Map<String, dynamic>   _scheduleJson         = {};
  List<CategoryModel> _categories = [];

  final List<XFile> _photos   = [];
  final int         _maxPhotos = 3;

  bool get _isOficio        => widget.providerType != 'NEGOCIO';
  bool get _hasAdminLocation => _department != null && _province != null && _district != null;

  String get _formTitle {
    if (widget.providerType == 'NEGOCIO') return 'Registrar Negocio';
    return 'Crear Perfil Profesional';
  }

  String get _formSubtitle {
    if (widget.providerType == 'NEGOCIO') {
      return 'Completa los datos de tu negocio para aparecer en el directorio.';
    }
    return 'Completa tu perfil para que clientes puedan encontrarte.';
  }

  @override
  void initState() {
    super.initState();
    _loadCategories();

    final auth = context.read<AuthProvider>();
    if (auth.user?.department != null) {
      _department = auth.user!.department;
      _province   = auth.user!.province;
      _district   = auth.user!.district;
    }

    if (widget.initialData != null) {
      final d = widget.initialData!;
      _businessNameController.text    = d['businessName']    ?? '';
      _descriptionController.text     = d['description']     ?? '';
      _addressController.text         = d['address']         ?? '';
      _dniController.text             = d['dni']             ?? '';
      _rucController.text             = d['ruc']             ?? '';
      _nombreComercialController.text = d['nombreComercial'] ?? '';
      _razonSocialController.text     = d['razonSocial']     ?? '';
      if (d['scheduleJson'] is Map<String, dynamic>) {
        _scheduleJson = Map<String, dynamic>.from(d['scheduleJson'] as Map);
      }
    }
  }

  @override
  void dispose() {
    _businessNameController.dispose();
    _dniController.dispose();
    _rucController.dispose();
    _nombreComercialController.dispose();
    _razonSocialController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    _mapsUrlController.dispose();
    _referralCodeCtrl.dispose();
    _websiteCtrl.dispose();
    _instagramCtrl.dispose();
    _tiktokCtrl.dispose();
    _facebookCtrl.dispose();
    _linkedinCtrl.dispose();
    _twitterCtrl.dispose();
    _telegramCtrl.dispose();
    _whatsappBizCtrl.dispose();
    super.dispose();
  }

  // ── Categories ───────────────────────────────────────────

  Future<void> _loadCategories() async {
    final result = await ProvidersRepository().getCategories(forType: widget.providerType);
    if (!mounted) return;
    result.when(
      success: (cats) => setState(() => _categories = cats),
      failure: (_) {},
    );
  }

  Future<void> _showCategoryPicker() async {
    if (_categories.isEmpty) return;
    final c = context.colors;
    final isNegocio = !_isOficio;

    CategoryModel? pickerParent;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) {
          final items = pickerParent == null ? _categories : pickerParent!.children;
          final title = pickerParent == null
              ? (isNegocio ? 'Sector de tu negocio' : 'Selecciona una categoría')
              : pickerParent!.name;

          return DraggableScrollableSheet(
            initialChildSize: 0.6,
            minChildSize: 0.4,
            maxChildSize: 0.92,
            expand: false,
            builder: (_, scrollCtrl) => SafeArea(
              child: Column(
                children: [
                  const SizedBox(height: 8),
                  Container(
                    width: 36, height: 4,
                    decoration: BoxDecoration(
                      color: c.textMuted.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 12, 20, 8),
                    child: Row(
                      children: [
                        if (pickerParent != null)
                          IconButton(
                            icon: Icon(Icons.arrow_back_rounded, color: c.textSecondary),
                            onPressed: () => setModal(() => pickerParent = null),
                          )
                        else
                          const SizedBox(width: 48),
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              color: c.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Divider(height: 1, color: c.border),
                  Expanded(
                    child: ListView.builder(
                      controller: scrollCtrl,
                      itemCount: items.length,
                      itemBuilder: (_, i) {
                        final item = items[i];
                        final isSelected = _selectedCategoryId == item.id;
                        final hasChildren = item.children.isNotEmpty;
                        return ListTile(
                          title: Text(
                            item.name,
                            style: TextStyle(
                              color: isSelected ? AppColors.primary : c.textPrimary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                          trailing: hasChildren
                              ? Icon(Icons.chevron_right, color: c.textMuted)
                              : isSelected
                                  ? const Icon(Icons.check_circle, color: AppColors.primary)
                                  : null,
                          onTap: () {
                            if (hasChildren) {
                              setModal(() => pickerParent = item);
                            } else {
                              setState(() {
                                _selectedCategoryId   = item.id;
                                _selectedCategoryName = item.name;
                                _selectedParentName   = pickerParent?.name ?? '';
                              });
                              Navigator.pop(ctx);
                            }
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ── GPS / Maps ───────────────────────────────────────────

  Future<void> _fetchGpsLocation() async {
    setState(() => _gpsLoading = true);
    final pos = await PermissionService.getCurrentLocation(context);
    if (!mounted) return;
    setState(() {
      _gpsPosition = pos;
      _gpsLoading  = false;
    });
    if (pos != null && _addressController.text.trim().isEmpty) {
      _addressController.text =
          '${pos.latitude.toStringAsFixed(6)}, ${pos.longitude.toStringAsFixed(6)}';
    }
  }

  void _parseMapsUrl() {
    final url = _mapsUrlController.text.trim();
    if (url.isEmpty) return;

    final patterns = [
      RegExp(r'@(-?\d+\.\d+),(-?\d+\.\d+)'),
      RegExp(r'[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)'),
      RegExp(r'll=(-?\d+\.\d+),(-?\d+\.\d+)'),
      RegExp(r'place/[^/]+/@(-?\d+\.\d+),(-?\d+\.\d+)'),
    ];

    for (final pattern in patterns) {
      final match = pattern.firstMatch(url);
      if (match != null) {
        final lat = match.group(1)!;
        final lng = match.group(2)!;
        setState(() => _addressController.text = '$lat, $lng');
        _showSnack('Coordenadas extraídas correctamente.');
        return;
      }
    }
    _showSnack('No se pudieron extraer coordenadas del enlace.', isError: true);
  }

  // ── Photos ───────────────────────────────────────────────

  Future<void> _pickPhoto() async {
    if (_photos.length >= _maxPhotos) return;
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file != null && mounted) {
      setState(() => _photos.add(file));
    }
  }

  void _removePhoto(int index) {
    setState(() => _photos.removeAt(index));
  }

  void _reorderPhotos(int from, int to) {
    setState(() {
      final item = _photos.removeAt(from);
      _photos.insert(to, item);
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    if (isError) {
      context.showErrorSnack(msg);
    } else {
      context.showSuccessSnack(msg);
    }
  }

  Widget _buildOficioDomicilioSection() {
    final c = context.colors;
    return _buildToggleRow(
      c: c,
      value: _hasDelivery,
      onChanged: (v) => setState(() => _hasDelivery = v),
      icon: Icons.home_repair_service_rounded,
      label: 'Ofrezco servicios a domicilio',
      subtitle: 'Me desplazo al lugar del cliente',
    );
  }

  Widget _buildDeliverySection() {
    final c = context.colors;
    return Column(
      children: [
        _buildToggleRow(
          c: c,
          value: _hasDelivery,
          onChanged: (v) => setState(() {
            _hasDelivery = v;
            if (!v) _plenaCoordinacion = false;
          }),
          icon: Icons.delivery_dining_rounded,
          label: 'Ofrezco servicio de delivery',
          subtitle: 'Entrego pedidos a domicilio',
        ),
        if (_hasDelivery) ...[
          const SizedBox(height: 10),
          _buildToggleRow(
            c: c,
            value: _plenaCoordinacion,
            onChanged: (v) => setState(() => _plenaCoordinacion = v),
            icon: Icons.handshake_rounded,
            label: 'Plena coordinación',
            subtitle: 'Coordino detalles con el cliente antes del envío',
          ),
        ],
      ],
    );
  }

  Widget _buildToggleRow({
    required AppThemeColors c,
    required bool value,
    required ValueChanged<bool> onChanged,
    required IconData icon,
    required String label,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: value ? AppColors.primary.withValues(alpha: 0.06) : c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: value ? AppColors.primary.withValues(alpha: 0.4) : c.border,
        ),
      ),
      child: Row(
        children: [
          Icon(icon, color: value ? AppColors.primary : c.textMuted, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.w500)),
                Text(subtitle, style: TextStyle(color: c.textMuted, fontSize: 12)),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.primary,
          ),
        ],
      ),
    );
  }

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
            hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
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
                color: AppColors.primary,
                width: 1.5,
              ),
            ),
            contentPadding: EdgeInsets.all(maxLines > 1 ? 16 : 14),
          ),
        ),
      ],
    );
  }

  Widget _buildCategorySelector(AppThemeColors c) {
    final hasCategories = _categories.isNotEmpty;
    final isSelected    = _selectedCategoryId != null;
    final isNegocio     = !_isOficio;
    final displayText   = isSelected && _selectedParentName.isNotEmpty
        ? '$_selectedParentName › $_selectedCategoryName'
        : isNegocio
            ? 'Selecciona el tipo de negocio'
            : 'Selecciona una categoría';

    return GestureDetector(
      onTap: hasCategories ? _showCategoryPicker : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected
                ? AppColors.primary.withValues(alpha: 0.5)
                : c.border,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isNegocio ? Icons.storefront_outlined : Icons.category_outlined,
              color: isSelected ? AppColors.primary : c.textMuted,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    isNegocio ? 'Tipo de negocio *' : 'Categoría del servicio',
                    style: TextStyle(color: c.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    displayText,
                    style: TextStyle(
                      color: isSelected ? c.textPrimary : c.textMuted,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            if (!hasCategories)
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: c.textMuted,
                ),
              )
            else
              Icon(Icons.arrow_drop_down, color: c.textMuted),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationSection(AppThemeColors c) {
    final hasLoc = _hasAdminLocation;
    return GestureDetector(
      onTap: () async {
        final result = await LocationPickerSheet.show(
          context,
          initialDepartment: _department,
          initialProvince:   _province,
          initialDistrict:   _district,
        );
        if (result != null && mounted) {
          setState(() {
            _department = result.department;
            _province   = result.province;
            _district   = result.district;
          });
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: c.bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: hasLoc
                ? AppColors.primary.withValues(alpha: 0.4)
                : AppColors.busy.withValues(alpha: 0.5),
          ),
        ),
        child: Row(
          children: [
            Icon(
              hasLoc ? Icons.location_on_rounded : Icons.location_off_rounded,
              color: hasLoc ? AppColors.primary : AppColors.busy,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    hasLoc
                        ? '$_district, $_province'
                        : 'Seleccionar ubicación *',
                    style: TextStyle(
                      color: hasLoc ? c.textPrimary : AppColors.busy,
                      fontSize: 14,
                      fontWeight: hasLoc ? FontWeight.w500 : FontWeight.normal,
                    ),
                  ),
                  if (hasLoc)
                    Text(
                      _department!,
                      style: TextStyle(color: c.textSecondary, fontSize: 12),
                    ),
                ],
              ),
            ),
            Icon(Icons.edit_rounded, color: c.textMuted, size: 16),
          ],
        ),
      ),
    );
  }

  // ── Submit ───────────────────────────────────────────────

  Future<void> _submit() async {
    final name = _businessNameController.text.trim();
    final dni  = _dniController.text.trim();
    final ruc  = _rucController.text.trim();

    if (name.isEmpty) {
      _showSnack('El nombre es obligatorio.', isError: true);
      return;
    }
    if (_phone.isEmpty) {
      _showSnack('El teléfono de contacto es obligatorio.', isError: true);
      return;
    }
    if (!_phone.startsWith('+') && !RegExp(r'^\d{9}$').hasMatch(_phone)) {
      _showSnack('El teléfono debe tener 9 dígitos (número peruano).', isError: true);
      return;
    }
    if (!_isOficio && !_hasAdminLocation) {
      _showSnack('Selecciona tu departamento, provincia y distrito.', isError: true);
      return;
    }
    if (_isOficio && dni.isNotEmpty && !RegExp(r'^\d{8}$').hasMatch(dni)) {
      _showSnack('El DNI debe tener exactamente 8 dígitos.', isError: true);
      return;
    }
    if (!_isOficio && ruc.isNotEmpty && !RegExp(r'^\d{11}$').hasMatch(ruc)) {
      _showSnack('El RUC debe tener exactamente 11 dígitos.', isError: true);
      return;
    }

    setState(() => _isLoading = true);

    final auth = context.read<AuthProvider>();
    final result = await auth.registerProvider(
      businessName:      name,
      phone:             _phone,
      whatsapp:          _whatsapp,
      type:              widget.providerType ?? 'OFICIO',
      dni:               _isOficio && dni.isNotEmpty ? dni : null,
      ruc:               !_isOficio && ruc.isNotEmpty ? ruc : null,
      nombreComercial:   !_isOficio ? _nombreComercialController.text.trim() : null,
      razonSocial:       !_isOficio ? _razonSocialController.text.trim() : null,
      hasDelivery:       !_isOficio ? _hasDelivery : false,
      plenaCoordinacion: !_isOficio && _hasDelivery ? _plenaCoordinacion : false,
      hasHomeService:    _isOficio ? _hasDelivery : false,
      description:       _descriptionController.text.trim(),
      address:           _addressController.text.trim(),
      categoryId:        _selectedCategoryId,
      scheduleJson:      !_isOficio && _scheduleJson.isNotEmpty ? _scheduleJson : null,
      website:           _websiteCtrl.text.trim().isEmpty    ? null : _websiteCtrl.text.trim(),
      instagram:         _instagramCtrl.text.trim().isEmpty  ? null : _instagramCtrl.text.trim(),
      tiktok:            _tiktokCtrl.text.trim().isEmpty     ? null : _tiktokCtrl.text.trim(),
      facebook:          _facebookCtrl.text.trim().isEmpty   ? null : _facebookCtrl.text.trim(),
      linkedin:          _linkedinCtrl.text.trim().isEmpty   ? null : _linkedinCtrl.text.trim(),
      twitterX:          _twitterCtrl.text.trim().isEmpty    ? null : _twitterCtrl.text.trim(),
      telegram:          _telegramCtrl.text.trim().isEmpty   ? null : _telegramCtrl.text.trim(),
      whatsappBiz:       _whatsappBizCtrl.text.trim().isEmpty ? null : _whatsappBizCtrl.text.trim(),
    );

    if (!mounted) return;

    if (!result) {
      setState(() => _isLoading = false);
      _showSnack(auth.error ?? 'Error al crear el perfil', isError: true);
      return;
    }

    final refCode = _referralCodeCtrl.text.trim();
    if (refCode.isNotEmpty) {
      try {
        await ReferralsRepository().applyCode(refCode);
        if (!mounted) return;
        _showSnack('Código de referido aplicado.');
      } catch (e) {
        if (!mounted) return;
        _showSnack('No pudimos aplicar el código de referido.', isError: true);
      }
    }

    if (_photos.isNotEmpty) {
      final repo = DashboardRepository();
      int uploadErrors = 0;
      debugPrint('[Onboarding] Subiendo ${_photos.length} foto(s) para tipo=${widget.providerType}');
      for (int i = 0; i < _photos.length; i++) {
        final photo = _photos[i];
        try {
          debugPrint('[Onboarding] Foto ${i + 1}/${_photos.length}: ${photo.name} (${photo.path})');
          final url = await repo.uploadProviderPhotoFile(photo);
          debugPrint('[Onboarding] URL obtenida: $url');
          await repo.saveProviderImage(url, type: widget.providerType);
          debugPrint('[Onboarding] Foto ${i + 1} guardada en el perfil');
        } catch (e, st) {
          uploadErrors++;
          debugPrint('[Onboarding] ERROR foto ${i + 1}: $e\n$st');
        }
      }
      if (!mounted) return;
      if (uploadErrors > 0 && uploadErrors < _photos.length) {
        _showSnack('Algunas fotos no se subieron. Puedes agregarlas desde el panel.');
      } else if (uploadErrors == _photos.length) {
        _showSnack('No se pudieron subir las fotos. Agrégalas desde tu panel.', isError: true);
      }
    }

    if (!mounted) return;

    await auth.refreshProviderStatus();
    if (!mounted) return;

    setState(() => _isLoading = false);

    if (_hasAdminLocation) {
      auth.updateLocation(
        department: _department!,
        province:   _province!,
        district:   _district!,
      );
    }

    _showSuccessDialog();
  }

  void _showSuccessDialog() {
    final c = context.colors;
    final auth = context.read<AuthProvider>();
    final isNegocio = widget.providerType == 'NEGOCIO';

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
                  color: AppColors.available.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isNegocio ? Icons.storefront_rounded : Icons.handyman_rounded,
                  color: AppColors.available,
                  size: 44,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                isNegocio ? '¡Negocio Registrado!' : '¡Perfil Profesional Creado!',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                isNegocio
                    ? 'Negocio creado con éxito. Se te notificará una vez que sea aprobado por el equipo.'
                    : 'Tu perfil está siendo revisado. Te notificaremos cuando esté aprobado.',
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
                    Navigator.of(ctx).pop();
                    auth.completeOnboarding(
                      role: widget.providerType ?? 'OFICIO',
                    );
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

  // ── Build ────────────────────────────────────────────────

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
        title: Text(_formTitle, style: TextStyle(color: c.textPrimary)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
              style: TextStyle(color: c.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 24),

            _FormSectionHeader(label: 'INFORMACIÓN BÁSICA'),
            const SizedBox(height: 12),

            _buildField(
              controller: _businessNameController,
              label: _isOficio ? 'Nombre del profesional *' : 'Nombre del negocio *',
              hint:  _isOficio ? 'Ej: Juan Electricista' : 'Ej: Restaurante El Sabor',
              icon:  _isOficio ? Icons.handyman_outlined : Icons.storefront_outlined,
            ),
            const SizedBox(height: 14),

            if (_isOficio) ...[
              _buildField(
                controller: _dniController,
                label: 'DNI del titular (opcional)',
                hint: '12345678',
                icon: Icons.badge_outlined,
                keyboardType: TextInputType.number,
                maxLength: 8,
              ),
              const SizedBox(height: 14),
            ],

            if (!_isOficio) ...[
              _buildField(
                controller: _rucController,
                label: 'RUC (opcional)',
                hint: '20123456789',
                icon: Icons.receipt_long_outlined,
                keyboardType: TextInputType.number,
                maxLength: 11,
              ),
              const SizedBox(height: 14),
              _buildField(
                controller: _nombreComercialController,
                label: 'Nombre Comercial (opcional)',
                hint: 'Ej: El Sabor Peruano',
                icon: Icons.label_outline,
              ),
              const SizedBox(height: 14),
              _buildField(
                controller: _razonSocialController,
                label: 'Razón Social (opcional)',
                hint: 'Ej: Inversiones El Sabor S.A.C.',
                icon: Icons.business_outlined,
              ),
              const SizedBox(height: 14),
            ],

            PhoneInputSection(
              onChange: (phone, wap) => setState(() {
                _phone    = phone;
                _whatsapp = wap ?? '';
              }),
            ),
            const SizedBox(height: 14),

            if (!_isOficio) ...[
              OnboardingAddressSection(
                addressController:  _addressController,
                mapsUrlController:  _mapsUrlController,
                showAddressSection: _showAddressSection,
                gpsLoading:         _gpsLoading,
                gpsPosition:        _gpsPosition,
                onToggleSection:    () => setState(() => _showAddressSection = !_showAddressSection),
                onFetchGps:         _fetchGpsLocation,
                onClearGps:         () => setState(() { _gpsPosition = null; _addressController.clear(); }),
                onParseMapsUrl:     _parseMapsUrl,
              ),
              const SizedBox(height: 14),
            ],

            _FormSectionHeader(label: _isOficio ? 'CATEGORÍA DEL SERVICIO' : 'TIPO DE NEGOCIO'),
            const SizedBox(height: 12),
            _buildCategorySelector(context.colors),
            const SizedBox(height: 24),

            _FormSectionHeader(label: 'DESCRIPCIÓN'),
            const SizedBox(height: 12),

            _buildField(
              controller: _descriptionController,
              label: _isOficio ? 'Describe tu servicio' : 'Describe tu negocio',
              hint:  _isOficio
                  ? 'Experiencia, especialidades, horario de trabajo...'
                  : 'Qué ofreces, horarios, especialidades...',
              icon: Icons.description_outlined,
              maxLines: 4,
            ),
            const SizedBox(height: 24),

            _FormSectionHeader(
              label: _isOficio ? 'SERVICIOS A DOMICILIO' : 'SERVICIO DE DELIVERY',
            ),
            const SizedBox(height: 12),
            _isOficio ? _buildOficioDomicilioSection() : _buildDeliverySection(),
            const SizedBox(height: 24),

            if (!_isOficio) ...[
              CollapsibleSchedule(
                scheduleJson: _scheduleJson,
                onSave: (s) => setState(() => _scheduleJson = s),
              ),
              const SizedBox(height: 24),
            ],

            _FormSectionHeader(label: _isOficio ? 'TU UBICACIÓN (opcional)' : 'TU UBICACIÓN *'),
            const SizedBox(height: 12),
            _buildLocationSection(context.colors),
            const SizedBox(height: 24),

            const SizedBox(height: 8),
            OnboardingSocialSection(
              websiteCtrl:     _websiteCtrl,
              instagramCtrl:   _instagramCtrl,
              tiktokCtrl:      _tiktokCtrl,
              facebookCtrl:    _facebookCtrl,
              linkedinCtrl:    _linkedinCtrl,
              twitterCtrl:     _twitterCtrl,
              telegramCtrl:    _telegramCtrl,
              whatsappBizCtrl: _whatsappBizCtrl,
            ),
            const SizedBox(height: 24),

            _FormSectionHeader(label: 'FOTOS DEL SERVICIO'),
            const SizedBox(height: 12),
            OnboardingPhotoSection(
              photos:          _photos,
              maxPhotos:       _maxPhotos,
              onPickPhoto:     _pickPhoto,
              onRemovePhoto:   _removePhoto,
              onReorderPhotos: _reorderPhotos,
            ),
            const SizedBox(height: 32),

            _FormSectionHeader(label: 'CÓDIGO DE REFERIDO (OPCIONAL)'),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: c.bgInput,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.card_giftcard_rounded,
                      color: AppColors.primary, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _referralCodeCtrl,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        hintText: 'Ej: ALEX1234',
                        hintStyle: TextStyle(color: c.textMuted),
                      ),
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 6, left: 4),
              child: Text(
                'Si alguien te invitó, ingresa su código aquí. Recibirás 5 monedas al ser aprobado.',
                style: TextStyle(color: c.textMuted, fontSize: 11),
              ),
            ),
            const SizedBox(height: 32),

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
                    context.read<AuthProvider>().completeOnboarding(
                      role: 'USUARIO',
                    );
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
}

// ── Shared form helpers (used by ProviderOnboardingForm) ──

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
    final color = isOficio ? AppColors.primary : const Color(0xFF8E2DE2);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
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
