import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:mobile/core/services/geocoding_service.dart';
import 'package:mobile/core/utils/geocoding_helper.dart';
import 'package:mobile/core/utils/permission_service.dart';
import 'package:mobile/core/utils/plan_limits.dart';
import 'package:mobile/features/payments/presentation/screens/yape_payment_screen.dart';
import 'package:mobile/features/payments/presentation/providers/payments_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:mobile/features/referrals/data/referrals_repository.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../../../provider_dashboard/data/dashboard_repository.dart';
import '../../../../providers_list/data/providers_repository.dart';
import '../../../../../core/errors/failures.dart';
import '../../../../../shared/widgets/collapsible_schedule.dart';
import '../../../../../shared/widgets/phone_input_section.dart';
import 'widgets/onboarding_photo_section.dart';
import 'widgets/onboarding_address_section.dart';
import 'widgets/onboarding_social_section.dart';

// Nuevos imports factorizados
import 'widgets/onboarding_form_components.dart';
import 'widgets/onboarding_category_section.dart';
import 'widgets/onboarding_location_section.dart';
import 'widgets/onboarding_delivery_section.dart';
import 'widgets/onboarding_plan_section.dart';
import 'widgets/plan_choice_sheet.dart';
import 'widgets/registration_success_dialog.dart';

class ProviderOnboardingForm extends StatefulWidget {
  final String? providerType;
  final bool isStandalone;
  final Map<String, dynamic>? initialData;

  /// Plan elegido en [OnboardingPlansSheet] antes de entrar al formulario.
  final String? selectedPlan;

  const ProviderOnboardingForm({
    super.key,
    this.providerType,
    this.isStandalone = false,
    this.initialData,
    this.selectedPlan,
  });

  @override
  State<ProviderOnboardingForm> createState() => _ProviderOnboardingFormState();
}

class _ProviderOnboardingFormState extends State<ProviderOnboardingForm>
    with WidgetsBindingObserver {
  // Valores semilla para `PhoneInputSection`
  String _phoneSeed = '';
  String _whatsappSeed = '';

  // ── Controllers ─────────────────────────────────────────
  final _businessNameController = TextEditingController();
  final _dniController = TextEditingController();
  final _rucController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();
  final _mapsUrlController = TextEditingController();
  final _referralCodeCtrl = TextEditingController();
  final _websiteCtrl = TextEditingController();
  final _instagramCtrl = TextEditingController();
  final _tiktokCtrl = TextEditingController();
  final _facebookCtrl = TextEditingController();
  final _linkedinCtrl = TextEditingController();
  final _twitterCtrl = TextEditingController();
  final _telegramCtrl = TextEditingController();
  final _whatsappBizCtrl = TextEditingController();

  // ── State ────────────────────────────────────────────────
  String _phone = '';
  String _whatsapp = '';
  bool _hasDelivery = false;
  bool _plenaCoordinacion = false;
  bool _isLoading = false;
  bool _showAddressSection = false;
  bool _gpsLoading = false;

  /// `true` cuando el usuario opta por el plan Premium (de pago).
  bool _acquirePremium = false;

  // 👇 NUEVAS VARIABLES DE ESTADO PARA EL ACORDEÓN
  bool _isSection1Expanded = true;
  bool _isSection2Expanded = false;

  Position? _gpsPosition;
  String? _department;
  String? _province;
  String? _district;
  List<CategorySelectionResult> _selectedCategories = [];
  int? _primaryCategoryId;
  Map<String, dynamic> _scheduleJson = {};
  List<CategoryModel> _categories = [];

  final List<XFile> _photos = [];
  final int _maxPhotos = 3;

  bool get _isOficio => widget.providerType != 'NEGOCIO';
  bool get _hasAdminLocation =>
      _department != null && _province != null && _district != null;

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
    WidgetsBinding.instance.addObserver(this);
    _loadCategories();
    _acquirePremium = widget.selectedPlan == 'PREMIUM';

    if (widget.initialData != null) {
      final d = widget.initialData!;
      _businessNameController.text = d['businessName'] ?? '';
      _descriptionController.text = d['description'] ?? '';
      _addressController.text = d['address'] ?? '';
      _dniController.text = d['dni'] ?? '';
      _rucController.text = d['ruc'] ?? '';
      _phone = (d['phone'] as String?) ?? '';
      _whatsapp = (d['whatsapp'] as String?) ?? '';

      _hasDelivery = (d['hasDelivery'] as bool?) ?? false;
      _plenaCoordinacion = (d['plenaCoordinacion'] as bool?) ?? false;
      if (d['hasHomeService'] == true) _hasDelivery = true;

      if (d['scheduleJson'] is Map<String, dynamic>) {
        _scheduleJson = Map<String, dynamic>.from(d['scheduleJson'] as Map);
      }

      _websiteCtrl.text = (d['website'] as String?) ?? '';
      _instagramCtrl.text = (d['instagram'] as String?) ?? '';
      _tiktokCtrl.text = (d['tiktok'] as String?) ?? '';
      _facebookCtrl.text = (d['facebook'] as String?) ?? '';
      _linkedinCtrl.text = (d['linkedin'] as String?) ?? '';
      _twitterCtrl.text = (d['twitterX'] as String?) ?? '';
      _telegramCtrl.text = (d['telegram'] as String?) ?? '';
      _whatsappBizCtrl.text = (d['whatsappBiz'] as String?) ?? '';

      final cats = d['categories'] as List<dynamic>?;
      if (cats != null && cats.isNotEmpty) {
        _selectedCategories = cats
            .whereType<Map<String, dynamic>>()
            .map(
              (c) => CategorySelectionResult(
                id: (c['id'] as num).toInt(),
                name: (c['name'] as String?) ?? '',
                parentName: (c['parentName'] as String?) ?? '',
              ),
            )
            .toList();
        _primaryCategoryId = _selectedCategories.first.id;
      }
      _phoneSeed = _phone;
      _whatsappSeed = _whatsapp;

      // 👇 LÓGICA DE RESTAURACIÓN: Si la sección 1 ya está completa al precargar, abrimos la 2.
      if (_isSection1Complete()) {
        _isSection1Expanded = false;
        _isSection2Expanded = true;
      }
    } else {
      _restoreDraft();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _businessNameController.dispose();
    _dniController.dispose();
    _rucController.dispose();
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

  // ── Persistencia de borrador ──────────────────
  String get _draftKey => 'onboarding_draft_${widget.providerType ?? 'OFICIO'}';

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.hidden) {
      _saveDraft();
    }
  }

  Map<String, dynamic> _draftSnapshot() => {
    'businessName': _businessNameController.text,
    'dni': _dniController.text,
    'ruc': _rucController.text,
    'description': _descriptionController.text,
    'address': _addressController.text,
    'mapsUrl': _mapsUrlController.text,
    'referralCode': _referralCodeCtrl.text,
    'website': _websiteCtrl.text,
    'instagram': _instagramCtrl.text,
    'tiktok': _tiktokCtrl.text,
    'facebook': _facebookCtrl.text,
    'linkedin': _linkedinCtrl.text,
    'twitterX': _twitterCtrl.text,
    'telegram': _telegramCtrl.text,
    'whatsappBiz': _whatsappBizCtrl.text,
    'phone': _phone,
    'whatsapp': _whatsapp,
    'hasDelivery': _hasDelivery,
    'plenaCoordinacion': _plenaCoordinacion,
    'acquirePremium': _acquirePremium,
    'department': _department,
    'province': _province,
    'district': _district,
    'scheduleJson': _scheduleJson,
    'primaryCategoryId': _primaryCategoryId,
    'categories': _selectedCategories
        .map((e) => {'id': e.id, 'name': e.name, 'parentName': e.parentName})
        .toList(),
  };

  bool get _draftHasContent =>
      _businessNameController.text.trim().isNotEmpty ||
      _descriptionController.text.trim().isNotEmpty ||
      _phone.isNotEmpty ||
      _selectedCategories.isNotEmpty;

  Future<void> _saveDraft() async {
    if (!_draftHasContent) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_draftKey, jsonEncode(_draftSnapshot()));
    } catch (_) {}
  }

  Future<void> _restoreDraft() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_draftKey);
      if (raw == null || raw.isEmpty || !mounted) return;
      final d = jsonDecode(raw) as Map<String, dynamic>;

      _businessNameController.text = (d['businessName'] as String?) ?? '';
      _dniController.text = (d['dni'] as String?) ?? '';
      _rucController.text = (d['ruc'] as String?) ?? '';
      _descriptionController.text = (d['description'] as String?) ?? '';
      _addressController.text = (d['address'] as String?) ?? '';
      _mapsUrlController.text = (d['mapsUrl'] as String?) ?? '';
      _referralCodeCtrl.text = (d['referralCode'] as String?) ?? '';
      _websiteCtrl.text = (d['website'] as String?) ?? '';
      _instagramCtrl.text = (d['instagram'] as String?) ?? '';
      _tiktokCtrl.text = (d['tiktok'] as String?) ?? '';
      _facebookCtrl.text = (d['facebook'] as String?) ?? '';
      _linkedinCtrl.text = (d['linkedin'] as String?) ?? '';
      _twitterCtrl.text = (d['twitterX'] as String?) ?? '';
      _telegramCtrl.text = (d['telegram'] as String?) ?? '';
      _whatsappBizCtrl.text = (d['whatsappBiz'] as String?) ?? '';

      final restoredCats = ((d['categories'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(
            (c) => CategorySelectionResult(
              id: (c['id'] as num).toInt(),
              name: (c['name'] as String?) ?? '',
              parentName: (c['parentName'] as String?) ?? '',
            ),
          )
          .toList();

      setState(() {
        _phone = (d['phone'] as String?) ?? '';
        _whatsapp = (d['whatsapp'] as String?) ?? '';
        _phoneSeed = _phone;
        _whatsappSeed = _whatsapp;
        _hasDelivery = (d['hasDelivery'] as bool?) ?? false;
        _plenaCoordinacion = (d['plenaCoordinacion'] as bool?) ?? false;
        _acquirePremium = (d['acquirePremium'] as bool?) ?? _acquirePremium;
        _department = d['department'] as String?;
        _province = d['province'] as String?;
        _district = d['district'] as String?;
        if (d['scheduleJson'] is Map) {
          _scheduleJson = Map<String, dynamic>.from(d['scheduleJson'] as Map);
        }
        _primaryCategoryId = (d['primaryCategoryId'] as num?)?.toInt();
        _selectedCategories = restoredCats;
      });

      // 👇 LÓGICA DE RESTAURACIÓN: Abre la Sección 2 si la 1 ya estaba completa.
      if (_isSection1Complete()) {
        setState(() {
          _isSection1Expanded = false;
          _isSection2Expanded = true;
        });
      }

      _showSnack('Recuperamos los datos que habías ingresado.');
    } catch (_) {}
  }

  Future<void> _clearDraft() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_draftKey);
    } catch (_) {}
  }

  // ── Data Loaders & Helpers ───────────────────────

  Future<void> _loadCategories() async {
    final result = await ProvidersRepository().getCategories(
      forType: widget.providerType,
    );
    if (!mounted) return;
    result.when(
      success: (cats) => setState(() => _categories = cats),
      failure: (_) {},
    );
  }

  Future<void> _fetchGpsLocation() async {
    setState(() => _gpsLoading = true);
    final pos = await PermissionService.getCurrentLocation(context);
    if (!mounted) return;
    setState(() {
      _gpsPosition = pos;
      _gpsLoading = false;
    });
    if (pos != null && _addressController.text.trim().isEmpty) {
      final readable = await GeocodingHelper.getAddressFromCoordinates(
        pos.latitude,
        pos.longitude,
      );
      if (!mounted) return;
      _addressController.text =
          readable ??
          '${pos.latitude.toStringAsFixed(6)}, ${pos.longitude.toStringAsFixed(6)}';
    }
    if (pos != null) {
      final geo = await GeocodingService.reverseGeocode(
        pos.latitude,
        pos.longitude,
      );
      if (!mounted || geo == null) return;
      setState(() {
        _department = (_department == null || _department!.isEmpty)
            ? geo.department
            : _department;
        _province = (_province == null || _province!.isEmpty)
            ? geo.province
            : _province;
        _district = (_district == null || _district!.isEmpty)
            ? geo.district
            : _district;
      });
    }
  }

  Future<void> _parseMapsUrl() async {
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
        final latStr = match.group(1)!;
        final lngStr = match.group(2)!;
        final lat = double.parse(latStr);
        final lng = double.parse(lngStr);
        final readable = await GeocodingHelper.getAddressFromCoordinates(
          lat,
          lng,
        );
        if (!mounted) return;
        setState(() {
          _addressController.text = readable ?? '$latStr, $lngStr';
        });
        _showSnack('Coordenadas extraídas correctamente.');
        return;
      }
    }
    _showSnack('No se pudieron extraer coordenadas del enlace.', isError: true);
  }

  Future<void> _pickPhoto() async {
    if (_photos.length >= _maxPhotos) return;
    await _saveDraft();
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (file != null && mounted) {
      setState(() => _photos.add(file));
    }
  }

  void _removePhoto(int index) => setState(() => _photos.removeAt(index));
  void _reorderPhotos(int from, int to) => setState(() {
    final item = _photos.removeAt(from);
    _photos.insert(to, item);
  });

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    if (isError) {
      context.showErrorSnack(msg);
    } else {
      context.showSuccessSnack(msg);
    }
  }

  // ── Validaciones Visuales del Acordeón ───────────
  bool _isSection1Complete() {
    final name = _businessNameController.text.trim();
    final dni = _dniController.text.trim();
    final ruc = _rucController.text.trim();

    if (name.length < 2) return false;
    if (_phone.isEmpty) return false;
    if (!_phone.startsWith('+') && !RegExp(r'^\d{9}$').hasMatch(_phone)) {
      return false;
    }
    if (_isOficio && dni.isNotEmpty && !RegExp(r'^\d{8}$').hasMatch(dni)) {
      return false;
    }
    if (!_isOficio && ruc.isNotEmpty && !RegExp(r'^\d{11}$').hasMatch(ruc)) {
      return false;
    }
    return true;
  }

  bool _isSection2Complete() {
    if (_selectedCategories.isEmpty) return false;
    if (_descriptionController.text.trim().length < 10) return false;
    if (_photos.isEmpty) return false;
    if (!_isOficio && !_hasAdminLocation) return false;
    return true;
  }

  // ── Submit Logic ─────────────────────────────────

  String get _planChoice => _acquirePremium ? 'PREMIUM' : 'ESTANDAR';

  Future<void> _onSubmitPressed() async {
    if (!_validateRequired()) return;
    await _submit(goToPayment: _planChoice == 'PREMIUM');
  }

  bool _validateRequired() {
    final name = _businessNameController.text.trim();
    final description = _descriptionController.text.trim();
    final dni = _dniController.text.trim();
    final ruc = _rucController.text.trim();

    if (name.isEmpty) {
      _showSnack('El nombre es obligatorio.', isError: true);
      return false;
    }
    if (description.length < 10) {
      _showSnack(
        'La descripción es obligatoria (mínimo 10 caracteres).',
        isError: true,
      );
      return false;
    }
    if (_selectedCategories.isEmpty) {
      _showSnack('Selecciona al menos una especialidad.', isError: true);
      return false;
    }
    if (_photos.isEmpty) {
      _showSnack(
        'Sube al menos una foto del servicio o negocio.',
        isError: true,
      );
      return false;
    }
    if (_phone.isEmpty) {
      _showSnack('El teléfono de contacto es obligatorio.', isError: true);
      return false;
    }
    if (!_phone.startsWith('+') && !RegExp(r'^\d{9}$').hasMatch(_phone)) {
      _showSnack(
        'El teléfono debe tener 9 dígitos (número peruano).',
        isError: true,
      );
      return false;
    }
    if (!_isOficio && !_hasAdminLocation) {
      _showSnack(
        'Selecciona tu departamento, provincia y distrito.',
        isError: true,
      );
      return false;
    }
    if (_isOficio && dni.isNotEmpty && !RegExp(r'^\d{8}$').hasMatch(dni)) {
      _showSnack('El DNI debe tener exactamente 8 dígitos.', isError: true);
      return false;
    }
    if (!_isOficio && ruc.isNotEmpty && !RegExp(r'^\d{11}$').hasMatch(ruc)) {
      _showSnack('El RUC debe tener exactamente 11 dígitos.', isError: true);
      return false;
    }
    return true;
  }

  Future<void> _submit({bool goToPayment = false}) async {
    final success = await _performProviderRegistration();
    if (!success) return;

    // PREMIUM con pago: flujo bloqueante (sube fotos + refresh + va a pago).
    // No mostramos el modal de éxito aquí, así que mantenemos el orden previo.
    if (goToPayment) {
      await _handlePhotoUploads();
      if (!mounted) return;
      await _processFinalSteps(goToPayment);
      return;
    }

    // Estándar/Gratis: el backend YA devolvió 200 → mostramos el modal de
    // éxito DE INMEDIATO. Las fotos, el referido y el refresh del estado
    // corren en segundo plano para no demorar la confirmación al proveedor.
    if (!mounted) return;
    setState(() => _isLoading = false);
    final auth = context.read<AuthProvider>();
    _showSuccessDialog();
    unawaited(_finishRegistrationInBackground(auth));
  }

  /// Tareas post-registro que NO deben bloquear el modal de éxito. Recibe el
  /// [auth] capturado mientras el widget estaba montado (evita usar `context`
  /// tras un eventual pop del formulario al aceptar el modal).
  Future<void> _finishRegistrationInBackground(AuthProvider auth) async {
    final refCode = _referralCodeCtrl.text.trim();
    if (refCode.isNotEmpty) {
      try {
        await ReferralsRepository().applyCode(refCode);
      } catch (_) {
        // Código ya usado / inválido — no debe romper el registro.
      }
    }
    await _handlePhotoUploads();
    await auth.refreshProviderStatus();
    if (_hasAdminLocation) {
      auth.updateLocation(
        department: _department!,
        province: _province!,
        district: _district!,
      );
    }
  }

  Future<bool> _performProviderRegistration() async {
    if (!_validateRequired()) return false;

    final name = _businessNameController.text.trim();
    final dni = _dniController.text.trim();
    final ruc = _rucController.text.trim();

    setState(() => _isLoading = true);

    final auth = context.read<AuthProvider>();
    final result = await auth.registerProvider(
      businessName: name,
      phone: _phone,
      whatsapp: _whatsapp,
      type: widget.providerType ?? 'OFICIO',
      dni: _isOficio && dni.isNotEmpty ? dni : null,
      ruc: !_isOficio && ruc.isNotEmpty ? ruc : null,
      hasDelivery: !_isOficio ? _hasDelivery : false,
      plenaCoordinacion: !_isOficio ? _plenaCoordinacion : false,
      hasHomeService: _isOficio ? _hasDelivery : false,
      description: _descriptionController.text.trim(),
      address: _addressController.text.trim(),
      categoryIds: _selectedCategories.isEmpty
          ? null
          : _selectedCategories.map((e) => e.id).toList(),
      primaryCategoryId: _primaryCategoryId,
      department: _department,
      province: _province,
      district: _district,
      scheduleJson: !_isOficio && _scheduleJson.isNotEmpty
          ? _scheduleJson
          : null,
      website: _websiteCtrl.text.trim().isEmpty
          ? null
          : _websiteCtrl.text.trim(),
      instagram: _instagramCtrl.text.trim().isEmpty
          ? null
          : _instagramCtrl.text.trim(),
      tiktok: _tiktokCtrl.text.trim().isEmpty ? null : _tiktokCtrl.text.trim(),
      facebook: _facebookCtrl.text.trim().isEmpty
          ? null
          : _facebookCtrl.text.trim(),
      linkedin: _linkedinCtrl.text.trim().isEmpty
          ? null
          : _linkedinCtrl.text.trim(),
      twitterX: _twitterCtrl.text.trim().isEmpty
          ? null
          : _twitterCtrl.text.trim(),
      telegram: _telegramCtrl.text.trim().isEmpty
          ? null
          : _telegramCtrl.text.trim(),
      whatsappBiz: _whatsappBizCtrl.text.trim().isEmpty
          ? null
          : _whatsappBizCtrl.text.trim(),
    );

    if (!mounted) return false;

    if (!result) {
      setState(() => _isLoading = false);
      _showSnack(auth.error ?? 'Error al crear el perfil', isError: true);
      return false;
    }
    await _clearDraft();
    return true;
  }

  Future<void> _handlePhotoUploads() async {
    if (_photos.isEmpty) return;

    final repo = DashboardRepository();
    int uploadErrors = 0;
    for (int i = 0; i < _photos.length; i++) {
      final photo = _photos[i];
      try {
        final url = await repo.uploadProviderPhotoFile(photo);
        await repo.saveProviderImage(
          url,
          type: widget.providerType,
          isCover: i == 0,
        );
      } catch (e) {
        uploadErrors++;
      }
    }
    if (!mounted) return;
    if (uploadErrors > 0 && uploadErrors < _photos.length) {
      _showSnack(
        'Algunas fotos no se subieron. Puedes agregarlas desde el panel.',
      );
    } else if (uploadErrors == _photos.length) {
      _showSnack(
        'No se pudieron subir las fotos. Agrégalas desde tu panel.',
        isError: true,
      );
    }
  }

  Future<void> _processFinalSteps(bool goToPayment) async {
    final auth = context.read<AuthProvider>();

    final refCode = _referralCodeCtrl.text.trim();
    if (refCode.isNotEmpty) {
      try {
        await ReferralsRepository().applyCode(refCode);
        if (!mounted) return;
        _showSnack('Código de referido aplicado.');
      } catch (e) {
        if (!mounted) return;
        _showSnack(
          'No pudimos aplicar el código de referido porque ya lo has utilizado anteriormente.',
          isError: true,
        );
      }
    }

    await auth.refreshProviderStatus();
    if (!mounted) return;

    if (_hasAdminLocation) {
      auth.updateLocation(
        department: _department!,
        province: _province!,
        district: _district!,
      );
    }

    setState(() => _isLoading = false);

    if (goToPayment && _planChoice == 'PREMIUM') {
      final method = await PlanChoiceSheet.show(context);
      if (!mounted) return;
      if (method == 'yape') {
        await _goToYapeFlow('PREMIUM');
        return;
      }
      if (method == 'mercadopago') {
        await _goToMercadoPagoFlow('PREMIUM');
        return;
      }
      _showSuccessDialog();
      return;
    }

    _showSuccessDialog();
  }

  Future<void> _goToYapeFlow(String plan) async {
    if (!mounted) return;
    final auth = context.read<AuthProvider>();
    await YapePaymentScreen.show(
      context,
      plan: plan,
      providerType: widget.providerType ?? 'OFICIO',
    );
    if (!mounted) return;
    auth.completeOnboarding(role: widget.providerType ?? 'OFICIO');
    if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
  }

  Future<void> _goToMercadoPagoFlow(String plan) async {
    final auth = context.read<AuthProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final pay = PaymentsProvider();
    await pay.payWithMercadoPago(
      plan: plan,
      providerType: widget.providerType ?? 'OFICIO',
    );
    if (!mounted) return;
    final url = pay.mpInitPoint;
    if (url != null) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } else {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            pay.error ?? 'No se pudo iniciar el pago con MercadoPago',
          ),
        ),
      );
    }
    if (!mounted) return;
    auth.completeOnboarding(role: widget.providerType ?? 'OFICIO');
    if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
  }

  void _showSuccessDialog() {
    final auth = context.read<AuthProvider>();
    RegistrationSuccessDialog.show(
      context,
      isNegocio: !_isOficio,
      onAccept: () {
        auth.completeOnboarding(role: widget.providerType ?? 'OFICIO');
        if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
      },
    );
  }

  // ── Widget Acordeón Reutilizable ─────────────────────────
  Widget _buildSection({
    required String title,
    required bool isExpanded,
    required bool isComplete,
    required VoidCallback onToggle,
    required List<Widget> children,
  }) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          width: 0.5,
          color: isComplete
              ? AppColors.available.withValues(alpha: 0.4)
              : c.border,
        ),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: onToggle,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  if (isComplete)
                    Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: Icon(
                        Icons.check_circle,
                        size: 18,
                        color: AppColors.available,
                      ),
                    ),
                  AnimatedRotation(
                    turns: isExpanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 300),
                    child: Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: c.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: isExpanded
                ? Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: children,
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  // ── Build Orchestator ────────────────────────────
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (widget.providerType != null) ...[
                TypeBadge(isOficio: _isOficio),
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

              // ── SECCIÓN 1: INFORMACIÓN BÁSICA ───────────────────
              _buildSection(
                title: 'Información Básica',
                isExpanded: _isSection1Expanded,
                isComplete: _isSection1Complete(),
                onToggle: () => setState(() {
                  _isSection1Expanded = !_isSection1Expanded;
                  if (_isSection1Expanded) _isSection2Expanded = false;
                }),
                children: [
                  FormFieldTile(
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
                  if (_isOficio) ...[
                    FormFieldTile(
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
                    FormFieldTile(
                      controller: _rucController,
                      label: 'RUC (opcional)',
                      hint: '20123456789',
                      icon: Icons.receipt_long_outlined,
                      keyboardType: TextInputType.number,
                      maxLength: 11,
                    ),
                    const SizedBox(height: 14),
                  ],
                  PhoneInputSection(
                    key: ValueKey('phone-$_phoneSeed-$_whatsappSeed'),
                    initialPhone: _phoneSeed.isEmpty ? null : _phoneSeed,
                    initialWhatsapp: _whatsappSeed.isEmpty
                        ? null
                        : _whatsappSeed,
                    onChange: (phone, wap) => setState(() {
                      _phone = phone;
                      _whatsapp = wap ?? '';
                    }),
                  ),
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {
                        if (_isSection1Complete()) {
                          setState(() {
                            _isSection1Expanded = false;
                            _isSection2Expanded = true;
                          });
                        } else {
                          _showSnack(
                            'Completa los campos obligatorios para continuar.',
                            isError: true,
                          );
                        }
                      },
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Continuar',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.arrow_forward_rounded,
                            size: 18,
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              // ── SECCIÓN 2: DETALLES DEL SERVICIO ────────────────
              _buildSection(
                title: 'Detalles del Servicio',
                isExpanded: _isSection2Expanded,
                isComplete: _isSection2Complete(),
                onToggle: () => setState(() {
                  _isSection2Expanded = !_isSection2Expanded;
                  if (_isSection2Expanded) _isSection1Expanded = false;
                }),
                children: [
                  if (!_isOficio) ...[
                    OnboardingAddressSection(
                      addressController: _addressController,
                      mapsUrlController: _mapsUrlController,
                      showAddressSection: _showAddressSection,
                      gpsLoading: _gpsLoading,
                      gpsPosition: _gpsPosition,
                      onToggleSection: () => setState(
                        () => _showAddressSection = !_showAddressSection,
                      ),
                      onFetchGps: _fetchGpsLocation,
                      onClearGps: () => setState(() {
                        _gpsPosition = null;
                        _addressController.clear();
                      }),
                      onParseMapsUrl: _parseMapsUrl,
                    ),
                    const SizedBox(height: 14),
                  ],
                  OnboardingCategorySection(
                    providerType: widget.providerType,
                    categories: _categories,
                    selected: _selectedCategories,
                    primaryCategoryId: _primaryCategoryId,
                    maxCategories: PlanLimits.specialties(_planChoice),
                    onChanged: (sel, primary) => setState(() {
                      _selectedCategories = sel;
                      _primaryCategoryId = primary;
                    }),
                  ),
                  const SizedBox(height: 14),
                  FormFieldTile(
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
                  const SizedBox(height: 14),
                  OnboardingDeliverySection(
                    isOficio: _isOficio,
                    hasDelivery: _hasDelivery,
                    plenaCoordinacion: _plenaCoordinacion,
                    onDeliveryChanged: (v) => setState(() => _hasDelivery = v),
                    onPlenaChanged: (v) =>
                        setState(() => _plenaCoordinacion = v),
                  ),
                  const SizedBox(height: 14),
                  if (!_isOficio) ...[
                    CollapsibleSchedule(
                      scheduleJson: _scheduleJson,
                      onSave: (s) => setState(() => _scheduleJson = s),
                    ),
                    const SizedBox(height: 14),
                  ],
                  GestureDetector(
                    onTap: () async {
                      final locSection = OnboardingLocationSection(
                        department: _department,
                        province: _province,
                        district: _district,
                      );
                      final result = await locSection.showPicker(context);
                      if (result != null && mounted) {
                        setState(() {
                          _department = result.department;
                          _province = result.province;
                          _district = result.district;
                        });
                      }
                    },
                    child: OnboardingLocationSection(
                      department: _department,
                      province: _province,
                      district: _district,
                    ),
                  ),
                  const SizedBox(height: 14),
                  OnboardingSocialSection(
                    websiteCtrl: _websiteCtrl,
                    instagramCtrl: _instagramCtrl,
                    tiktokCtrl: _tiktokCtrl,
                    facebookCtrl: _facebookCtrl,
                    linkedinCtrl: _linkedinCtrl,
                    twitterCtrl: _twitterCtrl,
                    telegramCtrl: _telegramCtrl,
                    whatsappBizCtrl: _whatsappBizCtrl,
                    isNegocio: !_isOficio,
                  ),
                  const SizedBox(height: 14),
                  OnboardingPhotoSection(
                    photos: _photos,
                    maxPhotos: _maxPhotos,
                    onPickPhoto: _pickPhoto,
                    onRemovePhoto: _removePhoto,
                    onReorderPhotos: _reorderPhotos,
                  ),
                ],
              ),

              const SizedBox(height: 28),

              // ── CÓDIGO REFERIDO ─────────────────────
              const FormSectionHeader(label: 'CÓDIGO DE REFERIDO (OPCIONAL)'),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: c.bgInput,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    width: 0.5,
                    color: AppColors.primary.withValues(alpha: 0.25),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.card_giftcard_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
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
              const SizedBox(height: 28),

              // ── PLAN DE SUSCRIPCIÓN ─────────────────
              const FormSectionHeader(label: 'PLAN DE SUSCRIPCIÓN'),
              const SizedBox(height: 8),
              OnboardingPlanSection(
                acquirePremium: _acquirePremium,
                onToggle: () =>
                    setState(() => _acquirePremium = !_acquirePremium),
              ),
              const SizedBox(height: 32),

              // ── BOTONES DE ACCIÓN ───────────────────
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _onSubmitPressed,
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
                      : Text(
                          _acquirePremium
                              ? 'Continuar al pago Premium'
                              : (_isOficio
                                    ? 'Registrarme como profesional'
                                    : 'Registrarme como negocio'),
                          style: const TextStyle(
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
                    _clearDraft();
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
      ),
    );
  }
}
