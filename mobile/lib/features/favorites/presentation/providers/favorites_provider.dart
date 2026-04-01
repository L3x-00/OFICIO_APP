import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/utils/logger.dart';
import '../../../providers_list/domain/models/provider_model.dart';

/// Estado global de favoritos
/// Al estar en el árbol de widgets desde main.dart,
/// cualquier pantalla puede acceder y reaccionar a los cambios
class FavoritesProvider extends ChangeNotifier {
  final Dio _dio = DioClient.instance.dio;

  List<ProviderModel> _favorites = [];
  Set<int> _favoriteIds = {}; // Para verificación O(1)
  bool _isLoading = false;
  int? _userId;

  List<ProviderModel> get favorites    => _favorites;
  Set<int>  get favoriteIds  => _favoriteIds;
  bool      get isLoading    => _isLoading;

  bool isFavorite(int providerId) => _favoriteIds.contains(providerId);

  // ── Inicializar con el userId del usuario logueado ────────
  Future<void> initialize(int userId) async {
    _userId = userId;
    await loadFavorites();
  }

  // ── Cargar favoritos desde el backend ────────────────────
  Future<void> loadFavorites() async {
    if (_userId == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      final response = await _dio.get('/favorites/$_userId');
      final list = response.data as List;

      _favorites = list
          .map((p) => ProviderModel.fromJson(p as Map<String, dynamic>))
          .toList();

      // Actualizar el Set de IDs para verificación rápida
      _favoriteIds = _favorites.map((p) => p.id).toSet();

      AppLogger.success('Favoritos cargados: ${_favorites.length}');
    } catch (e) {
      AppLogger.error('Error cargando favoritos', e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ── Toggle favorito ───────────────────────────────────────
  Future<void> toggle(int providerId) async {
    if (_userId == null) return;

    // Optimistic update: actualizar UI antes de la respuesta
    final wasAdded = _favoriteIds.contains(providerId);
    if (wasAdded) {
      _favoriteIds.remove(providerId);
      _favorites.removeWhere((p) => p.id == providerId);
    } else {
      _favoriteIds.add(providerId);
      // La info completa la recargamos del backend
    }
    notifyListeners();

    try {
      await _dio.post('/favorites/$_userId/$providerId');

      // Si se agregó, recargar para tener los datos completos
      if (!wasAdded) {
        await loadFavorites();
      }

      AppLogger.success(
        wasAdded ? 'Favorito eliminado' : 'Favorito agregado',
      );
    } catch (e) {
      // Revertir el optimistic update si falló
      if (wasAdded) {
        _favoriteIds.add(providerId);
      } else {
        _favoriteIds.remove(providerId);
        _favorites.removeWhere((p) => p.id == providerId);
      }
      notifyListeners();
      AppLogger.error('Error en toggle favorito', e);
    }
  }

  // ── Limpiar al hacer logout ───────────────────────────────
  void clear() {
    _favorites  = [];
    _favoriteIds = {};
    _userId     = null;
    notifyListeners();
  }
}