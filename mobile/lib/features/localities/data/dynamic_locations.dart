import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../../core/constants/peru_locations.dart';
import '../../../core/services/local_cache_service.dart';
import '../domain/locality_extra.dart';
import 'localities_repository.dart';

/// Catálogo combinado: `peru_locations.dart` (estático, baked-in) +
/// extras provenientes del backend (sugeridas por usuarios o por admin).
///
/// Singleton de proceso — sin estado de auth, vive mientras la app esté
/// abierta. El primer `syncFromBackend()` debe llamarse al login o al
/// abrir la pantalla principal; las llamadas siguientes son no-op si
/// ya están en memoria (a menos que `force: true`).
class DynamicLocations extends ChangeNotifier {
  DynamicLocations._();
  static final DynamicLocations instance = DynamicLocations._();

  final LocalitiesRepository _repo = LocalitiesRepository();
  final LocalCacheService _cache = LocalCacheService();

  /// Clave del caché local de localidades extra (Offline-First).
  static const String _cacheKey = 'cache_locality_extras';

  /// Departamentos extra (no presentes en `PeruLocations.departments`).
  final List<String> _extraDepts = [];

  /// Provincias extra por departamento — sólo las que se sumaron por
  /// encima del catálogo estático para ese departamento.
  final Map<String, List<String>> _extraProvs = {};

  /// Distritos extra por provincia.
  final Map<String, List<String>> _extraDists = {};

  bool _synced = false;
  bool _loading = false;

  bool get isSynced => _synced;
  bool get isLoading => _loading;

  /// Catálogo combinado: estático primero, luego los extras al final
  /// (orden alfabético interno en cada bloque).
  List<String> get departments {
    final result = <String>[...PeruLocations.departments];
    for (final d in _extraDepts) {
      if (!result.contains(d)) result.add(d);
    }
    return result;
  }

  List<String> provincesOf(String department) {
    final base = PeruLocations.provincesOf(department);
    final extra = _extraProvs[department] ?? const <String>[];
    if (extra.isEmpty) return base;
    final result = [...base];
    for (final p in extra) {
      if (!result.contains(p)) result.add(p);
    }
    return result;
  }

  List<String> districtsOf(String province) {
    final base = PeruLocations.districtsOf(province);
    final extra = _extraDists[province] ?? const <String>[];
    if (extra.isEmpty) return base;
    final result = [...base];
    for (final d in extra) {
      if (!result.contains(d)) result.add(d);
    }
    return result;
  }

  // ── Sync con backend ───────────────────────────────────────

  /// Trae los extras del backend y los carga en memoria. Idempotente:
  /// si ya se sincronizó en esta sesión y `force` es false, no hace nada.
  Future<void> syncFromBackend({bool force = false}) async {
    if (_loading) return;
    if (_synced && !force) return;
    _loading = true;
    try {
      // 1. CACHE-FIRST: si hay caché válido (≤12h), úsalo YA (la app vuela).
      final cached = await _cache.getData<List<LocalityExtra>>(
        _cacheKey,
        _extrasFromMap,
        maxAge: const Duration(hours: 12),
      );
      if (cached != null) {
        _applyExtras(cached);
        _synced = true;
        notifyListeners();
        // 2. Stale-while-revalidate: refresca en 2º plano SIN notificar
        //    (evita parpadeos). El próximo arranque verá lo más reciente.
        unawaited(_revalidateExtras());
        return;
      }

      // 3. MISS: red. Si responde, cachea y notifica (data vino de red).
      final extras = await _repo.getExtras();
      await _cache.setData<List<LocalityExtra>>(
        _cacheKey,
        extras,
        _extrasToMap,
      );
      _applyExtras(extras);
      _synced = true;
      notifyListeners();
    } catch (e) {
      // 4. Sin internet (o parse) → contingencia: caché EXPIRADO si existe.
      final stale = await _cache.getData<List<LocalityExtra>>(
        _cacheKey,
        _extrasFromMap,
        maxAge: const Duration(days: 3650),
      );
      if (stale != null) {
        _applyExtras(stale);
        _synced = true;
        notifyListeners();
      } else {
        debugPrint('[DynamicLocations] sync error (sin caché): $e');
        // El catálogo estático (peru_locations.dart) sigue funcional.
      }
    } finally {
      _loading = false;
    }
  }

  /// Refresco silencioso del caché en segundo plano: actualiza caché +
  /// memoria SIN `notifyListeners()` (no provoca rebuilds → sin flickering).
  Future<void> _revalidateExtras() async {
    try {
      final extras = await _repo.getExtras();
      await _cache.setData<List<LocalityExtra>>(
        _cacheKey,
        extras,
        _extrasToMap,
      );
      _applyExtras(extras); // silencioso: los getters ya devuelven lo nuevo
    } catch (_) {
      // Mantiene lo que ya estaba si la red falla.
    }
  }

  /// Reemplaza los extras en memoria a partir de una lista (cache o red).
  void _applyExtras(List<LocalityExtra> extras) {
    _extraDepts.clear();
    _extraProvs.clear();
    _extraDists.clear();
    for (final e in extras) {
      _ingestExtra(e);
    }
  }

  static List<LocalityExtra> _extrasFromMap(Map<String, dynamic> m) =>
      ((m['items'] as List?) ?? const [])
          .map(
            (e) => LocalityExtra.fromJson(Map<String, dynamic>.from(e as Map)),
          )
          .toList();

  static Map<String, dynamic> _extrasToMap(List<LocalityExtra> list) => {
    'items': list.map((e) => e.toJson()).toList(),
  };

  /// Llama al endpoint suggest del backend con la ubicación detectada
  /// por GPS. Devuelve la fila guardada (puede ser una existente). Si la
  /// nueva entrada no está en el catálogo estático, también se agrega
  /// al cache local para que los dropdowns la muestren inmediatamente.
  Future<LocalityExtra> suggest({
    required String department,
    String? province,
    String? district,
  }) async {
    final created = await _repo.suggest(
      department: department,
      province: province,
      district: district,
    );
    _ingestExtra(created);
    notifyListeners();
    return created;
  }

  // ── Canonicalización accent-insensitive sobre catálogo combinado ──
  //
  // Mismas semánticas que `PeruLocations.find*Canonical` pero buscando en
  // el catálogo estático + los extras dinámicos. Devuelve la forma
  // canónica que matchea con la BD del backend.

  static String _norm(String? s) {
    if (s == null) return '';
    return s
        .toLowerCase()
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim()
        .replaceAll('á', 'a')
        .replaceAll('é', 'e')
        .replaceAll('í', 'i')
        .replaceAll('ó', 'o')
        .replaceAll('ú', 'u')
        .replaceAll('ü', 'u')
        .replaceAll('ñ', 'n');
  }

  String? findDepartmentCanonical(String? input) {
    if (input == null || input.trim().isEmpty) return null;
    final target = _norm(input);
    for (final d in departments) {
      if (_norm(d) == target) return d;
    }
    return null;
  }

  String? findProvinceCanonical(String? department, String? input) {
    if (department == null || input == null || input.trim().isEmpty)
      return null;
    final target = _norm(input);
    for (final p in provincesOf(department)) {
      if (_norm(p) == target) return p;
    }
    return null;
  }

  String? findDistrictCanonical(String? province, String? input) {
    if (province == null || input == null || input.trim().isEmpty) return null;
    final target = _norm(input);
    for (final d in districtsOf(province)) {
      if (_norm(d) == target) return d;
    }
    return null;
  }

  // ── Internals ──────────────────────────────────────────────

  void _ingestExtra(LocalityExtra e) {
    // Sólo añadimos al cache extra los niveles que NO estén ya en el
    // catálogo estático — el resto se mergea desde `peru_locations.dart`.
    if (!PeruLocations.departments.contains(e.department) &&
        !_extraDepts.contains(e.department)) {
      _extraDepts.add(e.department);
    }
    final prov = e.province;
    if (prov != null && prov.isNotEmpty) {
      final base = PeruLocations.provincesOf(e.department);
      if (!base.contains(prov)) {
        final list = _extraProvs.putIfAbsent(e.department, () => []);
        if (!list.contains(prov)) list.add(prov);
      }
    }
    final dist = e.district;
    if (dist != null && dist.isNotEmpty && prov != null && prov.isNotEmpty) {
      final base = PeruLocations.districtsOf(prov);
      if (!base.contains(dist)) {
        final list = _extraDists.putIfAbsent(prov, () => []);
        if (!list.contains(dist)) list.add(dist);
      }
    }
  }
}
