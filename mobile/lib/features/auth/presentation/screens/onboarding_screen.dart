import 'dart:io';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/utils/permission_service.dart';
import 'package:mobile/core/utils/plan_limits.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/auth_provider.dart';
import '../../../provider_dashboard/data/dashboard_repository.dart';
import '../../../providers_list/data/providers_repository.dart';
import '../../../providers_list/presentation/providers/providers_provider.dart';
import '../../../../core/errors/failures.dart';
import '../../../../shared/widgets/location_picker_sheet.dart';
import '../../../../shared/widgets/phone_input_section.dart';
import '../../../../shared/widgets/schedule_editor.dart';

/// Se muestra la primera vez que el usuario se registra
/// para elegir qué tipo de perfil quiere crear
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  String? _selectedRole; // 'USUARIO', 'OFICIO', 'NEGOCIO'
  bool _isNavigating = false; // guard contra doble ejecución

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
                style: TextStyle(color: c.textSecondary, fontSize: 15),
              ),
              const SizedBox(height: 36),

              // Opciones
              _RoleOption(
                icon: Icons.search_rounded,
                title: 'Soy cliente',
                subtitle:
                    'Busco, comparo y contrato profesionales o negocios en mi zona.',
                roleValue: 'USUARIO',
                isSelected: _selectedRole == 'USUARIO',
                onTap: () => setState(() => _selectedRole = 'USUARIO'),
              ),
              const SizedBox(height: 14),
              _RoleOption(
                icon: Icons.handyman_rounded,
                title: 'Soy profesional',
                subtitle:
                    'Ofrezco mis servicios como independiente y quiero conseguir más clientes.',
                roleValue: 'OFICIO',
                isSelected: _selectedRole == 'OFICIO',
                onTap: () => _goToProviderForm('OFICIO'),
              ),
              const SizedBox(height: 14),
              _RoleOption(
                icon: Icons.storefront_rounded,
                title: 'Tengo un negocio',
                subtitle:
                    'Promociono mi establecimiento y llego a más personas en mi ciudad.',
                roleValue: 'NEGOCIO',
                isSelected: _selectedRole == 'NEGOCIO',
                onTap: () => _goToProviderForm('NEGOCIO'),
              ),

              const Spacer(),

              // Botón continuar
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: (_selectedRole == null || _isNavigating) ? null : _continue,
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

  Future<void> _continue() async {
    if (_isNavigating) return;
    setState(() => _isNavigating = true);

    if (_selectedRole == 'USUARIO') {
      final result = await LocationPickerSheet.show(context);
      if (!mounted) return;
      if (result != null) {
        context.read<AuthProvider>().updateLocation(
          department: result.department,
          province:   result.province,
          district:   result.district,
        ).then((_) {
          if (mounted) {
            context.read<ProvidersProvider>().setUserLocation(
              department: result.department,
              province:   result.province,
              district:   result.district,
            );
          }
        });
      }
    }
    if (!mounted) return;
    // _AppRoot reconstruye desde OnboardingScreen → _MainNavigation al cambiar navigationState.
    context.read<AuthProvider>().completeOnboarding(role: _selectedRole!);
  }

  /// Muestra comparativa de planes y luego navega al formulario de proveedor.
  void _goToProviderForm(String type) {
    setState(() => _selectedRole = type);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _OnboardingPlansSheet(
        providerType: type,
        onContinue: () {
          Navigator.pop(context); // cierra el sheet
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ProviderOnboardingForm(providerType: type),
            ),
          );
        },
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
          color: isSelected ? AppColors.primary.withValues(alpha: 0.1) : c.bgCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected ? AppColors.primary.withValues(alpha: 0.6) : c.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withValues(alpha: 0.2)
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
                      color: isSelected ? c.textPrimary : c.textSecondary,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: TextStyle(color: c.textMuted, fontSize: 12),
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
  /// Pre-fill data for re-registration after rejection
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
  final _businessNameController    = TextEditingController();
  final _dniController             = TextEditingController();
  final _phoneController           = TextEditingController(); // kept for backward compat
  final _descriptionController     = TextEditingController();
  // Phone/WhatsApp managed by PhoneInputSection
  String _phone    = '';
  String? _whatsapp;
  final _addressController         = TextEditingController();
  // NEGOCIO-only
  final _rucController             = TextEditingController();
  final _nombreComercialController = TextEditingController();
  final _razonSocialController     = TextEditingController();
  bool _hasDelivery       = false;
  bool _plenaCoordinacion = false;
  Map<String, dynamic> _scheduleJson = {};

  final List<XFile> _photos = [];
  final _picker = ImagePicker();
  bool _isLoading = false;

  // ─── Categoría ────────────────────────────────────────────
  List<CategoryModel> _categories = [];   // árbol completo (padres + hijos)
  int?   _selectedCategoryId;             // id de la hoja seleccionada
  String _selectedCategoryName = 'Selecciona una categoría';
  int?   _selectedParentId;               // para mostrar breadcrumb
  String _selectedParentName = '';

  // ─── Redes sociales (opcionales, colapsables) ────────────
  bool _socialExpanded = false;
  final _websiteCtrl    = TextEditingController();
  final _instagramCtrl  = TextEditingController();
  final _tiktokCtrl     = TextEditingController();
  final _facebookCtrl   = TextEditingController();
  final _linkedinCtrl   = TextEditingController();
  final _twitterCtrl    = TextEditingController();
  final _telegramCtrl   = TextEditingController();
  final _whatsappBizCtrl = TextEditingController();

  // ─── Ubicación GPS / URL Maps ─────────────────────────────
  final _mapsUrlController = TextEditingController();
  Position? _gpsPosition;
  bool      _gpsLoading = false;

  // ─── Ubicación administrativa (departamento / provincia / distrito) ───
  String? _department;
  String? _province;
  String? _district;
  bool get _hasAdminLocation => _department != null && _province != null && _district != null;

  // ─── Toggle: mostrar sección dirección/GPS/Maps ───────────
  bool _showAddressSection = false;

  // Plan Gratis durante el registro: máximo 3 fotos (PlanLimits.photos('GRATIS'))
  static const _maxPhotos = 3;
  static const _maxMB = 5;

  @override
  void initState() {
    super.initState();
    _loadCategories();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      // Always pre-fill location from user profile
      final user = context.read<AuthProvider>().user;
      if (user != null && user.hasLocation) {
        _department = user.department;
        _province   = user.province;
        _district   = user.district;
      }

      final d = widget.initialData;
      if (d != null) {
        setState(() {
          _businessNameController.text    = d['businessName'] as String? ?? '';
          _descriptionController.text     = d['description']  as String? ?? '';
          _dniController.text             = d['dni']          as String? ?? '';
          _addressController.text         = d['address']      as String? ?? '';
          _rucController.text             = d['ruc']          as String? ?? '';
          _nombreComercialController.text = d['nombreComercial'] as String? ?? '';
          _razonSocialController.text     = d['razonSocial']  as String? ?? '';
          _phone                          = d['phone']        as String? ?? '';
          _whatsapp                       = d['whatsapp']     as String?;
          _hasDelivery                    = d['hasDelivery']  as bool? ?? false;
          _plenaCoordinacion              = d['plenaCoordinacion'] as bool? ?? false;
          final sched = d['scheduleJson'];
          if (sched is Map) _scheduleJson = Map<String, dynamic>.from(sched);
          final catId = d['categoryId'] as int?;
          if (catId != null) {
            _selectedCategoryId   = catId;
            _selectedCategoryName = d['categoryName'] as String? ?? 'Categoría seleccionada';
            _selectedParentId     = d['parentCategoryId'] as int?;
            _selectedParentName   = d['parentCategoryName'] as String? ?? '';
          }
        });
      } else {
        setState(() {});
      }
    });
  }

  Future<void> _loadCategories() async {
    // Filtrar categorías por tipo: OFICIO = servicios profesionales, NEGOCIO = establecimientos
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

    // Estado local del picker: null = vista de padres, != null = vista de hijos
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
          final items = pickerParent == null
              ? _categories
              : pickerParent!.children;
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
                  // Header con botón "atrás" en fase de hijos
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
                          const SizedBox(width: 16),
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (pickerParent != null)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                      child: Text(
                        isNegocio
                            ? 'Elige el tipo específico de negocio'
                            : 'Elige la especialidad específica',
                        style: TextStyle(color: c.textMuted, fontSize: 12),
                      ),
                    ),
                  if (pickerParent == null && isNegocio)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                      child: Text(
                        'Selecciona el rubro al que pertenece tu establecimiento',
                        style: TextStyle(color: c.textMuted, fontSize: 12),
                      ),
                    ),
                  Expanded(
                    child: ListView.separated(
                      controller: scrollCtrl,
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
                      itemCount: items.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 4),
                      itemBuilder: (_, i) {
                        final cat = items[i];
                        final isSelected = cat.id == _selectedCategoryId;
                        final hasChildren = cat.children.isNotEmpty;

                        // Icono diferente para NEGOCIO vs OFICIO
                        IconData leadIcon;
                        if (hasChildren) {
                          leadIcon = isNegocio ? Icons.storefront_outlined : Icons.category_outlined;
                        } else {
                          leadIcon = isNegocio ? Icons.business_center_outlined : Icons.handyman_outlined;
                        }

                        return ListTile(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          tileColor: isSelected
                              ? AppColors.primary.withValues(alpha: 0.1)
                              : Colors.transparent,
                          leading: Icon(
                            leadIcon,
                            color: isSelected ? AppColors.primary : c.textMuted,
                            size: 20,
                          ),
                          title: Text(
                            cat.name,
                            style: TextStyle(
                              color: isSelected ? AppColors.primary : c.textPrimary,
                              fontWeight: isSelected
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                              fontSize: 14,
                            ),
                          ),
                          trailing: hasChildren
                              ? Icon(Icons.chevron_right_rounded,
                                  color: c.textMuted, size: 20)
                              : isSelected
                                  ? const Icon(Icons.check_circle_rounded,
                                      color: AppColors.primary, size: 20)
                                  : null,
                          onTap: () {
                            if (hasChildren) {
                              // Fase 1 → Fase 2: entrar en hijos
                              setModal(() => pickerParent = cat);
                            } else {
                              // Selección final de hoja
                              setState(() {
                                _selectedCategoryId   = cat.id;
                                _selectedCategoryName = cat.name;
                                _selectedParentId     = pickerParent?.id;
                                _selectedParentName   = pickerParent?.name ?? '';
                              });
                              Navigator.of(ctx).pop();
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

  @override
  void dispose() {
    _businessNameController.dispose();
    _dniController.dispose();
    _phoneController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    _rucController.dispose();
    _nombreComercialController.dispose();
    _razonSocialController.dispose();
    _mapsUrlController.dispose();
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

  // ─── GPS: obtener ubicación actual ───────────────────────

  Future<void> _fetchGpsLocation() async {
    setState(() => _gpsLoading = true);
    final pos = await PermissionService.getCurrentLocation(context);
    if (!mounted) return;
    setState(() {
      _gpsPosition = pos;
      _gpsLoading  = false;
    });
    // Si se obtuvo posición y la dirección está vacía, rellenar con coords
    if (pos != null && _addressController.text.trim().isEmpty) {
      _addressController.text =
          '${pos.latitude.toStringAsFixed(6)}, ${pos.longitude.toStringAsFixed(6)}';
    }
  }

  // ─── Parsear URL de Google Maps para extraer lat/lng ────

  /// Soporta formatos:
  ///   https://maps.app.goo.gl/...        (short link — no extraíble sin HTTP)
  ///   https://www.google.com/maps?q=lat,lng
  ///   https://www.google.com/maps/@lat,lng,zoom
  ///   https://maps.google.com/?ll=lat,lng
  void _parseMapsUrl() {
    final url = _mapsUrlController.text.trim();
    if (url.isEmpty) return;

    // Intentar extraer lat,lng del URL
    final patterns = [
      RegExp(r'@(-?\d+\.\d+),(-?\d+\.\d+)'),          // @lat,lng
      RegExp(r'[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)'),      // ?q=lat,lng
      RegExp(r'll=(-?\d+\.\d+),(-?\d+\.\d+)'),          // ll=lat,lng
      RegExp(r'[?&]center=(-?\d+\.\d+),(-?\d+\.\d+)'),  // center=lat,lng
    ];

    for (final re in patterns) {
      final m = re.firstMatch(url);
      if (m != null) {
        final lat = double.tryParse(m.group(1)!);
        final lng = double.tryParse(m.group(2)!);
        if (lat != null && lng != null) {
          setState(() {
            _gpsPosition = null; // reset GPS manual
          });
          // Rellenar dirección con coords extraídas
          if (_addressController.text.trim().isEmpty) {
            _addressController.text =
                '${lat.toStringAsFixed(6)}, ${lng.toStringAsFixed(6)}';
          }
          _showSnack('Coordenadas extraídas: $lat, $lng', isError: false);
          return;
        }
      }
    }

    // No se pudo extraer → abrir el link en el navegador para que el usuario copie
    _showSnack('No se pudo extraer coordenadas. Copia la URL completa desde Google Maps.', isError: true);
    launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
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
      _showSnack(
        'La imagen supera $_maxMB MB. Elige una más pequeña.',
        isError: true,
      );
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

  // ─── Sección domicilio (OFICIO) ──────────────────────────

  Widget _buildOficioDomicilioSection() {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: _buildToggleRow(
        icon: Icons.home_work_outlined,
        title: 'Atiendo a domicilio',
        subtitle: 'Me desplazo hasta el cliente para realizar el servicio',
        value: _hasDelivery,
        onChanged: (val) => setState(() => _hasDelivery = val),
      ),
    );
  }

  // ─── Sección de delivery (solo NEGOCIO) ───────────────────

  Widget _buildDeliverySection() {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        children: [
          // Toggle principal: Servicio de Delivery
          _buildToggleRow(
            icon: Icons.delivery_dining_rounded,
            title: 'Servicio de Delivery',
            subtitle: 'Tu negocio realiza entregas a domicilio',
            value: _hasDelivery,
            onChanged: (val) => setState(() {
              _hasDelivery = val;
              if (!val) _plenaCoordinacion = false;
            }),
          ),
          // Sub-toggle: Plena Coordinación (solo visible cuando delivery activo)
          if (_hasDelivery) ...[
            Divider(height: 1, color: c.border),
            _buildToggleRow(
              icon: Icons.handshake_outlined,
              title: 'Plena Coordinación',
              subtitle: 'Coordinas todo el proceso de entrega con el cliente',
              value: _plenaCoordinacion,
              onChanged: (val) => setState(() => _plenaCoordinacion = val),
              isSubItem: true,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildToggleRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    bool isSubItem = false,
  }) {
    final c = context.colors;
    return Padding(
      padding: EdgeInsets.fromLTRB(isSubItem ? 28 : 16, 12, 12, 12),
      child: Row(
        children: [
          Icon(icon, color: value ? AppColors.primary : c.textMuted, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(color: c.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.primary,
            activeTrackColor: AppColors.primary.withValues(alpha: 0.4),
          ),
        ],
      ),
    );
  }

  // ─── Submit ──────────────────────────────────────────────

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
    // Validar teléfono peruano (9 dígitos sin +51) — si es extranjero tiene "+" y es libre
    if (!_phone.startsWith('+') && !RegExp(r'^\d{9}$').hasMatch(_phone)) {
      _showSnack('El teléfono debe tener 9 dígitos (número peruano).', isError: true);
      return;
    }
    // Para NEGOCIO la ubicación es obligatoria; para OFICIO es opcional
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
      businessName:     name,
      phone:            _phone,
      whatsapp:         _whatsapp,
      type:             widget.providerType ?? 'OFICIO',
      dni:              _isOficio && dni.isNotEmpty ? dni : null,
      ruc:              !_isOficio && ruc.isNotEmpty ? ruc : null,
      nombreComercial:  !_isOficio ? _nombreComercialController.text.trim() : null,
      razonSocial:      !_isOficio ? _razonSocialController.text.trim() : null,
      hasDelivery:      _hasDelivery,
      plenaCoordinacion: !_isOficio && _hasDelivery ? _plenaCoordinacion : false,
      description:      _descriptionController.text.trim(),
      address:          _addressController.text.trim(),
      categoryId:       _selectedCategoryId,
      scheduleJson:     !_isOficio && _scheduleJson.isNotEmpty ? _scheduleJson : null,
      website:          _websiteCtrl.text.trim().isEmpty    ? null : _websiteCtrl.text.trim(),
      instagram:        _instagramCtrl.text.trim().isEmpty  ? null : _instagramCtrl.text.trim(),
      tiktok:           _tiktokCtrl.text.trim().isEmpty     ? null : _tiktokCtrl.text.trim(),
      facebook:         _facebookCtrl.text.trim().isEmpty   ? null : _facebookCtrl.text.trim(),
      linkedin:         _linkedinCtrl.text.trim().isEmpty   ? null : _linkedinCtrl.text.trim(),
      twitterX:         _twitterCtrl.text.trim().isEmpty    ? null : _twitterCtrl.text.trim(),
      telegram:         _telegramCtrl.text.trim().isEmpty   ? null : _telegramCtrl.text.trim(),
      whatsappBiz:      _whatsappBizCtrl.text.trim().isEmpty ? null : _whatsappBizCtrl.text.trim(),
    );

    if (!mounted) return;

    if (!result) {
      setState(() => _isLoading = false);
      _showSnack(auth.error ?? 'Error al crear el perfil', isError: true);
      return;
    }

    // Subir fotos al servidor y vincularlas al proveedor recién creado
    if (_photos.isNotEmpty) {
      final repo = DashboardRepository();
      int uploadErrors = 0;
      for (final photo in _photos) {
        try {
          // Usar método bytes para compatibilidad multiplataforma (web + native)
          final url = await repo.uploadProviderPhotoFile(photo);
          await repo.saveProviderImage(url, type: widget.providerType);
        } catch (e) {
          uploadErrors++;
          debugPrint('[Onboarding] Error subiendo foto: $e');
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
    setState(() => _isLoading = false);

    // Guardar ubicación administrativa en el perfil de usuario
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
                    Navigator.of(ctx).pop(); // cerrar diálogo
                    // Completar onboarding → _AppRoot rebuild → _MainNavigation
                    auth.completeOnboarding(
                      role: widget.providerType ?? 'OFICIO',
                    );
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
        title: Text(_formTitle, style: TextStyle(color: c.textPrimary)),
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
              style: TextStyle(color: c.textSecondary, fontSize: 14),
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

            // ── OFICIO: DNI ───────────────────────────────
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

            // ── NEGOCIO: RUC, Nombre Comercial, Razón Social ──
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
                _whatsapp = wap;
              }),
            ),
            const SizedBox(height: 14),

            // ── Dirección (NEGOCIO: campo siempre visible + toggle GPS/Maps) ──
            if (!_isOficio) ...[
              _buildNegocioAddressSection(context.colors),
              const SizedBox(height: 14),
            ],

            // ── Categoría ─────────────────────────────────
            _FormSectionHeader(label: _isOficio ? 'CATEGORÍA DEL SERVICIO' : 'TIPO DE NEGOCIO'),
            const SizedBox(height: 12),
            _buildCategorySelector(context.colors),
            const SizedBox(height: 24),

            // ── Sección: Descripción ──────────────────────
            _FormSectionHeader(label: 'DESCRIPCIÓN'),
            const SizedBox(height: 12),

            _buildField(
              controller: _descriptionController,
              label: _isOficio ? 'Describe tu servicio' : 'Describe tu negocio',
              hint: _isOficio
                  ? 'Experiencia, especialidades, horario de trabajo...'
                  : 'Qué ofreces, horarios, especialidades...',
              icon: Icons.description_outlined,
              maxLines: 4,
            ),
            const SizedBox(height: 24),

            // ── Servicios a domicilio (OFICIO) / Delivery (NEGOCIO) ──
            _FormSectionHeader(
              label: _isOficio ? 'SERVICIOS A DOMICILIO' : 'SERVICIO DE DELIVERY',
            ),
            const SizedBox(height: 12),
            _isOficio
                ? _buildOficioDomicilioSection()
                : _buildDeliverySection(),
            const SizedBox(height: 24),

            // ── Horario de atención (solo NEGOCIO) — colapsable ───
            if (!_isOficio) ...[
              _CollapsibleSchedule(
                scheduleJson: _scheduleJson,
                onSave: (s) => setState(() => _scheduleJson = s),
              ),
              const SizedBox(height: 24),
            ],

            // ── Ubicación administrativa ──────────────────
            _FormSectionHeader(label: _isOficio ? 'TU UBICACIÓN (opcional)' : 'TU UBICACIÓN *'),
            const SizedBox(height: 12),
            _buildLocationSection(context.colors),
            const SizedBox(height: 24),

            // ── Sección: Redes sociales (colapsable) ─────
            const SizedBox(height: 8),
            _buildSocialMediaSection(context.colors),
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

  // ─── Dirección de negocio: campo visible + toggle globe para GPS/Maps ──

  Widget _buildNegocioAddressSection(AppThemeColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Dirección siempre visible
        _buildField(
          controller: _addressController,
          label: 'Dirección del negocio',
          hint: 'Jr. Ejemplo 123, Ciudad',
          icon: Icons.location_on_outlined,
        ),
        const SizedBox(height: 8),

        // Toggle globe para GPS + URL Maps
        GestureDetector(
          onTap: () => setState(() => _showAddressSection = !_showAddressSection),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: _showAddressSection
                  ? AppColors.primary.withValues(alpha: 0.08)
                  : c.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _showAddressSection
                    ? AppColors.primary.withValues(alpha: 0.35)
                    : c.textMuted.withValues(alpha: 0.25),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  _showAddressSection ? Icons.expand_less_rounded : Icons.language_rounded,
                  color: _showAddressSection ? AppColors.primary : c.textMuted,
                  size: 17,
                ),
                const SizedBox(width: 10),
                Text(
                  _showAddressSection
                      ? 'Ocultar opciones de ubicación'
                      : 'Agregar GPS / URL Google Maps (opcional)',
                  style: TextStyle(
                    color: _showAddressSection ? AppColors.primary : c.textMuted,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),

        if (_showAddressSection) ...[
          const SizedBox(height: 10),

          // Botón GPS
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: _gpsLoading ? null : _fetchGpsLocation,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 14),
                    decoration: BoxDecoration(
                      color: _gpsPosition != null
                          ? AppColors.available.withValues(alpha: 0.08)
                          : AppColors.primary.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _gpsPosition != null
                            ? AppColors.available.withValues(alpha: 0.4)
                            : AppColors.primary.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (_gpsLoading)
                          const SizedBox(
                            width: 16, height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                          )
                        else
                          Icon(
                            _gpsPosition != null ? Icons.check_circle_rounded : Icons.my_location_rounded,
                            size: 16,
                            color: _gpsPosition != null ? AppColors.available : AppColors.primary,
                          ),
                        const SizedBox(width: 7),
                        Flexible(
                          child: Text(
                            _gpsLoading
                                ? 'Obteniendo ubicación...'
                                : _gpsPosition != null ? 'GPS obtenido ✓' : 'Obtener ubicación actual',
                            style: TextStyle(
                              color: _gpsPosition != null ? AppColors.available : AppColors.primary,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              if (_gpsPosition != null) ...[
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => setState(() { _gpsPosition = null; _addressController.clear(); }),
                  child: Container(
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: c.bgCard,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: c.border),
                    ),
                    child: Icon(Icons.close_rounded, size: 16, color: c.textMuted),
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: Divider(color: c.border, height: 1)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Text('ó', style: TextStyle(color: c.textMuted, fontSize: 12)),
              ),
              Expanded(child: Divider(color: c.border, height: 1)),
            ],
          ),
          const SizedBox(height: 10),

          // URL de Google Maps
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: TextField(
                  controller: _mapsUrlController,
                  style: TextStyle(color: c.textPrimary, fontSize: 13),
                  decoration: InputDecoration(
                    labelText: 'URL de Google Maps (opcional)',
                    labelStyle: TextStyle(color: c.textMuted, fontSize: 13),
                    hintText: 'Pega el enlace de tu ubicación en Maps',
                    hintStyle: TextStyle(color: c.textMuted, fontSize: 12),
                    prefixIcon: const Icon(Icons.map_outlined, color: AppColors.primary, size: 20),
                    filled: true,
                    fillColor: c.bgCard,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _parseMapsUrl,
                child: Container(
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Abre Google Maps → Comparte → Copia enlace → Pégalo aquí',
            style: TextStyle(color: c.textMuted, fontSize: 11),
          ),
        ],
      ],
    );
  }

  // ─── Ubicación administrativa (departamento/provincia/distrito) ──────────

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

  // ─── Selector de categoría ────────────────────────────────

  Widget _buildCategorySelector(AppThemeColors c) {
    final hasCategories = _categories.isNotEmpty;
    final isSelected    = _selectedCategoryId != null;
    final isNegocio     = !_isOficio;
    // Breadcrumb: "Alimentación > Restaurantes" o "Hogar > Electricista"
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

  // ─── Redes sociales (colapsable) ─────────────────────────

  Widget _buildSocialMediaSection(AppThemeColors c) {
    const networks = [
      ('website',     'Página web',  Icons.language_rounded),
      ('instagram',   'Instagram',   Icons.camera_alt_rounded),
      ('tiktok',      'TikTok',      Icons.music_note_rounded),
      ('facebook',    'Facebook',    Icons.facebook_rounded),
      ('linkedin',    'LinkedIn',    Icons.work_rounded),
      ('twitterX',    'Twitter / X', Icons.alternate_email_rounded),
      ('telegram',    'Telegram',    Icons.send_rounded),
      ('whatsappBiz', 'WhatsApp (negocio)', Icons.chat_rounded),
    ];

    final controllers = {
      'website':     _websiteCtrl,
      'instagram':   _instagramCtrl,
      'tiktok':      _tiktokCtrl,
      'facebook':    _facebookCtrl,
      'linkedin':    _linkedinCtrl,
      'twitterX':    _twitterCtrl,
      'telegram':    _telegramCtrl,
      'whatsappBiz': _whatsappBizCtrl,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => setState(() => _socialExpanded = !_socialExpanded),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            ),
            child: Row(
              children: [
                Icon(Icons.share_rounded, size: 18, color: AppColors.amber),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _socialExpanded ? 'Ocultar redes sociales' : 'Añadir redes sociales (opcional)',
                    style: TextStyle(color: c.textPrimary, fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                ),
                Icon(
                  _socialExpanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                  color: c.textMuted,
                ),
              ],
            ),
          ),
        ),
        if (_socialExpanded) ...[
          const SizedBox(height: 12),
          ...networks.map(((String key, String label, IconData icon) entry) {
            final ctrl = controllers[entry.$1]!;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: TextField(
                controller: ctrl,
                style: TextStyle(color: c.textPrimary, fontSize: 14),
                decoration: InputDecoration(
                  prefixIcon: Icon(entry.$3, color: c.textMuted, size: 18),
                  labelText: entry.$2,
                  labelStyle: TextStyle(color: c.textMuted, fontSize: 13),
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
            );
          }),
        ],
      ],
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
            color: AppColors.primary.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.lightbulb_rounded, color: AppColors.primary, size: 18),
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

        // Grid de slots (máx. 3 para Plan Gratis)
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
      onAcceptWithDetails: (d) => _reorderPhotos(d.data, index),
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
                color: AppColors.primary.withValues(alpha: 0.4),
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
                        color: AppColors.primary.withValues(alpha: 0.25),
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
                        color: Colors.black.withValues(alpha: 0.65),
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
                      color: Colors.black.withValues(alpha: 0.55),
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
                        horizontal: 5,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.amber.withValues(alpha: 0.9),
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
            color: isNext ? AppColors.primary.withValues(alpha: 0.35) : c.border,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isNext ? Icons.add_photo_alternate_rounded : Icons.photo_outlined,
              color: isNext
                  ? AppColors.primary.withValues(alpha: 0.6)
                  : c.textMuted.withValues(alpha: 0.25),
              size: 28,
            ),
            const SizedBox(height: 4),
            Text(
              'Foto ${index + 1}',
              style: TextStyle(
                color: isNext
                    ? AppColors.primary.withValues(alpha: 0.6)
                    : c.textMuted.withValues(alpha: 0.25),
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

// ─── Comparativa de planes en el onboarding ──────────────────

class _OnboardingPlansSheet extends StatelessWidget {
  final String providerType; // 'OFICIO' | 'NEGOCIO'
  final VoidCallback onContinue;

  const _OnboardingPlansSheet({
    required this.providerType,
    required this.onContinue,
  });

  bool get _isNegocio => providerType == 'NEGOCIO';

  @override
  Widget build(BuildContext context) {
    final c      = context.colors;
    final accent = _isNegocio ? AppColors.amber : AppColors.primary;
    final label  = _isNegocio ? 'negocio' : 'perfil profesional';

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      minChildSize:     0.6,
      maxChildSize:     0.95,
      builder: (_, scrollController) => Container(
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // Handle
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 4),
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: c.textMuted.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 16, 4),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _isNegocio ? Icons.storefront_rounded : Icons.handyman_rounded,
                      color: accent, size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Elige tu plan',
                          style: TextStyle(color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Empieza gratis — puedes subir después',
                          style: TextStyle(color: c.textSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: c.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            Divider(height: 1, color: c.border),

            // Planes
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Column(
                  children: [
                    _OnboardingPlanCard(
                      planId:      'GRATIS',
                      title:       'Gratis',
                      price:       'S/ 0',
                      priceNote:   'Para siempre',
                      color:       const Color(0xFF6B7280),
                      icon:        Icons.storefront_rounded,
                      isNegocio:   _isNegocio,
                      isCurrent:   true,
                      features: [
                        _feat(Icons.photo_library_rounded, '${PlanLimits.photos('GRATIS')} fotos de perfil'),
                        _feat(
                          _isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                          PlanLimits.itemsLabel('GRATIS', isNegocio: _isNegocio),
                        ),
                        _feat(Icons.bar_chart_rounded, 'Sin gestión de visitas', locked: true),
                        _feat(Icons.verified_rounded, 'Sin badge verificado', locked: true),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _OnboardingPlanCard(
                      planId:    'ESTANDAR',
                      title:     'Estándar',
                      price:     'S/ 29',
                      priceNote: 'por mes',
                      color:     AppColors.standard,
                      icon:      Icons.verified_rounded,
                      isNegocio: _isNegocio,
                      isPopular: true,
                      features: [
                        _feat(Icons.photo_library_rounded, '${PlanLimits.photos('ESTANDAR')} fotos de perfil'),
                        _feat(
                          _isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                          PlanLimits.itemsLabel('ESTANDAR', isNegocio: _isNegocio),
                        ),
                        if (_isNegocio) _feat(Icons.image_rounded, 'Foto por producto incluida'),
                        _feat(Icons.bar_chart_rounded, 'Gestión de visitas y estadísticas'),
                        _feat(Icons.verified_rounded, 'Badge verificado azul'),
                        _feat(Icons.search_rounded, 'Mayor visibilidad en búsqueda'),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _OnboardingPlanCard(
                      planId:    'PREMIUM',
                      title:     'Premium',
                      price:     'S/ 59',
                      priceNote: 'por mes',
                      color:     AppColors.premium,
                      icon:      Icons.workspace_premium_rounded,
                      isNegocio: _isNegocio,
                      features: [
                        _feat(Icons.photo_library_rounded, '${PlanLimits.photos('PREMIUM')} fotos de perfil'),
                        _feat(
                          _isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                          PlanLimits.itemsLabel('PREMIUM', isNegocio: _isNegocio),
                        ),
                        if (_isNegocio) _feat(Icons.image_rounded, 'Fotos ilimitadas por producto'),
                        _feat(Icons.bar_chart_rounded, 'Estadísticas avanzadas'),
                        _feat(Icons.workspace_premium_rounded, 'Badge dorado Premium'),
                        _feat(Icons.star_rounded, 'Posición #1 en búsqueda garantizada'),
                        _feat(Icons.support_agent_rounded, 'Soporte prioritario 24/7'),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Nota informativa
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: 0.07),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: accent.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline_rounded, color: accent, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Comenzarás con el plan Gratis. Puedes subir de plan en cualquier momento desde tu panel → Ajustes → Subir de rango.',
                              style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.45),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // CTA continuar
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: onContinue,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accent,
                    foregroundColor: _isNegocio ? const Color(0xFF3D2B00) : Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: Text(
                    'Continuar con mi $label',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static _FeatureItem _feat(IconData icon, String text, {bool locked = false}) =>
      _FeatureItem(icon: icon, text: text, locked: locked);
}

class _FeatureItem {
  final IconData icon;
  final String text;
  final bool locked;
  const _FeatureItem({required this.icon, required this.text, this.locked = false});
}

class _OnboardingPlanCard extends StatelessWidget {
  final String planId;
  final String title;
  final String price;
  final String priceNote;
  final Color color;
  final IconData icon;
  final bool isNegocio;
  final bool isCurrent;
  final bool isPopular;
  final List<_FeatureItem> features;

  const _OnboardingPlanCard({
    required this.planId,
    required this.title,
    required this.price,
    required this.priceNote,
    required this.color,
    required this.icon,
    required this.isNegocio,
    required this.features,
    this.isCurrent = false,
    this.isPopular = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isCurrent
            ? color.withValues(alpha: c.isDark ? 0.1 : 0.05)
            : c.bg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isCurrent ? color.withValues(alpha: 0.5) : c.border,
          width: isCurrent ? 1.8 : 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(title, style: TextStyle(color: color, fontSize: 15, fontWeight: FontWeight.bold)),
                        if (isCurrent) ...[
                          const SizedBox(width: 6),
                          _Badge(label: 'Incluido gratis', color: color),
                        ],
                        if (isPopular && !isCurrent) ...[
                          const SizedBox(width: 6),
                          _Badge(label: '⭐ Popular', color: AppColors.standard),
                        ],
                      ],
                    ),
                    Text(
                      '$price $priceNote',
                      style: TextStyle(color: c.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...features.map((f) => Padding(
            padding: const EdgeInsets.only(bottom: 7),
            child: Row(
              children: [
                Icon(
                  f.locked ? Icons.lock_outline_rounded : f.icon,
                  color: f.locked ? c.textMuted : color,
                  size: 15,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    f.text,
                    style: TextStyle(
                      color: f.locked ? c.textMuted : c.textSecondary,
                      fontSize: 13,
                      decoration: f.locked ? TextDecoration.lineThrough : null,
                      decorationColor: c.textMuted,
                    ),
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }
}

class _CollapsibleSchedule extends StatefulWidget {
  final Map<String, dynamic> scheduleJson;
  final void Function(Map<String, dynamic>) onSave;
  const _CollapsibleSchedule({required this.scheduleJson, required this.onSave});

  @override
  State<_CollapsibleSchedule> createState() => _CollapsibleScheduleState();
}

class _CollapsibleScheduleState extends State<_CollapsibleSchedule> {
  bool _expanded = false;

  String get _summary {
    if (widget.scheduleJson.isEmpty) return 'Sin configurar';
    final days = widget.scheduleJson.entries
        .where((e) => e.value is Map && (e.value as Map)['open'] == true)
        .map((e) => e.key)
        .toList();
    if (days.isEmpty) return 'Sin configurar';
    return '${days.length} día${days.length == 1 ? '' : 's'} configurados';
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: c.border),
            ),
            child: Row(
              children: [
                Icon(Icons.schedule, color: AppColors.primary, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Horario de Atención',
                          style: TextStyle(fontWeight: FontWeight.w600, color: c.textPrimary)),
                      Text(_summary,
                          style: TextStyle(fontSize: 12, color: c.textMuted)),
                    ],
                  ),
                ),
                Icon(_expanded ? Icons.expand_less : Icons.expand_more, color: c.textMuted),
              ],
            ),
          ),
        ),
        if (_expanded) ...[
          const SizedBox(height: 8),
          ScheduleEditor(
            initialSchedule: widget.scheduleJson,
            onSave: (s) async {
              widget.onSave(s);
              setState(() => _expanded = false);
            },
          ),
        ],
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  const _Badge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}
