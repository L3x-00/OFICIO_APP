import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/geocoding_service.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../features/localities/data/dynamic_locations.dart';
import '../providers/providers_provider.dart';
import 'filter/filter_availability_section.dart';
import 'filter/filter_bottom_buttons.dart';
import 'filter/filter_category_section.dart';
import 'filter/filter_location_section.dart';
import 'filter/filter_section_label.dart';
import 'filter/filter_sort_section.dart';
import 'filter/filter_verification_section.dart';

/// Hoja de filtros avanzados — categorías, disponibilidad, verificación,
/// orden y ubicación estructurada (jerarquía peruana).
///
/// El sheet orquesta los widgets extraídos de `filter/`. El estado local
/// (selecciones aún no aplicadas) vive aquí; al pulsar "Aplicar" se
/// vuelca al [ProvidersProvider].
class FilterSheet extends StatefulWidget {
  final ProvidersProvider prov;
  const FilterSheet({super.key, required this.prov});

  @override
  State<FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<FilterSheet> {
  late String? _availability;
  late bool    _verifiedOnly;
  late String? _sortBy;
  late final TextEditingController _locationCtrl;

  // Categoría (estado local del sheet)
  String? _sheetParentSlug;
  String? _sheetCategory;

  // Ubicación estructurada (jerarquía Perú). Preload desde AuthProvider.user
  // en initState — si el usuario tiene un department/province/district en su
  // perfil, los dropdowns arrancan ya rellenados.
  String? _dept;
  String? _prov;
  String? _dist;
  bool _gpsLoading = false;

  @override
  void initState() {
    super.initState();
    _availability      = widget.prov.selectedAvailability;
    _verifiedOnly      = widget.prov.verifiedOnly;
    _sortBy            = widget.prov.sortBy;
    _locationCtrl      = TextEditingController(text: widget.prov.location);
    _sheetParentSlug   = widget.prov.expandedParentSlug;
    _sheetCategory     = widget.prov.selectedCategory;

    // Preload de la ubicación del usuario: si ya tiene filtro estructurado
    // en el provider, usamos ese. Si no, caemos al perfil registrado.
    final auth = context.read<AuthProvider>();
    _dept = widget.prov.department ?? auth.user?.department;
    _prov = widget.prov.province   ?? auth.user?.province;
    _dist = widget.prov.district   ?? auth.user?.district;
    // Sanea: si el dept del usuario no está en el catálogo local, lo
    // descartamos para no mostrar opciones inválidas.
    _dept = _sanitizeDept(widget.prov.department) ?? widget.prov.department;
    _prov = _sanitizeProv(_dept, widget.prov.province) ?? widget.prov.province;
    _dist = _sanitizeDist(_prov, widget.prov.district) ?? widget.prov.district;
  }

  // Sanitización accent-insensitive contra el catálogo combinado
  // (estático + extras runtime). Devuelve la forma canónica que matchea
  // la BD del backend.
  String? _sanitizeDept(String? d) =>
      DynamicLocations.instance.findDepartmentCanonical(d);
  String? _sanitizeProv(String? d, String? p) =>
      DynamicLocations.instance.findProvinceCanonical(d, p);
  String? _sanitizeDist(String? p, String? di) =>
      DynamicLocations.instance.findDistrictCanonical(p, di);

  @override
  void dispose() {
    _locationCtrl.dispose();
    super.dispose();
  }

  void _apply() {
    widget.prov.applyFilters(
      availability:   _availability,
      verifiedOnly:   _verifiedOnly,
      sortBy:         _sortBy,
      location:       _locationCtrl.text.trim(),
      category:       _sheetCategory,
      parentCategory: _sheetCategory == null ? _sheetParentSlug : null,
      department:     _dept,
      province:       _prov,
      district:       _dist,
    );
    Navigator.pop(context);
  }

  void _clear() {
    setState(() {
      _availability    = null;
      _verifiedOnly    = true;
      _sortBy          = null;
      _sheetParentSlug = null;
      _sheetCategory   = null;
      _locationCtrl.clear();
      _dept = null;
      _prov = null;
      _dist = null;
    });
    // Aplicar inmediatamente para que los servicios también se limpien
    _apply();
  }

  bool get _hasLocalChanges =>
      _availability    != widget.prov.selectedAvailability ||
      _verifiedOnly    != widget.prov.verifiedOnly ||
      _sortBy          != widget.prov.sortBy ||
      _sheetCategory   != widget.prov.selectedCategory ||
      _sheetParentSlug != widget.prov.expandedParentSlug ||
      _locationCtrl.text.trim() != widget.prov.location ||
      _dept != widget.prov.department ||
      _prov != widget.prov.province ||
      _dist != widget.prov.district;

  // ── GPS: usar mi ubicación actual ──────────────────────────
  //
  // Permisos + getCurrentPosition + reverse geocoding + sanitización
  // contra el catálogo. Si todo va bien, actualiza los dropdowns; el
  // usuario aún debe pulsar "Aplicar" para volcar al provider.
  Future<void> _useMyGps() async {
    if (_gpsLoading) return;
    setState(() => _gpsLoading = true);

    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Permiso de ubicación denegado')),
        );
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );

      final geo = await GeocodingService.reverseGeocode(pos.latitude, pos.longitude, force: true);
      if (!mounted) return;

      if (geo == null || geo.department == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo obtener la ubicación')),
        );
        return;
      }

      final dept = _sanitizeDept(geo.department);
      final prov = _sanitizeProv(dept, geo.province);
      final dist = _sanitizeDist(prov, geo.district);

      if (dept == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tu ubicación no está en el catálogo')),
        );
        return;
      }

      setState(() {
        _dept = dept;
        _prov = prov;
        _dist = dist;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      if (mounted) setState(() => _gpsLoading = false);
    }
  }

  // ── BUILD: orquestador de los widgets extraídos ────────────
  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Container(
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildHeader(c),
          const Divider(height: 1),
          Flexible(
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                left: 20, right: 20, top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // CATEGORÍA
                  const SectionLabel(label: 'CATEGORÍA'),
                  const SizedBox(height: 10),
                  CategorySheetSection(
                    categories:      widget.prov.categories,
                    selectedParent:  _sheetParentSlug,
                    selectedLeaf:    _sheetCategory,
                    onParentTap:     (slug) => setState(() {
                      _sheetParentSlug = _sheetParentSlug == slug ? null : slug;
                      _sheetCategory   = null;
                    }),
                    onLeafTap:       (slug) => setState(() {
                      _sheetCategory = _sheetCategory == slug ? null : slug;
                    }),
                  ),
                  const SizedBox(height: 20),

                  // DISPONIBILIDAD
                  AvailabilitySection(
                    availability: _availability,
                    onChanged:    (v) => setState(() => _availability = v),
                  ),

                  // VERIFICACIÓN
                  VerificationSection(
                    verifiedOnly: _verifiedOnly,
                    onChanged:    (v) => setState(() => _verifiedOnly = v),
                  ),

                  // ORDEN
                  SortBySection(
                    sortBy:    _sortBy,
                    onChanged: (v) => setState(() => _sortBy = v),
                  ),

                  // UBICACIÓN
                  LocationSection(
                    department:  _dept,
                    province:    _prov,
                    district:    _dist,
                    gpsLoading:  _gpsLoading,
                    onUseGps:    _useMyGps,
                    onDepartmentChanged: (v) => setState(() {
                      _dept = v;
                      _prov = null;
                      _dist = null;
                    }),
                    onProvinceChanged: (v) => setState(() {
                      _prov = v;
                      _dist = null;
                    }),
                    onDistrictChanged: (v) => setState(() => _dist = v),
                    onExpandToDepartment: () {
                      // "Ampliar búsqueda" debe limpiar TODO el filtro de
                      // ubicación para mostrar servicios del Perú entero.
                      // Antes solo limpiaba dept/prov/dist pero NO el
                      // campo de texto `_locationCtrl` — y `_apply()`
                      // sigue enviando ese texto como filtro `location`,
                      // así que el listado quedaba acotado igual.
                      setState(() {
                        _dept = null;
                        _prov = null;
                        _dist = null;
                        _locationCtrl.clear();
                      });
                      _apply();
                    },
                    addressField: _buildAddressTextField(c),
                  ),
                ],
              ),
            ),
          ),
          FilterBottomButtons(
            onClear:    _clear,
            onApply:    _apply,
            hasChanges: _hasLocalChanges,
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(AppThemeColors c) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Column(
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.tune_rounded, color: AppColors.primary, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Filtros avanzados',
                    style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              TextButton.icon(
                onPressed: _clear,
                icon: const Icon(Icons.refresh_rounded,
                    size: 16, color: AppColors.primary),
                label: const Text('Limpiar',
                    style: TextStyle(color: AppColors.primary, fontSize: 13)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAddressTextField(AppThemeColors c) {
    return TextField(
      controller: _locationCtrl,
      style: TextStyle(color: c.textPrimary),
      decoration: InputDecoration(
        hintText: 'Dirección (opcional): Jr. Lima, Av…',
        hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
        prefixIcon: const Icon(
            Icons.location_on_outlined,
            color: AppColors.amber, size: 20),
        filled: true,
        fillColor: c.bgCard,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(
              color: AppColors.primary, width: 1.5),
        ),
      ),
      onChanged: (_) => setState(() {}),
    );
  }
}
