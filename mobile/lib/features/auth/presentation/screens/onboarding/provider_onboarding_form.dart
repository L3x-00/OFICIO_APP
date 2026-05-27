import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
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
import 'widgets/plan_choice_sheet.dart';
import 'widgets/registration_success_dialog.dart';

class ProviderOnboardingForm extends StatefulWidget {
  final String? providerType;
  final bool isStandalone;
  final Map<String, dynamic>? initialData;

  /// Plan elegido en [OnboardingPlansSheet] antes de entrar al formulario.
  /// Determina el flujo de submit: si es GRATIS se registra directo; si es
  /// pagado, se ofrece "Adquirir plan" (→ Yape) o "Registrarme con plan
  /// gratis" (registro normal). Si llega null, se asume GRATIS.
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

class _ProviderOnboardingFormState extends State<ProviderOnboardingForm> {
  // ── Controllers ─────────────────────────────────────────
  final _businessNameController = TextEditingController();
  final _dniController = TextEditingController();
  final _rucController = TextEditingController();
  // Nota: "Nombre Comercial" y "Razón Social" se eliminaron del formulario.
  // El backend los infiere durante la validación de identidad/SUNAT así que
  // pedirlos aquí era redundante y confundía a los usuarios.
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

  /// `true` cuando el usuario opta por el plan Premium (de pago). Se
  /// inicializa desde `widget.selectedPlan` y el usuario puede activarlo
  /// dentro del formulario con la opción bajo el código de referido.
  bool _acquirePremium = false;

  Position? _gpsPosition;
  String? _department;
  String? _province;
  String? _district;
  // Especialidades elegidas (multi-select, máx 3) + la principal.
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
    _loadCategories();
    // Plan preseleccionado en la pantalla "Únete" (tarjeta Premium).
    _acquirePremium = widget.selectedPlan == 'PREMIUM';

    // UX solicitada: los campos de ubicación arrancan VACÍOS en el
    // formulario de registro para que el user provider los rellene
    // explícitamente. Antes se pre-completaban con auth.user.* lo cual
    // forzaba al user a borrar antes de cambiar.

    if (widget.initialData != null) {
      final d = widget.initialData!;
      _businessNameController.text = d['businessName'] ?? '';
      _descriptionController.text = d['description'] ?? '';
      _addressController.text = d['address'] ?? '';
      _dniController.text = d['dni'] ?? '';
      _rucController.text = d['ruc'] ?? '';
      // Teléfono y whatsapp viven en state (no TextEditingController)
      // porque los maneja `PhoneInputSection` por callback. Pre-llenar
      // antes del primer build asegura que el widget arranca con esos
      // valores (defaultPhone se le pasa en build).
      _phone = (d['phone'] as String?) ?? '';
      _whatsapp = (d['whatsapp'] as String?) ?? '';

      // Flags de delivery / domicilio (negocio + oficio).
      _hasDelivery = (d['hasDelivery'] as bool?) ?? false;
      _plenaCoordinacion = (d['plenaCoordinacion'] as bool?) ?? false;
      // El backend usa `hasHomeService` para el toggle de oficios; en el
      // form se reusa `_hasDelivery` para ambos perfiles según su tipo.
      // Si el preview viene de un perfil OFICIO, leemos hasHomeService.
      if (d['hasHomeService'] == true) _hasDelivery = true;

      if (d['scheduleJson'] is Map<String, dynamic>) {
        _scheduleJson = Map<String, dynamic>.from(d['scheduleJson'] as Map);
      }

      // Redes sociales — todas opcionales; el backend las guarda nulas
      // si no se completaron antes.
      _websiteCtrl.text = (d['website'] as String?) ?? '';
      _instagramCtrl.text = (d['instagram'] as String?) ?? '';
      _tiktokCtrl.text = (d['tiktok'] as String?) ?? '';
      _facebookCtrl.text = (d['facebook'] as String?) ?? '';
      _linkedinCtrl.text = (d['linkedin'] as String?) ?? '';
      _twitterCtrl.text = (d['twitterX'] as String?) ?? '';
      _telegramCtrl.text = (d['telegram'] as String?) ?? '';
      _whatsappBizCtrl.text = (d['whatsappBiz'] as String?) ?? '';

      // Categorías pre-seleccionadas — el backend devuelve la lista
      // expandida en `categories: [{id, name, slug, parentId}]`. Sólo
      // pasamos los `id` al `OnboardingCategorySection` vía
      // `_selectedCategories`; el resto se hidrata cuando termina
      // `_loadCategories()` (que carga el catálogo completo). El
      // `primaryCategoryId` toma la primera del backend si existe.
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
    }
  }

  @override
  void dispose() {
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

  // ── Data Loaders & Helpers ───────────────────────────────

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
      // Geocoding inverso: convertir lat/lng en dirección legible
      // ("Jr. Domingo Ríos, El Tambo"). Si falla la red o no hay match,
      // caemos al string de coordenadas para no dejar el campo vacío.
      // Las coords reales (`_gpsPosition`) NO se tocan — el mapa y el
      // PostGIS del backend siguen usando lat/lng intactas.
      final readable = await GeocodingHelper.getAddressFromCoordinates(
        pos.latitude,
        pos.longitude,
      );
      if (!mounted) return;
      _addressController.text =
          readable ??
          '${pos.latitude.toStringAsFixed(6)}, ${pos.longitude.toStringAsFixed(6)}';
    }
    // Reverse geocoding: rellena departamento/provincia/distrito a
    // partir de las coordenadas. Solo escribe sobre campos vacíos
    // para no pisar lo que el user ya rellenó manualmente.
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
        // Geocoding inverso: si el helper devuelve un nombre legible,
        // lo usamos como `address`; si falla, caemos al string de
        // coordenadas (comportamiento original) para no romper el
        // flujo. Las coords reales viajan separadas via lat/lng.
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

  // ── Submit Logic ─────────────────────────────────────────

  /// Plan efectivo del registro. ESTANDAR es el plan de cortesía por
  /// defecto (gratis 1 mes); PREMIUM activa el flujo de pago. Se
  /// controla con la opción "Adquirir plan Premium" del formulario,
  /// preinicializada desde `widget.selectedPlan`.
  String get _planChoice => _acquirePremium ? 'PREMIUM' : 'ESTANDAR';

  /// Entry point del botón "Registrarme como profesional/negocio".
  ///
  /// Lógica consolidada:
  ///   - ESTÁNDAR (bienvenida gratis) → registro directo para
  ///     aprobación. El admin lo revisa; no hay pasarela de pago.
  ///   - PREMIUM → registro y luego flujo de pago (MercadoPago / Yape).
  /// El selector de método de pago se muestra en `_processFinalSteps`,
  /// después de que el perfil ya existe en el backend.
  Future<void> _onSubmitPressed() async {
    if (!_validateRequired()) return;
    await _submit(goToPayment: _planChoice == 'PREMIUM');
  }

  /// Valida los campos obligatorios. Devuelve `true` si todo OK.
  /// Reglas (front + backend coinciden):
  ///   - businessName: requerido, ≥ 2 caracteres.
  ///   - description: requerido, ≥ 10 caracteres (texto significativo).
  ///   - categoría: requerido (al menos una).
  ///   - fotos: al menos 1.
  ///   - teléfono: 9 dígitos peruanos o internacional.
  ///   - ubicación: requerida para NEGOCIO.
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

  /// Entry point del submit. Orquesta:
  ///   1. Registro (provider en backend) — corta si falla.
  ///   2. Subida de fotos (best-effort, no bloquea).
  ///   3. Pasos finales (referral, refresh, location, pago o diálogo).
  Future<void> _submit({bool goToPayment = false}) async {
    final success = await _performProviderRegistration();
    if (!success) return;

    await _handlePhotoUploads();
    if (!mounted) return;

    await _processFinalSteps(goToPayment);
  }

  /// Valida → llama a `registerProvider` con el payload completo.
  /// Devuelve true si el backend creó el perfil; false si hubo error
  /// (ya muestra el snack y resetea `_isLoading`).
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
      // Independiente de hasDelivery — antes solo se enviaba si el otro
      // toggle estaba activo. Ahora ambos viajan por separado y la
      // tarjeta los muestra individualmente.
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
    return true;
  }

  /// Sube las fotos seleccionadas. La primera se marca como cover. Es
  /// best-effort: errores parciales o totales solo muestran snack — no
  /// bloquean el flujo (el usuario puede re-subirlas desde el panel).
  /// No toca `_isLoading` (lo gestiona `_processFinalSteps`).
  Future<void> _handlePhotoUploads() async {
    if (_photos.isEmpty) return;

    final repo = DashboardRepository();
    int uploadErrors = 0;
    debugPrint(
      '[Onboarding] Subiendo ${_photos.length} foto(s) para tipo=${widget.providerType}',
    );
    for (int i = 0; i < _photos.length; i++) {
      final photo = _photos[i];
      try {
        debugPrint(
          '[Onboarding] Foto ${i + 1}/${_photos.length}: ${photo.name} (${photo.path})',
        );
        final url = await repo.uploadProviderPhotoFile(photo);
        debugPrint('[Onboarding] URL obtenida: $url');
        // La primera foto se marca como cover explícitamente para que la
        // tarjeta del perfil tenga foto garantizada en cuanto se apruebe
        // el proveedor — sin depender del fallback `existingCount===0`
        // del backend.
        await repo.saveProviderImage(
          url,
          type: widget.providerType,
          isCover: i == 0,
        );
        debugPrint('[Onboarding] Foto ${i + 1} guardada en el perfil');
      } catch (e, st) {
        uploadErrors++;
        debugPrint('[Onboarding] ERROR foto ${i + 1}: $e\n$st');
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

  /// Pasos finales tras el registro + fotos: referral, refresh del
  /// estado, persistir ubicación y decidir flujo de cierre (pago o
  /// diálogo de éxito).
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
          'No pudimos aplicar el código de referido porque ya lo has utilizado anteriormente desde este usuario.',
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

    // PREMIUM: el perfil ya está creado en el backend. Preguntamos el
    // método de pago (MercadoPago tarjeta/billetera o Yape comprobante)
    // y lanzamos el flujo correspondiente. La suscripción Premium se
    // activa cuando se confirma el pago; el perfil queda "en revisión".
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
      // El usuario cerró el selector sin elegir: el perfil igual quedó
      // creado, así que cerramos con el diálogo de "en revisión".
      _showSuccessDialog();
      return;
    }

    // ESTÁNDAR de bienvenida → diálogo "tu perfil está siendo revisado".
    _showSuccessDialog();
  }

  /// Flujo de pago con Yape — pantalla de comprobante ya estructurada.
  /// Al volver (pagó o canceló) finalizamos el onboarding. Si el user
  /// canceló sin enviar comprobante, el perfil ya quedó creado en
  /// PENDIENTE y al ser aprobado recibe automáticamente el plan
  /// Estándar de bienvenida — no hace falta nada extra.
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

  /// Flujo de pago con MercadoPago — crea la preferencia y abre el
  /// checkout en el navegador externo. El webhook del backend activa la
  /// suscripción cuando el pago se aprueba.
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

  // ── Sección de plan (bajo el código de referido) ─────────

  /// Bloque de selección de plan: informa la cortesía del plan Estándar
  /// gratis y ofrece la opción interactiva de adquirir el plan Premium.
  /// Al activar Premium, el submit dispara el flujo de pago.
  Widget _buildPlanSection(AppThemeColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Cortesía: Estándar gratis 1 mes.
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.available.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppColors.available.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.card_giftcard_rounded,
                color: AppColors.available,
                size: 18,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Tu registro incluye el plan Estándar GRATIS durante '
                  '1 mes de bienvenida.',
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 11.5,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        // Opción interactiva: adquirir Premium.
        GestureDetector(
          onTap: () => setState(() => _acquirePremium = !_acquirePremium),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _acquirePremium
                  ? AppColors.premium.withValues(alpha: 0.10)
                  : c.bgInput,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _acquirePremium ? AppColors.premium : c.border,
                width: _acquirePremium ? 1.5 : 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      _acquirePremium
                          ? Icons.check_circle_rounded
                          : Icons.radio_button_unchecked_rounded,
                      color: _acquirePremium ? AppColors.premium : c.textMuted,
                      size: 22,
                    ),
                    const SizedBox(width: 10),
                    const Icon(
                      Icons.workspace_premium_rounded,
                      color: AppColors.premium,
                      size: 18,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Adquirir plan Premium',
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const Text(
                      'S/ 39.90/mes',
                      style: TextStyle(
                        color: AppColors.premium,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  _acquirePremium
                      ? 'Al finalizar el registro elegirás cómo pagar '
                            '(Yape o MercadoPago). Tu perfil quedará en '
                            'revisión mientras validamos el pago.'
                      : 'Posición #1 garantizada, soporte prioritario, '
                            'análisis de clientes y panel avanzado. Actívalo '
                            'para pasar al pago al finalizar el registro.',
                  style: TextStyle(
                    color: c.textMuted,
                    fontSize: 11.5,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ── Build Orchestator ────────────────────────────────────

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

            // ── INFORMACIÓN BÁSICA ───────────────────
            const FormSectionHeader(label: 'INFORMACIÓN BÁSICA'),
            const SizedBox(height: 12),

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
              // Nombre Comercial y Razón Social se eliminaron: el backend los
              // toma de SUNAT durante la validación de identidad, así que
              // pedirlos aquí era redundante.
            ],

            PhoneInputSection(
              onChange: (phone, wap) => setState(() {
                _phone = phone;
                _whatsapp = wap ?? '';
              }),
            ),
            const SizedBox(height: 14),

            if (!_isOficio) ...[
              OnboardingAddressSection(
                addressController: _addressController,
                mapsUrlController: _mapsUrlController,
                showAddressSection: _showAddressSection,
                gpsLoading: _gpsLoading,
                gpsPosition: _gpsPosition,
                onToggleSection: () =>
                    setState(() => _showAddressSection = !_showAddressSection),
                onFetchGps: _fetchGpsLocation,
                onClearGps: () => setState(() {
                  _gpsPosition = null;
                  _addressController.clear();
                }),
                onParseMapsUrl: _parseMapsUrl,
              ),
              const SizedBox(height: 14),
            ],

            // ── CATEGORÍA / TIPO DE NEGOCIO ──────────
            FormSectionHeader(
              label: _isOficio ? 'CATEGORÍA DEL SERVICIO' : 'TIPO DE NEGOCIO',
            ),
            const SizedBox(height: 12),
            OnboardingCategorySection(
              providerType: widget.providerType,
              categories: _categories,
              selected: _selectedCategories,
              primaryCategoryId: _primaryCategoryId,
              // Premium puede elegir hasta 6 especialidades; el resto, 3.
              maxCategories: PlanLimits.specialties(_planChoice),
              onChanged: (sel, primary) => setState(() {
                _selectedCategories = sel;
                _primaryCategoryId = primary;
              }),
            ),
            const SizedBox(height: 24),

            // ── DESCRIPCIÓN ──────────────────────────
            const FormSectionHeader(label: 'DESCRIPCIÓN'),
            const SizedBox(height: 12),
            FormFieldTile(
              controller: _descriptionController,
              label: _isOficio ? 'Describe tu servicio' : 'Describe tu negocio',
              hint: _isOficio
                  ? 'Experiencia, especialidades, horario de trabajo...'
                  : 'Qué ofreces, horarios, especialidades...',
              icon: Icons.description_outlined,
              maxLines: 4,
            ),
            const SizedBox(height: 24),

            // ── DOMICILIO / DELIVERY ─────────────────
            FormSectionHeader(
              label: _isOficio
                  ? 'SERVICIOS A DOMICILIO'
                  : 'SERVICIO DE DELIVERY',
            ),
            const SizedBox(height: 12),
            OnboardingDeliverySection(
              isOficio: _isOficio,
              hasDelivery: _hasDelivery,
              plenaCoordinacion: _plenaCoordinacion,
              onDeliveryChanged: (v) => setState(() => _hasDelivery = v),
              onPlenaChanged: (v) => setState(() => _plenaCoordinacion = v),
            ),
            const SizedBox(height: 24),

            if (!_isOficio) ...[
              CollapsibleSchedule(
                scheduleJson: _scheduleJson,
                onSave: (s) => setState(() => _scheduleJson = s),
              ),
              const SizedBox(height: 24),
            ],

            // ── UBICACIÓN ────────────────────────────
            FormSectionHeader(
              label: _isOficio ? 'TU UBICACIÓN (opcional)' : 'TU UBICACIÓN *',
            ),
            const SizedBox(height: 12),
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
            const SizedBox(height: 24),

            // ── REDES SOCIALES ──────────────────────
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
            const SizedBox(height: 24),

            // ── FOTOS ───────────────────────────────
            const FormSectionHeader(label: 'FOTOS DEL SERVICIO'),
            const SizedBox(height: 12),
            OnboardingPhotoSection(
              photos: _photos,
              maxPhotos: _maxPhotos,
              onPickPhoto: _pickPhoto,
              onRemovePhoto: _removePhoto,
              onReorderPhotos: _reorderPhotos,
            ),
            const SizedBox(height: 32),

            // ── CÓDIGO REFERIDO ─────────────────────
            const FormSectionHeader(label: 'CÓDIGO DE REFERIDO (OPCIONAL)'),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: c.bgInput,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
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
            _buildPlanSection(c),
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
