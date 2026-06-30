import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/socket_service.dart';
import '../../../../core/services/geocoding_service.dart';
import '../../../../shared/widgets/app_network_image.dart';
import '../../../localities/data/dynamic_locations.dart';
import '../../data/providers_repository.dart';
import '../../domain/models/provider_model.dart';

enum ViewMode { lista, detalles, mosaicos, contenido }

/// Estado global de la lista de proveedores
class ProvidersProvider extends ChangeNotifier {
  final ProvidersRepository _repo = ProvidersRepository();

  ProvidersProvider() {
    // Realtime: cuando un proveedor cambia su disponibilidad, el backend
    // emite `providerAvailabilityChanged`. Actualizamos el badge en la lista
    // y en los carruseles sin recargar (incluye la tarjeta del propio
    // proveedor en su pantalla principal).
    SocketService.instance.addAvailabilityListener(_onAvailabilityChanged);
  }

  void _onAvailabilityChanged(Map<String, dynamic> data) {
    final rawId = data['providerId'];
    final id = rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '');
    if (id == null) return;
    final status = AvailabilityStatus.fromString(
      data['availability']?.toString() ?? 'DISPONIBLE',
    );
    var changed = false;
    for (var i = 0; i < _providers.length; i++) {
      if (_providers[i].id == id) {
        _providers[i] = _providers[i].copyWith(availability: status);
        changed = true;
      }
    }
    for (final group in _featuredGroups) {
      for (var i = 0; i < group.providers.length; i++) {
        if (group.providers[i].id == id) {
          group.providers[i] = group.providers[i].copyWith(
            availability: status,
          );
          changed = true;
        }
      }
    }
    if (changed) notifyListeners();
  }

  List<ProviderModel> _providers = [];
  List<CategoryModel> _categories = [];
  // Home agrupada (carruseles por categoría padre) — GET /providers/featured-grouped.
  List<FeaturedGroup> _featuredGroups = [];
  bool _featuredLoading = false;
  bool _isLoading = false;
  bool _hasError = false;
  String _errorMessage = '';
  ViewMode _viewMode = ViewMode.detalles;

  // Filtros activos
  String? _selectedCategory; // slug de subcategoría (hoja)
  String? _expandedParentSlug; // macrocategoría seleccionada en la barra
  String? _selectedAvailability;
  String? _selectedType; // null | 'PROFESSIONAL' | 'BUSINESS'
  String? _sortBy; // null | 'reviews' | 'availability' | 'rating'
  String _location = '';
  bool _verifiedOnly = true; // true = solo verificados (default)
  String _searchQuery = '';
  // Ubicación estructurada para filtrar por zona
  String? _department;
  String? _province;
  String? _district;

  // Preferencia: mostrar cápsulas de categoría en la pantalla principal
  bool _showCategoryFilter = false;

  // ── Ubicación GPS para recarga inteligente ────────────────
  /// Última posición (lat/lng) que se usó para consultar el backend.
  double? _lastQueriedLat;
  double? _lastQueriedLng;

  /// Umbral de distancia (metros) que dispara recarga del backend.
  static const double _reloadDistanceMeters = 2000.0;

  // ── Stream GPS en tiempo real (gestionado por el Provider) ────
  StreamSubscription<Position>? _gpsSub;

  /// Etiqueta de provincia detectada por el stream GPS (sobreescribe
  /// la del filtro para mostrar la zona real al usuario en tiempo real).
  String? _liveProvince;
  String? get liveProvince => _liveProvince;

  /// Distrito detectado por el stream GPS. Junto con [liveProvince] arma
  /// la etiqueta "Distrito · Provincia" en el header de la pantalla
  /// principal.
  String? _liveDistrict;
  String? get liveDistrict => _liveDistrict;

  // ── Búsqueda por radio (radar) — estado persistente (UX #2.4) ──
  /// Activo tras una búsqueda por radio (mapa radar). Mientras esté activo,
  /// la home muestra los resultados del radar en vez de los carruseles. Se
  /// limpia al volver al listado normal ([loadProviders]) o limpiar filtros.
  bool _nearbyActive = false;
  double? _nearbyLat;
  double? _nearbyLng;
  double _nearbyRadiusKm = 5;
  bool get nearbyActive => _nearbyActive;
  double get nearbyRadiusKm => _nearbyRadiusKm;

  // ── Getters ───────────────────────────────────────────────
  List<ProviderModel> get providers => _providers;
  List<CategoryModel> get categories => _categories;
  List<FeaturedGroup> get featuredGroups => _featuredGroups;
  bool get featuredLoading => _featuredLoading;
  bool get isLoading => _isLoading;
  bool get hasError => _hasError;
  String get errorMessage => _errorMessage;
  String? get selectedCategory => _selectedCategory;
  String? get expandedParentSlug => _expandedParentSlug;
  String? get selectedAvailability => _selectedAvailability;
  String? get selectedType => _selectedType;
  String? get sortBy => _sortBy;
  String get location => _location;
  bool get verifiedOnly => _verifiedOnly;
  String get searchQuery => _searchQuery;
  String? get department => _department;
  String? get province => _province;
  String? get district => _district;
  bool get hasLocationFilter => _department != null;
  ViewMode get viewMode => _viewMode;
  bool get showCategoryFilter => _showCategoryFilter;

  void setViewMode(ViewMode mode) {
    if (_viewMode == mode) return;
    _viewMode = mode;
    notifyListeners();
  }

  Future<void> loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    _showCategoryFilter = prefs.getBool('showCategoryFilter') ?? false;
    notifyListeners();
  }

  Future<void> toggleCategoryFilter() async {
    _showCategoryFilter = !_showCategoryFilter;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('showCategoryFilter', _showCategoryFilter);
  }

  /// Devuelve la CategoryModel del padre expandido (o null)
  CategoryModel? get expandedParent => _expandedParentSlug == null
      ? null
      : _categories.where((c) => c.slug == _expandedParentSlug).firstOrNull;

  /// Devuelve las subcategorías del padre expandido (o lista vacía)
  List<CategoryModel> get expandedChildren => expandedParent?.children ?? [];

  /// true cuando hay algún filtro no-default activo (para el badge)
  /// 'rating' no cuenta porque es el orden por defecto del backend
  bool get hasActiveFilters =>
      _selectedAvailability != null ||
      !_verifiedOnly ||
      (_sortBy != null && _sortBy != 'rating') ||
      _location.isNotEmpty ||
      _department != null;

  // ── Persistencia de ubicación ─────────────────────────────
  // Antes la ubicación vivía solo en memoria: cerrar la app o reiniciar
  // el provider la perdía y el catálogo volvía a "todos". Ahora se
  // guarda en SharedPreferences y se hidrata en `init()`, lo que el
  // usuario eligió persiste hasta que se mueva físicamente (stream GPS
  // actualiza ≥2km o cambio de distrito/provincia).
  static const _kLocDept = 'loc_department';
  static const _kLocProv = 'loc_province';
  static const _kLocDist = 'loc_district';
  static const _kLocLat = 'loc_last_lat';
  static const _kLocLng = 'loc_last_lng';
  // Estado del radar (búsqueda por radio) persistido entre sesiones.
  static const _kNearbyActive = 'nearby_active';
  static const _kNearbyLat = 'nearby_lat';
  static const _kNearbyLng = 'nearby_lng';
  static const _kNearbyRadius = 'nearby_radius';

  Future<void> _persistLocation() async {
    final prefs = await SharedPreferences.getInstance();
    Future<void> setOrRemove(String key, String? value) async {
      if (value == null || value.isEmpty) {
        await prefs.remove(key);
      } else {
        await prefs.setString(key, value);
      }
    }

    await setOrRemove(_kLocDept, _department);
    await setOrRemove(_kLocProv, _province);
    await setOrRemove(_kLocDist, _district);
    if (_lastQueriedLat != null && _lastQueriedLng != null) {
      await prefs.setDouble(_kLocLat, _lastQueriedLat!);
      await prefs.setDouble(_kLocLng, _lastQueriedLng!);
    } else {
      await prefs.remove(_kLocLat);
      await prefs.remove(_kLocLng);
    }
  }

  Future<void> _hydrateLocation() async {
    final prefs = await SharedPreferences.getInstance();
    _department = prefs.getString(_kLocDept);
    _province = prefs.getString(_kLocProv);
    _district = prefs.getString(_kLocDist);
    _lastQueriedLat = prefs.getDouble(_kLocLat);
    _lastQueriedLng = prefs.getDouble(_kLocLng);
    // Radar (búsqueda por radio): se mantiene activo entre sesiones.
    _nearbyActive = prefs.getBool(_kNearbyActive) ?? false;
    _nearbyLat = prefs.getDouble(_kNearbyLat);
    _nearbyLng = prefs.getDouble(_kNearbyLng);
    _nearbyRadiusKm = prefs.getDouble(_kNearbyRadius) ?? 5;
    if (_nearbyLat == null || _nearbyLng == null) _nearbyActive = false;
  }

  /// Persiste el estado del radar. Separado de [_persistLocation] para que el
  /// orden de llamadas no pise el flag (loadProviders lo limpia DESPUÉS).
  Future<void> _persistNearby() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kNearbyActive, _nearbyActive);
    if (_nearbyActive && _nearbyLat != null && _nearbyLng != null) {
      await prefs.setDouble(_kNearbyLat, _nearbyLat!);
      await prefs.setDouble(_kNearbyLng, _nearbyLng!);
      await prefs.setDouble(_kNearbyRadius, _nearbyRadiusKm);
    } else {
      await prefs.remove(_kNearbyLat);
      await prefs.remove(_kNearbyLng);
      await prefs.remove(_kNearbyRadius);
    }
  }

  // ── Carga inicial ─────────────────────────────────────────
  /// [department] / [province] / [district]: ubicación del usuario registrada.
  /// Se aplican desde la primera carga — no hay flash de "todos los proveedores".
  ///
  /// Hidrata primero los valores persistidos en SharedPreferences. Si no
  /// hay nada guardado, cae a los args (perfil del user). Así una vez
  /// que el usuario eligió "ubicación actual", su zona se respeta entre
  /// sesiones aunque el perfil tenga otro departamento.
  Future<void> init({
    String? department,
    String? province,
    String? district,
  }) async {
    await _hydrateLocation();
    if (_department == null && department != null) {
      _department = department;
      _province = province;
      _district = district;
    }
    // Si el radar quedó activo en una sesión previa, restauramos esos
    // resultados (en vez del listado normal) para que el filtro de radio
    // persista hasta que el usuario lo cambie o limpie (UX #2.4).
    await Future.wait([
      loadCategories(),
      if (_nearbyActive && _nearbyLat != null && _nearbyLng != null)
        applyNearby(
          latitude: _nearbyLat!,
          longitude: _nearbyLng!,
          radiusKm: _nearbyRadiusKm,
        )
      else
        loadProviders(),
      loadFeatured(),
      loadPreferences(),
    ]);
  }

  // ── Cargar home agrupada (carruseles) ─────────────────────
  /// Best-effort: si falla, la home cae al listado paginado normal.
  /// Pasa province/department para que el backend filtre por zona del usuario.
  Future<void> loadFeatured() async {
    _featuredLoading = true;
    notifyListeners();
    final result = await _repo.getFeaturedGrouped(
      province: _province,
      department: _department,
    );
    if (result.isSuccess) _featuredGroups = result.data;
    _featuredLoading = false;
    notifyListeners();
  }

  /// Pre-carga las portadas de los primeros proveedores destacados al caché
  /// (mismo cacheKey estable del render) para que el Home pinte instantáneo
  /// al entrar — clave en invitado con caché frío. Best-effort, no bloquea.
  /// Recibe el [context] del screen porque precacheImage lo requiere.
  Future<void> precacheFeaturedCovers(
    BuildContext context, {
    int max = 8,
  }) async {
    var count = 0;
    for (final group in _featuredGroups) {
      for (final p in group.providers) {
        final url = p.coverImageUrl;
        if (url == null || url.isEmpty) continue;
        if (!context.mounted) return;
        AppNetworkImage.precache(url, context);
        if (++count >= max) return;
      }
    }
  }

  // ── Cargar categorías ─────────────────────────────────────
  Future<void> loadCategories() async {
    final result = await _repo.getCategories();
    if (result.isSuccess) {
      _categories = result.data;
      notifyListeners();
    }
    // Silencioso en fallo — las categorías no son críticas
  }

  // ── Cargar proveedores ────────────────────────────────────
  Future<void> loadProviders() async {
    // Volver al listado normal desactiva el modo radar. Si estaba activo,
    // persistimos el cambio para que no resucite al reiniciar la app.
    final wasNearby = _nearbyActive;
    _nearbyActive = false;
    _isLoading = true;
    _hasError = false;
    notifyListeners();
    if (wasNearby) unawaited(_persistNearby());

    final result = await _repo.getProviders(
      categorySlug: _selectedCategory,
      parentCategorySlug: _selectedCategory == null
          ? _expandedParentSlug
          : null,
      availability: _selectedAvailability,
      verified: _verifiedOnly ? null : false,
      search: _searchQuery.isNotEmpty ? _searchQuery : null,
      type: _selectedType,
      sortBy: _sortBy,
      location: _location.isNotEmpty ? _location : null,
      department: _department,
      province: _province,
      district: _district,
    );

    result.when(
      success: (response) => _providers = response.data,
      failure: (e) {
        _hasError = true;
        _errorMessage = e.message;
      },
    );

    _isLoading = false;
    notifyListeners();
  }

  // ── Aplicar múltiples filtros de una sola vez ─────────────
  Future<void> applyFilters({
    String? availability,
    bool verifiedOnly = true,
    String? sortBy,
    String location = '',
    String? category, // subcategoría hoja (desde el sheet)
    String? parentCategory, // macrocategoría (desde el sheet)
    // Ubicación estructurada (jerarquía peruana). Pasar `null` mantiene el
    // valor previo NO es lo deseado aquí: el sheet aplica una snapshot
    // completa, así que un `null` explícito significa "limpiar este nivel".
    String? department,
    String? province,
    String? district,
    bool clearLocation = false,
  }) async {
    _selectedAvailability = availability;
    _verifiedOnly = verifiedOnly;
    _sortBy = sortBy;
    _location = location;
    _selectedCategory = category;
    _expandedParentSlug = category != null
        ? (parentCategory ?? _expandedParentSlug)
        : parentCategory;
    if (clearLocation) {
      _department = null;
      _province = null;
      _district = null;
    } else {
      // Siempre actualizar los 3 niveles. null en prov/dist = búsqueda ampliada.
      _department = department;
      _province = province;
      _district = district;
    }
    // Persist el snapshot del sheet — el chip único del header debe
    // reflejar lo elegido aquí y mantenerlo tras reinicio.
    await _persistLocation();
    await Future.wait([loadProviders(), loadFeatured()]);
  }

  // ── Búsqueda por radio (mapa radar del filtro) ────────────
  /// Reemplaza la lista por los proveedores dentro del [radiusKm] alrededor
  /// del punto dado (GET /providers/nearby), respetando los filtros activos
  /// (categoría / tipo / texto). No MODIFICA esos filtros: un refresh (pull) o
  /// cualquier cambio de filtro vuelve al listado normal vía [loadProviders].
  Future<void> applyNearby({
    required double latitude,
    required double longitude,
    required double radiusKm,
  }) async {
    _isLoading = true;
    _hasError = false;
    // Activa el modo radar: la home mostrará estos resultados (no carruseles)
    // y el radio queda persistido para sobrevivir navegación/reinicio.
    _nearbyActive = true;
    _nearbyLat = latitude;
    _nearbyLng = longitude;
    _nearbyRadiusKm = radiusKm;
    notifyListeners();

    final result = await _repo.getNearby(
      latitude: latitude,
      longitude: longitude,
      radiusKm: radiusKm,
      // La búsqueda por radio respeta los filtros activos del listado.
      categorySlug: _selectedCategory,
      parentCategorySlug: _selectedCategory == null
          ? _expandedParentSlug
          : null,
      type: _selectedType,
      search: _searchQuery.isNotEmpty ? _searchQuery : null,
    );
    result.when(
      success: (list) => _providers = list,
      failure: (e) {
        _hasError = true;
        _errorMessage = e.message;
      },
    );

    await _persistNearby();
    _isLoading = false;
    notifyListeners();
  }

  // ── Setters individuales ──────────────────────────────────

  /// Expande una macrocategoría en la barra de filtros y filtra por ella.
  Future<void> setParentCategory(String slug) async {
    _expandedParentSlug = slug;
    _selectedCategory = null;
    await loadProviders();
  }

  /// Colapsa la vista de subcategorías y limpia el filtro de categoría.
  Future<void> collapseParent() async {
    _expandedParentSlug = null;
    _selectedCategory = null;
    await loadProviders();
  }

  Future<void> setCategory(String? slug) async {
    _selectedCategory = slug;
    // Mantiene _expandedParentSlug para que el usuario siga viendo subcategorías
    await loadProviders();
  }

  Future<void> setAvailability(String? value) async {
    _selectedAvailability = value;
    await loadProviders();
  }

  Future<void> setType(String? type) async {
    _selectedType = type;
    await loadProviders();
  }

  Future<void> setSortBy(String? value) async {
    _sortBy = value;
    await loadProviders();
  }

  Future<void> setLocation(String value) async {
    _location = value;
    await loadProviders();
  }

  /// Aplica el filtro de ubicación estructurado (jerarquía peruana).
  /// Llamar desde AuthProvider cuando el usuario actualiza su ubicación.
  ///
  /// Persiste el snapshot en SharedPreferences para sobrevivir reinicios:
  /// la única forma de cambiar la zona es que el usuario la edite o que
  /// el stream GPS detecte movimiento ≥2km / cambio de distrito.
  Future<void> setUserLocation({
    String? department,
    String? province,
    String? district,
  }) async {
    _department = department;
    _province = province;
    _district = district;
    await _persistLocation();
    await Future.wait([loadProviders(), loadFeatured()]);
  }

  Future<void> setVerifiedOnly(bool value) async {
    _verifiedOnly = value;
    await loadProviders();
  }

  Future<void> setSearch(String query) async {
    _searchQuery = query;
    await loadProviders();
  }

  void clearFilters() {
    _selectedCategory = null;
    _expandedParentSlug = null;
    _selectedAvailability = null;
    _selectedType = null;
    _sortBy = null;
    _location = '';
    _verifiedOnly = true;
    _searchQuery = '';
    // No limpia _department/_province/_district — son del perfil del usuario
    loadProviders();
  }

  /// Limpia también los filtros de ubicación del usuario y borra la
  /// copia persistida — al volver a abrir la app no habrá zona activa
  /// hasta que se vuelva a detectar / elegir.
  Future<void> clearLocationFilter() async {
    _department = null;
    _province = null;
    _district = null;
    _lastQueriedLat = null;
    _lastQueriedLng = null;
    await _persistLocation();
    await Future.wait([loadProviders(), loadFeatured()]);
  }

  // ── Actualización GPS en tiempo real ─────────────────────

  /// Llama desde el stream GPS de la pantalla principal.
  /// [lat]/[lng]: posición actual.
  /// [newProvince]/[newDistrict]: resultado de geocodificación inversa.
  ///
  /// Regla de recarga — dispara `loadProviders()` solo si:
  ///   a) La nueva posición está ≥ 2 km de la última consultada, O
  ///   b) La provincia o distrito cambió.
  /// En ambos casos actualiza también la ubicación del filtro.
  Future<void> updateLocationFromGps({
    required double lat,
    required double lng,
    required String? newDepartment,
    required String? newProvince,
    required String? newDistrict,
  }) async {
    if (newProvince == null || newDistrict == null || newDepartment == null) {
      return;
    }

    final zoneChanged = newProvince != _province || newDistrict != _district;
    final distFar =
        _lastQueriedLat != null &&
        _haversineMeters(_lastQueriedLat!, _lastQueriedLng!, lat, lng) >=
            _reloadDistanceMeters;

    if (!zoneChanged && !distFar) return;

    _department = newDepartment;
    _province = newProvince;
    _district = newDistrict;
    _lastQueriedLat = lat;
    _lastQueriedLng = lng;

    // Persiste el snapshot — `_lastQueriedLat/Lng` también, para que
    // tras reiniciar la app el umbral de 2 km siga aplicando sobre la
    // última posición conocida (no contra null).
    await _persistLocation();
    await Future.wait([loadProviders(), loadFeatured()]);
  }

  /// Haversine — retorna distancia en metros entre dos coordenadas.
  static double _haversineMeters(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const r = 6371000.0;
    final dLat = _rad(lat2 - lat1);
    final dLng = _rad(lng2 - lng1);
    final a =
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_rad(lat1)) *
            math.cos(_rad(lat2)) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  }

  static double _rad(double deg) => deg * math.pi / 180;

  /// Refresca los datos de un proveedor concreto desde el backend y
  /// reemplaza la copia en memoria (lista pública). Útil tras dejar una
  /// reseña o recomendar — los contadores `averageRating`, `totalReviews`
  /// y `totalRecommendations` quedan al instante con el valor real.
  ///
  /// Devuelve el modelo refrescado para que el caller (p. ej. el detail
  /// sheet) pueda usarlo directamente, o `null` si la consulta falló.
  Future<ProviderModel?> refreshProvider(int id) async {
    final result = await _repo.getProviderDetail(id);
    if (!result.isSuccess) return null;
    final updated = result.data;
    final idx = _providers.indexWhere((p) => p.id == id);
    if (idx != -1) {
      // Preserva el flag de favorito local — el endpoint /providers/:id no
      // siempre incluye el contexto del usuario actual.
      final wasFav = _providers[idx].isFavorite;
      _providers[idx] = updated.copyWith(isFavorite: wasFav);
      notifyListeners();
    }
    return updated;
  }

  // ── Toggle favorito (local) ───────────────────────────────
  void toggleFavorite(int providerId) {
    final idx = _providers.indexWhere((p) => p.id == providerId);
    if (idx != -1) {
      _providers[idx] = _providers[idx].copyWith(
        isFavorite: !_providers[idx].isFavorite,
      );
      notifyListeners();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // GPS — Detección puntual + Stream en segundo plano
  // ═══════════════════════════════════════════════════════════

  /// Detecta la ubicación actual del usuario por GPS y la aplica como filtro.
  ///
  /// Pipeline:
  ///   1. Solicita permisos de ubicación (si están denegados, muestra SnackBar).
  ///   2. Lee posición con baja precisión (rápido).
  ///   3. Reverse geocoding → department/province/district.
  ///   4. Sanea contra el catálogo dinámico (estático + extras backend).
  ///   5. Si la ubicación no está en el catálogo, ofrece añadirla.
  ///   6. Aplica el filtro vía [setUserLocation].
  ///
  /// [context] se usa SOLO para mostrar SnackBars de feedback al usuario.
  /// Si se pasa `null`, los errores se silencian y la función simplemente
  /// retorna `false`. Devuelve `true` si el filtro se aplicó correctamente.
  Future<bool> detectAndSetGpsLocation(BuildContext? context) async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (context == null || !context.mounted) return false;
        _showSnack(context, 'Permiso de ubicación denegado');
        return false;
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
      if (geo == null) {
        if (context == null || !context.mounted) return false;
        _showSnack(context, 'No pudimos detectar tu ubicación');
        return false;
      }
      // Sanea contra catálogo combinado (estático + extras de backend).
      final dyn = DynamicLocations.instance;
      final d = dyn.findDepartmentCanonical(geo.department);
      if (d == null) {
        // No matchea ni catálogo estático ni extras — ofrecer añadir.
        if (context == null || !context.mounted) return false;
        _offerAddToCatalog(
          context: context,
          dept: geo.department,
          prov: geo.province,
          dist: geo.district,
        );
        return false;
      }
      final p = dyn.findProvinceCanonical(d, geo.province);
      final di = dyn.findDistrictCanonical(p, geo.district);
      await setUserLocation(department: d, province: p, district: di);
      return true;
    } catch (_) {
      if (context == null || !context.mounted) return false;
      _showSnack(context, 'No se pudo obtener la ubicación');
      return false;
    }
  }

  /// Helper interno — muestra un SnackBar si hay context válido.
  void _showSnack(BuildContext? context, String msg) {
    if (context == null || !context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  /// SnackBar con acción "Añadir al catálogo". Si el usuario acepta, llama
  /// al backend (POST /localities/suggest), refresca el catálogo dinámico
  /// y aplica el filtro con la nueva ubicación.
  void _offerAddToCatalog({
    required BuildContext? context,
    required String? dept,
    String? prov,
    String? dist,
  }) {
    if (context == null || !context.mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    final label = [
      if (dist != null && dist.isNotEmpty) dist,
      if (prov != null && prov.isNotEmpty) prov,
      if (dept != null && dept.isNotEmpty) dept,
    ].join(', ');

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          duration: const Duration(seconds: 8),
          content: Text(
            'Tu ubicación ($label) no está en el catálogo.',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          action: (dept != null && dept.isNotEmpty)
              ? SnackBarAction(
                  label: 'Añadir',
                  onPressed: () => _suggestAndApply(context, dept, prov, dist),
                )
              : null,
        ),
      );
  }

  Future<void> _suggestAndApply(
    BuildContext context,
    String dept,
    String? prov,
    String? dist,
  ) async {
    try {
      final created = await DynamicLocations.instance.suggest(
        department: dept,
        province: prov,
        district: dist,
      );
      await setUserLocation(
        department: created.department,
        province: created.province,
        district: created.district,
      );
      if (!context.mounted) return;
      _showSnack(context, 'Ubicación añadida al catálogo');
    } catch (e) {
      if (!context.mounted) return;
      _showSnack(context, 'No se pudo añadir: $e');
    }
  }

  // ── Stream GPS en segundo plano ─────────────────────────────

  /// Arranca el stream de posición — solo actualiza [liveProvince] y, si la
  /// posición se aleja >= 2 km del último query o cambia de zona, dispara
  /// una recarga del backend.
  ///
  /// Idempotente: si ya hay un stream activo, no abre otro.
  Future<void> startGpsStream() async {
    if (_gpsSub != null) return;
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied ||
        perm == LocationPermission.deniedForever) {
      return;
    }

    const settings = LocationSettings(
      accuracy: LocationAccuracy.medium,
      distanceFilter: 100, // metros
    );

    _gpsSub = Geolocator.getPositionStream(locationSettings: settings).listen(
      _onStreamPosition,
      onError: (_) {
        /* silent fallback */
      },
    );
  }

  /// Detiene el stream GPS y libera recursos. Llamar en dispose() y al
  /// pausar la app (didChangeAppLifecycleState).
  void stopGpsStream() {
    _gpsSub?.cancel();
    _gpsSub = null;
  }

  Future<void> _onStreamPosition(Position pos) async {
    final geo = await GeocodingService.reverseGeocode(
      pos.latitude,
      pos.longitude,
      force: true,
    );
    if (geo == null) return;

    // 1. Actualiza el label de la pill (sin recargar el backend). Provincia
    //    y distrito se sincronizan por separado: cualquiera de los dos que
    //    cambie redibuja el chip del greeting header.
    final provChanged = geo.province != _liveProvince;
    final distChanged = geo.district != _liveDistrict;
    if (provChanged || distChanged) {
      _liveProvince = geo.province;
      _liveDistrict = geo.district;
      notifyListeners();
    }

    // 2. Si la zona cambió o la distancia >= 2 km, recarga el backend.
    await updateLocationFromGps(
      lat: pos.latitude,
      lng: pos.longitude,
      newDepartment: geo.department,
      newProvince: geo.province,
      newDistrict: geo.district,
    );
  }

  @override
  void dispose() {
    SocketService.instance.removeAvailabilityListener(_onAvailabilityChanged);
    _gpsSub?.cancel();
    super.dispose();
  }
}
