import 'package:flutter/material.dart';
import '../../data/offers_repository.dart';
import '../../domain/models/public_offer_model.dart';

class PublicOffersProvider extends ChangeNotifier {
  final _repo = OffersRepository();

  List<PublicOfferModel> _offers = [];
  bool   _isLoading  = false;
  bool   _hasMore    = true;
  int    _page       = 1;
  String? _categorySlug;
  String? _department;
  String? _province;
  String? _district;

  List<PublicOfferModel> get offers     => List.unmodifiable(_offers);
  bool                   get isLoading  => _isLoading;
  bool                   get hasMore    => _hasMore;
  String?                get categorySlug => _categorySlug;

  Future<void> load({
    String? categorySlug,
    String? department,
    String? province,
    String? district,
    bool reset = true,
  }) async {
    if (reset) {
      _offers = [];
      _page   = 1;
      _hasMore = true;
      _categorySlug = categorySlug;
      _department   = department;
      _province     = province;
      _district     = district;
    }
    if (!_hasMore || _isLoading) return;

    _isLoading = true;
    notifyListeners();

    try {
      final result = await _repo.getOffers(
        categorySlug: _categorySlug,
        department:   _department,
        province:     _province,
        district:     _district,
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

  Future<void> loadMore() => load(reset: false);

  Future<void> setCategory(String? slug) => load(
    categorySlug: slug,
    department:   _department,
    province:     _province,
    district:     _district,
  );

  Future<void> setLocation({String? department, String? province, String? district}) => load(
    categorySlug: _categorySlug,
    department:   department,
    province:     province,
    district:     district,
  );

  Future<void> reportOffer(int offerId, String reason) async {
    await _repo.reportOffer(offerId, reason);
  }
}
