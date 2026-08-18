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
// import 'filter/filter_category_section.dart'; // 👈 ELIMINADO
import 'filter/filter_location_section.dart';
import 'filter/filter_radar_map.dart';
import 'filter/filter_section_label.dart';
import 'filter/filter_sort_section.dart';
import 'filter/filter_verification_section.dart';

/// Hoja de filtros avanzados — disponibilidad, verificación,
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
  late bool _verifiedOnly;
  late String? _sortBy;
  late final TextEditingController _locationCtrl;

  // Ubicación estructurada (jerarquía Perú). Preload desde AuthProvider.user
  // en initState — si el usuario tiene un department/province/district en su
  // perfil, los dropdowns arrancan ya rellenados.
  String? _dept;
  String? _prov;
  String? _dist;
  bool _gpsLoading = false;

  // Modo "Buscar por radio" (radar). Cuando está ON, el botón único del sheet
  // dispara applyNearby(lat,lng,km) en vez de applyFilters. El mapa reporta su
  // centro/radio actuales vía onChanged.
  late bool _radarMode;
  double? _radarLat;
  double? _radarLng;
  late double _radarRadiusKm;

  @override
  void initState() {
    super.initState();
    _availability = widget.prov.selectedAvailability;
    _verifiedOnly = widget.prov.verifiedOnly;
    _sortBy = widget.prov.sortBy;
    _locationCtrl = TextEditingController(text: widget.prov.location);
    _radarMode = widget.prov.nearbyActive;
    _radarRadiusKm = widget.prov.nearbyRadiusKm;

    // Preload de la ubicación del usuario: si ya tiene filtro estructurado
    // en el provider, usamos ese. Si no, caemos al perfil registrado.
    final auth = context.read<AuthProvider>();
    _dept = widget.prov.department ?? auth.user?.department;
    _prov = widget.prov.province ?? auth.user?.province;
    _dist = widget.prov.district ?? auth.user?.district;
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

  // Botón único: un solo "Aplicar" cubre TODOS los cambios del sheet.
  // Si el modo radar está activo y ya hay un punto resuelto, dispara la
  // búsqueda por radio; si no, aplica los filtros estructurados.
  void _apply() {
    if (_radarMode && _radarLat != null && _radarLng != null) {
      widget.prov.applyNearby(
        latitude: _radarLat!,
        longitude: _radarLng!,
        radiusKm: _radarRadiusKm,
        // El radar ahora también respeta la disponibilidad elegida en el sheet.
        availability: _availability,
      );
    } else {
      widget.prov.applyFilters(
        availability: _availability,
        verifiedOnly: _verifiedOnly,
        sortBy: _sortBy,
        location: _locationCtrl.text.trim(),
        category: null, // 👈 Forzamos a null
        parentCategory: null, // 👈 Forzamos a null
        department: _dept,
        province: _prov,
        district: _dist,
      );
    }
    Navigator.pop(context);
  }

  void _clear() {
    setState(() {
      _availability = null;
      _verifiedOnly = true;
      _sortBy = null;
      _locationCtrl.clear();
      _dept = null;
      _prov = null;
      _dist = null;
      // Limpiar también apaga el modo radar → vuelve al listado estructurado.
      _radarMode = false;
    });
    // Aplicar inmediatamente para que los servicios también se limpien
    _apply();
  }

  bool get _hasLocalChanges =>
      _radarMode != widget.prov.nearbyActive ||
      (_radarMode && _radarRadiusKm != widget.prov.nearbyRadiusKm) ||
      _availability != widget.prov.selectedAvailability ||
      _verifiedOnly != widget.prov.verifiedOnly ||
      _sortBy != widget.prov.sortBy ||
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
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      final geo = await GeocodingService.reverseGeocode(
        pos.latitude,
        pos.longitude,
        force: true,
      );
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
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
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // BÚSQUEDA POR TEXTO/DIRECCIÓN (UX #2.1) — arriba del todo
                  // para que sea visible y no quede oculta tras el teclado.
                  _buildAddressTextField(c),
                  const SizedBox(height: 18),

                  // CATEGORÍA ELIMINADA ✅

                  // DISPONIBILIDAD
                  AvailabilitySection(
                    availability: _availability,
                    onChanged: (v) => setState(() => _availability = v),
                  ),

                  // VERIFICACIÓN
                  VerificationSection(
                    verifiedOnly: _verifiedOnly,
                    onChanged: (v) => setState(() => _verifiedOnly = v),
                  ),

                  // ORDEN
                  SortBySection(
                    sortBy: _sortBy,
                    onChanged: (v) => setState(() => _sortBy = v),
                  ),

                  // UBICACIÓN
                  LocationSection(
                    department: _dept,
                    province: _prov,
                    district: _dist,
                    gpsLoading: _gpsLoading,
                    onUseGps: _useMyGps,
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
                      // Solo ajusta el estado; el botón único aplica al final.
                      setState(() {
                        _prov = null;
                        _dist = null;
                        _locationCtrl.clear();
                      });
                    },
                  ),

                  // BÚSQUEDA POR RADIO (mapa radar) — opt-in por toggle. Con el
                  // toggle ON, el botón único dispara GET /providers/nearby con
                  // el centro/radio que el mapa reporta vía onChanged.
                  _buildRadarToggle(c),
                  if (_radarMode) ...[
                    const SizedBox(height: 4),
                    FilterRadarMap(
                      district: _dist,
                      province: _prov,
                      department: _dept,
                      initialRadiusKm: _radarRadiusKm,
                      onChanged: (lat, lng, km) {
                        // setState para que el indicador de cambios del botón
                        // único reaccione al mover el radio o el punto.
                        setState(() {
                          _radarLat = lat;
                          _radarLng = lng;
                          _radarRadiusKm = km;
                        });
                      },
                    ),
                  ],
                ],
              ),
            ),
          ),
          FilterBottomButtons(
            onClear: _clear,
            onApply: _apply,
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
              width: 40,
              height: 4,
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
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              TextButton.icon(
                onPressed: _clear,
                icon: const Icon(
                  Icons.refresh_rounded,
                  size: 16,
                  color: AppColors.primary,
                ),
                label: const Text(
                  'Limpiar',
                  style: TextStyle(color: AppColors.primary, fontSize: 13),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Toggle "Buscar por radio": alterna entre filtros estructurados y la
  // búsqueda por radio. Al encenderlo aparece el mapa radar; el botón único
  // del sheet respeta este modo.
  Widget _buildRadarToggle(AppThemeColors c) {
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: _radarMode
              ? AppColors.primary.withValues(alpha: 0.4)
              : c.border,
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.radar_rounded, color: AppColors.primary, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Buscar por radio',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'Proveedores dentro de un radio en el mapa',
                  style: TextStyle(color: c.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),
          Switch(
            value: _radarMode,
            activeThumbColor: AppColors.primary,
            onChanged: (v) => setState(() => _radarMode = v),
          ),
        ],
      ),
    );
  }

  Widget _buildAddressTextField(AppThemeColors c) {
    return TextField(
      controller: _locationCtrl,
      style: TextStyle(color: c.textPrimary),
      textInputAction: TextInputAction.search,
      onSubmitted: (_) => _apply(),
      decoration: InputDecoration(
        hintText: 'Buscar por dirección (Jr. Lima, Av…)',
        hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
        prefixIcon: const Icon(
          Icons.search_rounded,
          color: AppColors.amber,
          size: 20,
        ),
        suffixIcon: _locationCtrl.text.isNotEmpty
            ? IconButton(
                icon: Icon(Icons.close_rounded, color: c.textMuted, size: 18),
                onPressed: () => setState(() => _locationCtrl.clear()),
              )
            : null,
        filled: true,
        fillColor: c.bgCard,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
      ),
      onChanged: (_) => setState(() {}),
    );
  }
}
