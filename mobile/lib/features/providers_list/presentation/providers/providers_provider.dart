import 'package:flutter/material.dart';
import '../../../../core/errors/failures.dart';
import '../../data/providers_repository.dart';
import '../../domain/models/provider_model.dart';

enum ViewMode { lista, detalles, mosaicos, contenido }

/// Estado global de la lista de proveedores
class ProvidersProvider extends ChangeNotifier {
  final ProvidersRepository _repo = ProvidersRepository();

  List<ProviderModel> _providers = [];
  List<CategoryModel> _categories = [];
  bool _isLoading = false;
  bool _hasError = false;
  String _errorMessage = '';
  ViewMode _viewMode = ViewMode.detalles;

  // Filtros activos
  String? _selectedCategory;      // slug de subcategoría (hoja)
  String? _expandedParentSlug;    // macrocategoría seleccionada en la barra
  String? _selectedAvailability;
  String? _selectedType;          // null | 'PROFESSIONAL' | 'BUSINESS'
  String? _sortBy;                // null | 'reviews' | 'availability' | 'rating'
  String  _location = '';
  bool    _verifiedOnly = true;   // true = solo verificados (default)
  String  _searchQuery = '';
  // Ubicación estructurada para filtrar por zona
  String? _department;
  String? _province;
  String? _district;

  // ── Getters ───────────────────────────────────────────────
  List<ProviderModel> get providers            => _providers;
  List<CategoryModel> get categories           => _categories;
  bool                get isLoading            => _isLoading;
  bool                get hasError             => _hasError;
  String              get errorMessage         => _errorMessage;
  String?             get selectedCategory     => _selectedCategory;
  String?             get expandedParentSlug   => _expandedParentSlug;
  String?             get selectedAvailability => _selectedAvailability;
  String?             get selectedType         => _selectedType;
  String?             get sortBy               => _sortBy;
  String              get location             => _location;
  bool                get verifiedOnly         => _verifiedOnly;
  String              get searchQuery          => _searchQuery;
  String?             get department           => _department;
  String?             get province             => _province;
  String?             get district             => _district;
  bool                get hasLocationFilter    => _department != null;
  ViewMode            get viewMode             => _viewMode;

  void setViewMode(ViewMode mode) {
    if (_viewMode == mode) return;
    _viewMode = mode;
    notifyListeners();
  }

  /// Devuelve la CategoryModel del padre expandido (o null)
  CategoryModel? get expandedParent => _expandedParentSlug == null
      ? null
      : _categories.where((c) => c.slug == _expandedParentSlug).firstOrNull;

  /// Devuelve las subcategorías del padre expandido (o lista vacía)
  List<CategoryModel> get expandedChildren =>
      expandedParent?.children ?? [];

  /// true cuando hay algún filtro no-default activo (para el badge)
  /// 'rating' no cuenta porque es el orden por defecto del backend
  bool get hasActiveFilters =>
      _selectedAvailability != null ||
      !_verifiedOnly ||
      (_sortBy != null && _sortBy != 'rating') ||
      _location.isNotEmpty ||
      _department != null;

  // ── Carga inicial ─────────────────────────────────────────
  /// [department] / [province] / [district]: ubicación del usuario registrada.
  /// Se aplican desde la primera carga — no hay flash de "todos los proveedores".
  Future<void> init({
    String? department,
    String? province,
    String? district,
  }) async {
    _department = department;
    _province   = province;
    _district   = district;
    await Future.wait([loadCategories(), loadProviders()]);
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
    _isLoading = true;
    _hasError = false;
    notifyListeners();

    final result = await _repo.getProviders(
      categorySlug:       _selectedCategory,
      parentCategorySlug: _selectedCategory == null ? _expandedParentSlug : null,
      availability:       _selectedAvailability,
      verified:           _verifiedOnly ? null : false,
      search:             _searchQuery.isNotEmpty ? _searchQuery : null,
      type:               _selectedType,
      sortBy:             _sortBy,
      location:           _location.isNotEmpty ? _location : null,
      department:         _department,
      province:           _province,
      district:           _district,
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
    String? category,        // subcategoría hoja (desde el sheet)
    String? parentCategory,  // macrocategoría (desde el sheet)
  }) async {
    _selectedAvailability = availability;
    _verifiedOnly         = verifiedOnly;
    _sortBy               = sortBy;
    _location             = location;
    _selectedCategory     = category;
    _expandedParentSlug   = category != null ? (parentCategory ?? _expandedParentSlug) : parentCategory;
    await loadProviders();
  }

  // ── Setters individuales ──────────────────────────────────

  /// Expande una macrocategoría en la barra de filtros y filtra por ella.
  Future<void> setParentCategory(String slug) async {
    _expandedParentSlug = slug;
    _selectedCategory   = null;
    await loadProviders();
  }

  /// Colapsa la vista de subcategorías y limpia el filtro de categoría.
  Future<void> collapseParent() async {
    _expandedParentSlug = null;
    _selectedCategory   = null;
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
  Future<void> setUserLocation({
    String? department,
    String? province,
    String? district,
  }) async {
    _department = department;
    _province   = province;
    _district   = district;
    await loadProviders();
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
    _selectedCategory     = null;
    _expandedParentSlug   = null;
    _selectedAvailability = null;
    _selectedType         = null;
    _sortBy               = null;
    _location             = '';
    _verifiedOnly         = true;
    _searchQuery          = '';
    // No limpia _department/_province/_district — son del perfil del usuario
    loadProviders();
  }

  /// Limpia también los filtros de ubicación del usuario
  void clearLocationFilter() {
    _department = null;
    _province   = null;
    _district   = null;
    loadProviders();
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
}
