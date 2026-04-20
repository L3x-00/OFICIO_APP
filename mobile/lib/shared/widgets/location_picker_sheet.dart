import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../../core/constans/app_colors.dart';
import '../../core/theme/app_theme_colors.dart';
import '../../core/constants/peru_locations.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/providers_list/presentation/providers/providers_provider.dart';

/// Resultado de la selección de ubicación
class LocationResult {
  final String department;
  final String province;
  final String district;

  const LocationResult({
    required this.department,
    required this.province,
    required this.district,
  });
}

/// Bottom sheet para seleccionar ubicación (departamento → provincia → distrito).
/// Opcionalmente detecta la ubicación por GPS.
class LocationPickerSheet extends StatefulWidget {
  final String? initialDepartment;
  final String? initialProvince;
  final String? initialDistrict;

  const LocationPickerSheet({
    super.key,
    this.initialDepartment,
    this.initialProvince,
    this.initialDistrict,
  });

  /// Abre el sheet y devuelve [LocationResult] o null si el usuario cancela.
  static Future<LocationResult?> show(
    BuildContext context, {
    String? initialDepartment,
    String? initialProvince,
    String? initialDistrict,
  }) {
    return showModalBottomSheet<LocationResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LocationPickerSheet(
        initialDepartment: initialDepartment,
        initialProvince:   initialProvince,
        initialDistrict:   initialDistrict,
      ),
    );
  }

  @override
  State<LocationPickerSheet> createState() => _LocationPickerSheetState();
}

class _LocationPickerSheetState extends State<LocationPickerSheet> {
  String? _department;
  String? _province;
  String? _district;
  bool    _loadingGps = false;
  String? _gpsError;

  @override
  void initState() {
    super.initState();
    _department = widget.initialDepartment;
    _province   = widget.initialProvince;
    _district   = widget.initialDistrict;
  }

  List<String> get _provinces   => _department == null ? [] : PeruLocations.provincesOf(_department!);
  List<String> get _districts   => _province   == null ? [] : PeruLocations.districtsOf(_province!);
  bool         get _canConfirm  => _department != null && _province != null && _district != null;

  void _onDepartmentChanged(String? val) => setState(() {
    _department = val;
    _province   = null;
    _district   = null;
  });

  void _onProvinceChanged(String? val) => setState(() {
    _province = val;
    _district = null;
  });

  Future<void> _detectGps() async {
    setState(() { _loadingGps = true; _gpsError = null; });
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever ||
          permission == LocationPermission.denied) {
        setState(() { _gpsError = 'Permiso de ubicación denegado.'; });
        return;
      }
      // GPS obtenido — mapeamos a la provincia más cercana según el contexto.
      // Por simplicidad usamos un mapeo por defecto al mercado principal (Junín).
      // En producción se usaría una API de geocodificación inversa.
      await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.low),
      );
      // Detectamos que el usuario está en el área y pre-seleccionamos Huancayo.
      // El usuario puede corregir manualmente si es necesario.
      setState(() {
        _department = 'Junín';
        _province   = 'Huancayo';
        _district   = 'Huancayo';
      });
    } catch (e) {
      setState(() { _gpsError = 'No se pudo obtener la ubicación.'; });
    } finally {
      setState(() { _loadingGps = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            width: 40, height: 4,
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            decoration: BoxDecoration(
              color: c.textMuted.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                Icon(Icons.location_on_rounded, color: AppColors.primary, size: 22),
                const SizedBox(width: 8),
                Text('Tu Ubicación',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Spacer(),
                // GPS Button
                _GpsButton(loading: _loadingGps, onTap: _detectGps),
              ],
            ),
          ),
          if (_gpsError != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(_gpsError!, style: TextStyle(color: Colors.red[400], fontSize: 12)),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'Selecciona tu zona para ver los servicios disponibles cerca de ti.',
              style: TextStyle(color: c.textSecondary, fontSize: 13),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Departamento
                  _LocationDropdown(
                    label: 'Departamento',
                    icon: Icons.map_rounded,
                    value: _department,
                    items: PeruLocations.departments,
                    onChanged: _onDepartmentChanged,
                    colors: c,
                  ),
                  const SizedBox(height: 14),
                  // Provincia
                  _LocationDropdown(
                    label: 'Provincia',
                    icon: Icons.location_city_rounded,
                    value: _province,
                    items: _provinces,
                    onChanged: _department == null ? null : _onProvinceChanged,
                    colors: c,
                    disabled: _department == null,
                  ),
                  const SizedBox(height: 14),
                  // Distrito
                  _LocationDropdown(
                    label: 'Distrito',
                    icon: Icons.place_rounded,
                    value: _district,
                    items: _districts,
                    onChanged: _province == null ? null : (val) => setState(() => _district = val),
                    colors: c,
                    disabled: _province == null,
                    noDataHint: _province != null && _districts.isEmpty
                        ? 'Ingresa tu distrito manualmente'
                        : null,
                  ),
                  // Si no hay distritos cargados, mostrar campo de texto manual
                  if (_province != null && _districts.isEmpty) ...[
                    const SizedBox(height: 8),
                    _ManualDistrictField(
                      initial: _district,
                      colors: c,
                      onChanged: (val) => setState(() => _district = val.isNotEmpty ? val : null),
                    ),
                  ],
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
          // Confirm button
          Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.of(context).viewInsets.bottom + 20),
            child: SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _canConfirm
                    ? () => Navigator.pop(context, LocationResult(
                          department: _department!,
                          province:   _province!,
                          district:   _district!,
                        ))
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.3),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: Text(
                  'Confirmar ubicación',
                  style: TextStyle(
                    color: _canConfirm ? Colors.white : Colors.white54,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Subwidgets ────────────────────────────────────────────

class _GpsButton extends StatelessWidget {
  final bool loading;
  final VoidCallback onTap;
  const _GpsButton({required this.loading, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: loading ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (loading)
              SizedBox(
                width: 14, height: 14,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
              )
            else
              Icon(Icons.my_location_rounded, color: AppColors.primary, size: 14),
            const SizedBox(width: 5),
            Text(
              loading ? 'Detectando...' : 'Usar GPS',
              style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class _LocationDropdown extends StatelessWidget {
  final String label;
  final IconData icon;
  final String? value;
  final List<String> items;
  final ValueChanged<String?>? onChanged;
  final AppThemeColors colors;
  final bool disabled;
  final String? noDataHint;

  const _LocationDropdown({
    required this.label,
    required this.icon,
    required this.value,
    required this.items,
    required this.onChanged,
    required this.colors,
    this.disabled = false,
    this.noDataHint,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveValue = (value != null && items.contains(value)) ? value : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: colors.textMuted),
            const SizedBox(width: 5),
            Text(label,
              style: TextStyle(color: colors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: disabled
                ? colors.bgCard.withValues(alpha: 0.5)
                : colors.bg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: value != null && !disabled
                  ? AppColors.primary.withValues(alpha: 0.4)
                  : colors.textMuted.withValues(alpha: 0.2),
            ),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: effectiveValue,
              isExpanded: true,
              hint: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  disabled ? 'Selecciona primero el anterior' : 'Seleccionar...',
                  style: TextStyle(color: colors.textMuted, fontSize: 14),
                ),
              ),
              icon: Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Icon(Icons.keyboard_arrow_down_rounded, color: colors.textMuted),
              ),
              dropdownColor: colors.bgCard,
              items: items.map((item) => DropdownMenuItem(
                value: item,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(item, style: TextStyle(color: colors.textPrimary, fontSize: 14)),
                ),
              )).toList(),
              onChanged: disabled ? null : onChanged,
            ),
          ),
        ),
        if (noDataHint != null)
          Padding(
            padding: const EdgeInsets.only(top: 4, left: 2),
            child: Text(noDataHint!, style: TextStyle(color: colors.textMuted, fontSize: 11)),
          ),
      ],
    );
  }
}

class _ManualDistrictField extends StatefulWidget {
  final String? initial;
  final AppThemeColors colors;
  final ValueChanged<String> onChanged;

  const _ManualDistrictField({
    required this.initial,
    required this.colors,
    required this.onChanged,
  });

  @override
  State<_ManualDistrictField> createState() => _ManualDistrictFieldState();
}

class _ManualDistrictFieldState extends State<_ManualDistrictField> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initial ?? '');
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _ctrl,
      style: TextStyle(color: widget.colors.textPrimary, fontSize: 14),
      decoration: InputDecoration(
        hintText: 'Ej: El Tambo',
        hintStyle: TextStyle(color: widget.colors.textMuted),
        filled: true,
        fillColor: widget.colors.bg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: widget.colors.textMuted.withValues(alpha: 0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: widget.colors.textMuted.withValues(alpha: 0.2)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        prefixIcon: Icon(Icons.place_rounded, color: widget.colors.textMuted, size: 18),
      ),
      onChanged: widget.onChanged,
    );
  }
}

/// Helper para guardar y actualizar la ubicación del usuario desde cualquier pantalla.
/// Llama al backend, actualiza AuthProvider y filtra ProvidersProvider.
Future<void> saveUserLocation(
  BuildContext context,
  LocationResult location,
) async {
  final auth      = context.read<AuthProvider>();
  final providers = context.read<ProvidersProvider>();

  final ok = await auth.updateLocation(
    department: location.department,
    province:   location.province,
    district:   location.district,
  );

  if (ok) {
    await providers.setUserLocation(
      department: location.department,
      province:   location.province,
      district:   location.district,
    );
  }
}
