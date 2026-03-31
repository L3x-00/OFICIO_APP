import 'package:flutter/material.dart';
import '../../data/providers_repository.dart';
import '../../domain/models/provider_model.dart';

/// Estado global de la lista de proveedores
class ProvidersProvider extends ChangeNotifier {
  final ProvidersRepository _repo = ProvidersRepository();

  List<ProviderModel> _providers = [];
  List<CategoryModel> _categories = [];
  bool _isLoading = false;
  bool _hasError = false;
  String _errorMessage = '';

  // Filtros activos
  String? _selectedCategory;
  String? _selectedAvailability;
  bool _onlyVerified = false;
  String _searchQuery = '';

  // Getters
  List<ProviderModel> get providers => _providers;
  List<CategoryModel> get categories => _categories;
  bool get isLoading => _isLoading;
  bool get hasError => _hasError;
  String get errorMessage => _errorMessage;
  String? get selectedCategory => _selectedCategory;
  String? get selectedAvailability => _selectedAvailability;
  bool get onlyVerified => _onlyVerified;
  String get searchQuery => _searchQuery;

  // ── Carga inicial ─────────────────────────────────────────
  Future<void> init() async {
    await Future.wait([loadCategories(), loadProviders()]);
  }

  // ── Cargar categorías ─────────────────────────────────────
  Future<void> loadCategories() async {
    try {
      _categories = await _repo.getCategories();
      notifyListeners();
    } catch (_) {
      // Silencioso — las categorías no son críticas
    }
  }

  // ── Cargar proveedores ────────────────────────────────────
  Future<void> loadProviders() async {
    _isLoading = true;
    _hasError = false;
    notifyListeners();

    try {
      final response = await _repo.getProviders(
        categorySlug: _selectedCategory,
        availability: _selectedAvailability,
        onlyVerified: _onlyVerified ? true : null,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
      );
      _providers = response.data;
    } catch (e) {
      _hasError = true;
      _errorMessage = 'Error al cargar servicios. Verifica tu conexión.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Aplicar filtros ───────────────────────────────────────
  Future<void> setCategory(String? slug) async {
    _selectedCategory = slug;
    await loadProviders();
  }

  Future<void> setAvailability(String? value) async {
    _selectedAvailability = value;
    await loadProviders();
  }

  Future<void> toggleVerified() async {
    _onlyVerified = !_onlyVerified;
    await loadProviders();
  }

  Future<void> setSearch(String query) async {
    _searchQuery = query;
    await loadProviders();
  }

  void clearFilters() {
    _selectedCategory = null;
    _selectedAvailability = null;
    _onlyVerified = false;
    _searchQuery = '';
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