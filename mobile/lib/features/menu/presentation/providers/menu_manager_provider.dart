import 'package:flutter/foundation.dart';
import '../../../../core/errors/failures.dart';
import '../../data/menu_repository.dart';
import '../../domain/models/menu_item_model.dart';

enum MenuStatus { idle, loading, loaded, error }

/// Estado de la GESTIÓN de la carta para el panel del proveedor.
/// Scope local (un proveedor) → se provee con ChangeNotifierProvider sobre la
/// pantalla de gestión, no global.
class MenuManagerProvider extends ChangeNotifier {
  MenuManagerProvider(this.providerId);

  final int providerId;
  final MenuRepository _repo = MenuRepository();

  List<MenuItemModel> _items = [];
  MenuStatus _status = MenuStatus.idle;
  String? _error;
  bool _busy = false;

  List<MenuItemModel> get items => List.unmodifiable(_items);
  MenuStatus get status => _status;
  String? get error => _error;
  bool get busy => _busy;

  Future<void> load() async {
    _status = MenuStatus.loading;
    notifyListeners();
    final res = await _repo.getMenu(providerId);
    res.when(
      success: (data) {
        _items = data.allItems..sort((a, b) => a.order.compareTo(b.order));
        _status = MenuStatus.loaded;
        _error = null;
      },
      failure: (e) {
        _error = e.message;
        _status = MenuStatus.error;
      },
    );
    notifyListeners();
  }

  /// Crea (existing == null) o edita un plato. Devuelve null si OK, o el
  /// mensaje de error.
  Future<String?> save({
    MenuItemModel? existing,
    required Map<String, dynamic> payload,
  }) async {
    _busy = true;
    notifyListeners();
    final res = existing == null
        ? await _repo.createItem(providerId, payload)
        : await _repo.updateItem(providerId, existing.id, payload);
    _busy = false;
    final err = res.when(success: (_) => null, failure: (e) => e.message);
    if (err == null) {
      await load();
    } else {
      notifyListeners();
    }
    return err;
  }

  Future<String?> remove(int itemId) async {
    final res = await _repo.deleteItem(providerId, itemId);
    final err = res.when(success: (_) => null, failure: (e) => e.message);
    if (err == null) await load();
    return err;
  }

  Future<void> toggleAvailability(int itemId) async {
    final res = await _repo.toggle(providerId, itemId);
    res.when(success: (_) => load(), failure: (_) {});
  }

  /// Sube una foto y devuelve la URL (o null si falló). No recarga la lista.
  Future<String?> uploadPhoto(String filePath) async {
    _busy = true;
    notifyListeners();
    final res = await _repo.uploadPhoto(providerId, filePath);
    _busy = false;
    notifyListeners();
    return res.when(success: (url) => url, failure: (_) => null);
  }
}
