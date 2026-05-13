import 'package:flutter/material.dart';
import '../../data/offer_posts_repository.dart';
import '../../domain/models/offer_post_model.dart';

enum OfferPostsStatus { idle, loading, loaded, error }

class OfferPostsProvider extends ChangeNotifier {
  final _repo = OfferPostsRepository();

  List<OfferPostModel> _offers = [];
  OfferPostsStatus     _status = OfferPostsStatus.idle;
  String?              _error;
  bool                 _isSubmitting = false;

  List<OfferPostModel> get offers      => List.unmodifiable(_offers);
  OfferPostsStatus     get status      => _status;
  String?              get error       => _error;
  bool                 get isSubmitting => _isSubmitting;

  List<OfferPostModel> get activeOffers =>
      _offers.where((o) => o.isActive && !o.isExpired).toList();

  Future<void> load({String? type}) async {
    _status = OfferPostsStatus.loading;
    notifyListeners();
    try {
      _offers = await _repo.getMyOffers(type: type);
      _status = OfferPostsStatus.loaded;
    } catch (e) {
      _error = e.toString();
      _status = OfferPostsStatus.error;
    }
    notifyListeners();
  }

  Future<bool> createOffer({
    required String title,
    required String description,
    double? price,
    String? photoPath,
    String? type,
  }) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      final offer = await _repo.createOffer(
        title: title,
        description: description,
        price: price,
        photoPath: photoPath,
        type: type,
      );
      _offers.insert(0, offer);
      _isSubmitting = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isSubmitting = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteOffer(int offerId) async {
    try {
      await _repo.deleteOffer(offerId);
      _offers.removeWhere((o) => o.id == offerId);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
