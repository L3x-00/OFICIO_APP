import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';

/// Mapa-radar del filtro (FASE 2 · punto 2).
///
/// `flutter_map` con tiles CartoDB Dark Matter centrado en el GPS del usuario
/// (o en el distrito seleccionado en los dropdowns, animando al cambiarlo). Un
/// Slider 1–50 km dibuja el radio en tiempo real; "Buscar en este radio" llama
/// `GET /providers/nearby` vía [onSearch] (lat, lng, km). Tap en el mapa mueve
/// el centro — útil cuando el usuario quiere otra zona.
class FilterRadarMap extends StatefulWidget {
  final String? district;
  final String? province;
  final String? department;
  final double initialRadiusKm;
  final void Function(double latitude, double longitude, double radiusKm)
  onSearch;

  const FilterRadarMap({
    super.key,
    this.district,
    this.province,
    this.department,
    this.initialRadiusKm = 5,
    required this.onSearch,
  });

  @override
  State<FilterRadarMap> createState() => _FilterRadarMapState();
}

class _FilterRadarMapState extends State<FilterRadarMap>
    with TickerProviderStateMixin {
  final MapController _map = MapController();

  // Fallback: Huancayo (ciudad intermedia objetivo) si no hay GPS ni distrito.
  static const LatLng _fallback = LatLng(-12.0686, -75.2103);

  LatLng _center = _fallback;
  late double _radiusKm;
  bool _locating = false;
  AnimationController? _moveCtrl;

  @override
  void initState() {
    super.initState();
    // Arranca con el radio persistido (UX #2.4) — acotado al rango del slider.
    _radiusKm = widget.initialRadiusKm.clamp(1, 50).toDouble();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _resolveCenter(useGps: true);
    });
  }

  @override
  void didUpdateWidget(covariant FilterRadarMap old) {
    super.didUpdateWidget(old);
    // Distrito cambió en los dropdowns → recentrar (sin re-pedir GPS).
    if (old.district != widget.district ||
        old.province != widget.province ||
        old.department != widget.department) {
      _resolveCenter(useGps: false);
    }
  }

  @override
  void dispose() {
    _moveCtrl?.dispose();
    super.dispose();
  }

  // ── Resolución del centro ────────────────────────────────
  Future<void> _resolveCenter({required bool useGps}) async {
    LatLng? target;
    if (useGps) target = await _gpsCenter();
    target ??= await _districtCenter();
    if (target == null || !mounted) return;
    setState(() => _center = target!);
    _animateTo(target);
  }

  Future<LatLng?> _gpsCenter() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        return null;
      }
      if (mounted) setState(() => _locating = true);
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      return LatLng(pos.latitude, pos.longitude);
    } catch (_) {
      return null;
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<LatLng?> _districtCenter() async {
    final q = [
      widget.district,
      widget.province,
      widget.department,
      'Perú',
    ].where((e) => e != null && e.trim().isNotEmpty).join(', ');
    if (q.trim().isEmpty || q == 'Perú') return null;
    try {
      final locs = await locationFromAddress(q);
      if (locs.isNotEmpty) {
        return LatLng(locs.first.latitude, locs.first.longitude);
      }
    } catch (_) {
      // Sin red / plugin no disponible (web) → se queda en el centro actual.
    }
    return null;
  }

  // ── Animación de cámara (lat/lng/zoom interpolados) ──────
  void _animateTo(LatLng dest) {
    double startLat, startLng, startZoom;
    try {
      final cam = _map.camera;
      startLat = cam.center.latitude;
      startLng = cam.center.longitude;
      startZoom = cam.zoom;
    } catch (_) {
      // Cámara aún no lista → salto directo.
      _map.move(dest, _zoomForRadius(_radiusKm));
      return;
    }

    final endZoom = _zoomForRadius(_radiusKm);
    _moveCtrl?.dispose();
    final ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _moveCtrl = ctrl;
    final curve = CurvedAnimation(parent: ctrl, curve: Curves.easeInOut);
    final latT = Tween(begin: startLat, end: dest.latitude);
    final lngT = Tween(begin: startLng, end: dest.longitude);
    final zT = Tween(begin: startZoom, end: endZoom);
    ctrl.addListener(() {
      _map.move(
        LatLng(latT.evaluate(curve), lngT.evaluate(curve)),
        zT.evaluate(curve),
      );
    });
    ctrl.forward();
  }

  /// Zoom que encuadra el círculo: ~13.5 a 1 km, ~8.5 a 50 km.
  double _zoomForRadius(double km) {
    final z = 14.2 - (math.log(km) / math.ln2);
    return z.clamp(8.0, 15.0);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // Tiles según el tema activo (UX #2.2): claro → CartoDB Voyager,
    // oscuro → CartoDB Dark Matter. Sigue el ThemeMode real de la app.
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tileUrl = isDark
        ? 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
        : 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        Row(
          children: [
            const Icon(Icons.radar_rounded, color: AppColors.primary, size: 18),
            const SizedBox(width: 8),
            Text(
              'Buscar por radio',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        // Mapa con borde redondeado.
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: 220,
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _map,
                  options: MapOptions(
                    initialCenter: _center,
                    initialZoom: _zoomForRadius(_radiusKm),
                    minZoom: 4,
                    maxZoom: 18,
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                    ),
                    onTap: (_, latlng) => setState(() => _center = latlng),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: tileUrl,
                      userAgentPackageName: 'com.servi.mobile',
                    ),
                    CircleLayer(
                      circles: [
                        CircleMarker(
                          point: _center,
                          radius: _radiusKm * 1000,
                          useRadiusInMeter: true,
                          color: AppColors.primary.withValues(alpha: 0.18),
                          borderColor: AppColors.primary,
                          borderStrokeWidth: 2,
                        ),
                      ],
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: _center,
                          width: 40,
                          height: 40,
                          child: const Icon(
                            Icons.location_on,
                            color: AppColors.primary,
                            size: 36,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                // Botón recenter (GPS).
                Positioned(
                  right: 8,
                  bottom: 8,
                  child: Material(
                    color: c.bgCard,
                    shape: const CircleBorder(),
                    elevation: 2,
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _locating
                          ? null
                          : () => _resolveCenter(useGps: true),
                      child: Padding(
                        padding: const EdgeInsets.all(8),
                        child: _locating
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.primary,
                                ),
                              )
                            : const Icon(
                                Icons.my_location_rounded,
                                color: AppColors.primary,
                                size: 18,
                              ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        // Slider de radio.
        Row(
          children: [
            Icon(Icons.zoom_out_map_rounded, color: c.textMuted, size: 16),
            Expanded(
              child: Slider(
                value: _radiusKm,
                min: 1,
                max: 50,
                divisions: 49,
                activeColor: AppColors.primary,
                label: '${_radiusKm.round()} km',
                onChanged: (v) => setState(() => _radiusKm = v),
                onChangeEnd: (v) => _map.move(_center, _zoomForRadius(v)),
              ),
            ),
            SizedBox(
              width: 48,
              child: Text(
                '${_radiusKm.round()} km',
                textAlign: TextAlign.end,
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            onPressed: () =>
                widget.onSearch(_center.latitude, _center.longitude, _radiusKm),
            icon: const Icon(Icons.search_rounded, size: 18),
            label: Text('Buscar en ${_radiusKm.round()} km a la redonda'),
          ),
        ),
      ],
    );
  }
}
