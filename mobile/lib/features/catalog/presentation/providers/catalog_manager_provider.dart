import 'package:flutter/foundation.dart';
import '../../../../core/errors/failures.dart';
import '../../data/catalog_repository.dart';
import '../../domain/models/catalog_product_model.dart';

enum CatalogStatus { idle, loading, loaded, error }

/// Estado de la GESTIÓN del catálogo para el panel del proveedor.
/// Scope local (un proveedor) → se provee con ChangeNotifierProvider sobre la
/// pantalla de gestión, no global.
class CatalogManagerProvider extends ChangeNotifier {
  CatalogManagerProvider(this.providerId);

  final int providerId;
  final CatalogRepository _repo = CatalogRepository();

  List<CatalogProductModel> _items = [];
  CatalogStatus _status = CatalogStatus.idle;
  String? _error;
  bool _busy = false;

  List<CatalogProductModel> get items => List.unmodifiable(_items);
  CatalogStatus get status => _status;
  String? get error => _error;
  bool get busy => _busy;

  Future<void> load() async {
    _status = CatalogStatus.loading;
    notifyListeners();
    final res = await _repo.getCatalog(providerId);
    res.when(
      success: (data) {
        _items = data.allItems..sort((a, b) => a.order.compareTo(b.order));
        _status = CatalogStatus.loaded;
        _error = null;
      },
      failure: (e) {
        _error = e.message;
        _status = CatalogStatus.error;
      },
    );
    notifyListeners();
  }

  /// Crea (existing == null) o edita un producto. null si OK; si no, el error.
  Future<String?> save({
    CatalogProductModel? existing,
    required Map<String, dynamic> payload,
  }) async {
    _busy = true;
    notifyListeners();
    final res = existing == null
        ? await _repo.createProduct(providerId, payload)
        : await _repo.updateProduct(providerId, existing.id, payload);
    _busy = false;
    final err = res.when(success: (_) => null, failure: (e) => e.message);
    if (err == null) {
      await load();
    } else {
      notifyListeners();
    }
    return err;
  }

  Future<String?> remove(int productId) async {
    final res = await _repo.deleteProduct(providerId, productId);
    final err = res.when(success: (_) => null, failure: (e) => e.message);
    if (err == null) await load();
    return err;
  }

  Future<void> toggleAvailability(int productId) async {
    final res = await _repo.toggle(providerId, productId);
    res.when(success: (_) => load(), failure: (_) {});
  }

  Future<String?> uploadPhoto(String filePath) async {
    _busy = true;
    notifyListeners();
    final res = await _repo.uploadPhoto(providerId, filePath);
    _busy = false;
    notifyListeners();
    return res.when(success: (url) => url, failure: (_) => null);
  }
}
