import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/offers_repository.dart';
import '../../domain/models/public_offer_model.dart';

/// Estado de la pantalla de ofertas públicas.
///
/// Filtros soportados:
///   - [providerType]   → 'OFICIO' | 'NEGOCIO' | null (todas)
///   - [categorySlugs]  → multi-select, OR lógico
///   - [department] / [province] / [district] → ubicación
///
/// Tanto el toggle de tipo como el sheet de filtros avanzados pasan por
/// aquí para que las query strings al backend queden coherentes con la
/// UI; nada se filtra solo en cliente.
class PublicOffersProvider extends ChangeNotifier {
  final _repo = OffersRepository();

  List<PublicOfferModel> _offers = [];
  bool   _isLoading  = false;
  bool   _hasMore    = true;
  int    _page       = 1;

  String?       _providerType;
  List<String>  _categorySlugs = const [];
  String?       _department;
  String?       _province;
  String?       _district;

  /// Offer ids del propio user que él decidió ocultar del listado público
  /// (para evitar verse confundido al encontrar su propia oferta).
  /// Persistido en SharedPreferences (`hidden_offer_ids`).
  final Set<int> _hiddenOwnOfferIds = <int>{};
  bool _hiddenLoaded = false;
  static const _hiddenKey = 'hidden_offer_ids';

  Set<int> get hiddenOwnOfferIds => Set.unmodifiable(_hiddenOwnOfferIds);

  Future<void> _loadHiddenIds() async {
    if (_hiddenLoaded) return;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_hiddenKey) ?? const [];
    _hiddenOwnOfferIds
      ..clear()
      ..addAll(raw.map(int.tryParse).whereType<int>());
    _hiddenLoaded = true;
  }

  Future<void> _persistHiddenIds() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(
      _hiddenKey,
      _hiddenOwnOfferIds.map((e) => e.toString()).toList(),
    );
  }

  Future<void> hideOwnOffer(int offerId) async {
    await _loadHiddenIds();
    _hiddenOwnOfferIds.add(offerId);
    await _persistHiddenIds();
    notifyListeners();
  }

  Future<void> unhideOwnOffer(int offerId) async {
    await _loadHiddenIds();
    _hiddenOwnOfferIds.remove(offerId);
    await _persistHiddenIds();
    notifyListeners();
  }

  /// Devuelve las ofertas filtrando las que el user marcó como ocultas.
  List<PublicOfferModel> get visibleOffers =>
      List.unmodifiable(_offers.where((o) => !_hiddenOwnOfferIds.contains(o.id)));

  List<PublicOfferModel> get offers       => List.unmodifiable(_offers);
  bool                   get isLoading    => _isLoading;
  bool                   get hasMore      => _hasMore;
  String?                get providerType => _providerType;
  List<String>           get categorySlugs => List.unmodifiable(_categorySlugs);
  String?                get department   => _department;
  String?                get province     => _province;
  String?                get district     => _district;

  /// True cuando el usuario tiene al menos un filtro avanzado activo. El
  /// pill de tipo no cuenta — sirve para mostrar el badge "punto" sobre el
  /// botón de filtros.
  bool get hasAdvancedFilters =>
      _categorySlugs.isNotEmpty ||
      _department != null ||
      _province   != null ||
      _district   != null;

  /// Carga inicial con la ubicación del usuario. Resetea la paginación.
  Future<void> load({
    String? department,
    String? province,
    String? district,
  }) {
    _department = department;
    _province   = province;
    _district   = district;
    return _fetch(reset: true);
  }

  Future<void> loadMore() {
    if (!_hasMore || _isLoading) return Future.value();
    return _fetch(reset: false);
  }

  Future<void> setProviderType(String? type) {
    if (_providerType == type) return Future.value();
    _providerType = type;
    return _fetch(reset: true);
  }

  /// Aplica un snapshot completo de filtros desde el sheet. Cualquier null
  /// limpia el nivel correspondiente.
  Future<void> applyAdvanced({
    required List<String> categorySlugs,
    String? department,
    String? province,
    String? district,
  }) {
    _categorySlugs = List.unmodifiable(categorySlugs);
    _department    = department;
    _province      = province;
    _district      = district;
    return _fetch(reset: true);
  }

  /// Limpia todos los filtros avanzados. No toca [providerType].
  Future<void> clearAdvanced() {
    _categorySlugs = const [];
    _department    = null;
    _province      = null;
    _district      = null;
    return _fetch(reset: true);
  }

  Future<void> _fetch({required bool reset}) async {
    if (reset) {
      _offers  = [];
      _page    = 1;
      _hasMore = true;
    }
    // Cargamos el set de ocultos en paralelo al primer fetch — usado
    // por `visibleOffers` para filtrar el listado en la UI.
    if (!_hiddenLoaded) await _loadHiddenIds();

    _isLoading = true;
    notifyListeners();

    try {
      final result = await _repo.getOffers(
        categorySlugs: _categorySlugs,
        providerType:  _providerType,
        department:    _department,
        province:      _province,
        district:      _district,
        page:  _page,
        limit: 20,
      );
      _offers.addAll(result.data);
      _hasMore = _page < result.lastPage;
      _page++;
    } catch (_) {
      _hasMore = false;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> reportOffer(int offerId, String reason) async {
    await _repo.reportOffer(offerId, reason);
  }
}
