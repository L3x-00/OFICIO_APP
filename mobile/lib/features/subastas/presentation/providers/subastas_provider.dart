import 'package:flutter/material.dart';
import '../../../../core/errors/failures.dart';
import '../../data/subastas_repository.dart';
import '../../domain/models/service_request_model.dart';

enum SubastasState { idle, loading, success, error }

class SubastasProvider extends ChangeNotifier {
  final SubastasRepository _repo = SubastasRepository();

  // ── Estado cliente ────────────────────────────────────────────
  List<ServiceRequestModel> _myRequests = [];
  List<ServiceRequestModel> get myRequests => _myRequests;

  // ── Estado proveedor ──────────────────────────────────────────
  List<OpportunityModel> _opportunities = [];
  List<OpportunityModel> get opportunities => _opportunities;

  SubastasState _state = SubastasState.idle;
  SubastasState get state => _state;

  String? _error;
  String? get error => _error;

  bool _submitting = false;
  bool get submitting => _submitting;

  // ── CLIENTE: Cargar mis solicitudes ──────────────────────────
  Future<void> loadMyRequests() async {
    _state = SubastasState.loading;
    _error = null;
    notifyListeners();

    final result = await _repo.getMyRequests();
    result.when(
      success: (data) {
        _myRequests = data;
        _state = SubastasState.success;
      },
      failure: (e) {
        _error = e.message;
        _state = SubastasState.error;
      },
    );
    notifyListeners();
  }

  // ── CLIENTE: Publicar solicitud ───────────────────────────────
  Future<bool> createRequest({
    required int categoryId,
    required String description,
    String? photoUrl,
    double? budgetMin,
    double? budgetMax,
    DateTime? desiredDate,
    double? latitude,
    double? longitude,
    String? department,
    String? province,
    String? district,
  }) async {
    _submitting = true;
    _error = null;
    notifyListeners();

    final result = await _repo.createRequest(
      categoryId: categoryId,
      description: description,
      photoUrl: photoUrl,
      budgetMin: budgetMin,
      budgetMax: budgetMax,
      desiredDate: desiredDate,
      latitude: latitude,
      longitude: longitude,
      department: department,
      province: province,
      district: district,
    );

    _submitting = false;
    result.when(
      success: (req) {
        _myRequests = [req, ..._myRequests];
      },
      failure: (e) {
        _error = e.message;
      },
    );
    notifyListeners();
    return result.isSuccess;
  }

  // ── CLIENTE: Aceptar oferta ───────────────────────────────────
  Future<bool> acceptOffer(int offerId, int requestId) async {
    _submitting = true;
    notifyListeners();

    final result = await _repo.acceptOffer(offerId);

    _submitting = false;
    if (result.isSuccess) {
      // Actualizar estado local: la solicitud se cierra
      _myRequests = _myRequests.map((r) {
        if (r.id != requestId) return r;
        final updatedOffers = r.offers.map((o) {
          if (o.id == offerId) return _offerWithStatus(o, OfferStatus.accepted);
          if (o.status == OfferStatus.pending) return _offerWithStatus(o, OfferStatus.rejected);
          return o;
        }).toList();
        return _requestWithStatus(r, ServiceRequestStatus.closed, updatedOffers);
      }).toList();
    } else {
      _error = result.errorMessage;
    }
    notifyListeners();
    return result.isSuccess;
  }

  // ── PROVEEDOR: Cargar oportunidades ──────────────────────────
  Future<void> loadOpportunities(int providerId) async {
    _state = SubastasState.loading;
    _error = null;
    notifyListeners();

    final result = await _repo.getOpportunities(providerId);
    result.when(
      success: (data) {
        _opportunities = data;
        _state = SubastasState.success;
      },
      failure: (e) {
        _error = e.message;
        _state = SubastasState.error;
      },
    );
    notifyListeners();
  }

  // ── PROVEEDOR: Enviar oferta ──────────────────────────────────
  Future<bool> submitOffer({
    required int serviceRequestId,
    required double price,
    required String message,
  }) async {
    _submitting = true;
    _error = null;
    notifyListeners();

    final result = await _repo.submitOffer(
      serviceRequestId: serviceRequestId,
      price: price,
      message: message,
    );

    _submitting = false;
    if (result.isSuccess) {
      // Remover de oportunidades (ya postulé)
      _opportunities = _opportunities.where((o) => o.id != serviceRequestId).toList();
    } else {
      _error = result.errorMessage;
    }
    notifyListeners();
    return result.isSuccess;
  }

  // ── PROVEEDOR: Marcar llegada ─────────────────────────────────
  Future<bool> markArrived({
    required int offerId,
    required double latitude,
    required double longitude,
  }) async {
    _submitting = true;
    notifyListeners();

    final result = await _repo.markArrived(
      offerId: offerId,
      latitude: latitude,
      longitude: longitude,
    );

    _submitting = false;
    if (!result.isSuccess) _error = result.errorMessage;
    notifyListeners();
    return result.isSuccess;
  }

  // ── HELPERS ───────────────────────────────────────────────────

  OfferModel _offerWithStatus(OfferModel o, OfferStatus status) => OfferModel(
        id: o.id,
        serviceRequestId: o.serviceRequestId,
        providerId: o.providerId,
        providerName: o.providerName,
        providerRating: o.providerRating,
        providerTotalReviews: o.providerTotalReviews,
        providerIsTrusted: o.providerIsTrusted,
        providerAvatarUrl: o.providerAvatarUrl,
        price: o.price,
        message: o.message,
        status: status,
        createdAt: o.createdAt,
      );

  ServiceRequestModel _requestWithStatus(
    ServiceRequestModel r,
    ServiceRequestStatus status,
    List<OfferModel> offers,
  ) => ServiceRequestModel(
        id: r.id,
        userId: r.userId,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        categoryIconUrl: r.categoryIconUrl,
        description: r.description,
        photoUrl: r.photoUrl,
        budgetMin: r.budgetMin,
        budgetMax: r.budgetMax,
        desiredDate: r.desiredDate,
        latitude: r.latitude,
        longitude: r.longitude,
        department: r.department,
        province: r.province,
        district: r.district,
        status: status,
        maxOffers: r.maxOffers,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
        offers: offers,
      );
}
