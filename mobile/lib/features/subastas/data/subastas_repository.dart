import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';
import '../domain/models/service_request_model.dart';

class SubastasRepository {
  final Dio _dio = DioClient.instance.dio;

  AppException _handleDio(DioException e, String fallback) =>
      e.error is AppException ? e.error as AppException : ServerException(e.message ?? fallback);

  // ── CLIENTE ───────────────────────────────────────────────────

  Future<ApiResult<ServiceRequestModel>> createRequest({
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
    try {
      final res = await _dio.post('/subastas/requests', data: {
        'categoryId': categoryId,
        'description': description,
        'photoUrl': ?photoUrl,
        'budgetMin': ?budgetMin,
        'budgetMax': ?budgetMax,
        if (desiredDate != null) 'desiredDate': desiredDate.toIso8601String(),
        'latitude': ?latitude,
        'longitude': ?longitude,
        'department': ?department,
        'province': ?province,
        'district': ?district,
      });
      return Success(ServiceRequestModel.fromJson(res.data as Map<String, dynamic>));
    } on DioException catch (e) {
      return Failure(_handleDio(e, 'Error al publicar solicitud'));
    }
  }

  Future<ApiResult<List<ServiceRequestModel>>> getMyRequests() async {
    try {
      final res = await _dio.get('/subastas/requests/mine');
      final list = (res.data as List)
          .map((j) => ServiceRequestModel.fromJson(j as Map<String, dynamic>))
          .toList();
      return Success(list);
    } on DioException catch (e) {
      return Failure(_handleDio(e, 'Error al obtener solicitudes'));
    }
  }

  Future<ApiResult<Map<String, dynamic>>> acceptOffer(int offerId) async {
    try {
      final res = await _dio.post('/subastas/requests/accept', data: {'offerId': offerId});
      return Success(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      return Failure(_handleDio(e, 'Error al aceptar oferta'));
    }
  }

  // ── PROVEEDOR ─────────────────────────────────────────────────

  Future<ApiResult<List<OpportunityModel>>> getOpportunities(int providerId) async {
    try {
      final res = await _dio.get('/subastas/opportunities/$providerId');
      final list = (res.data as List)
          .map((j) => OpportunityModel.fromJson(j as Map<String, dynamic>))
          .toList();
      return Success(list);
    } on DioException catch (e) {
      return Failure(_handleDio(e, 'Error al obtener oportunidades'));
    }
  }

  Future<ApiResult<Map<String, dynamic>>> submitOffer({
    required int serviceRequestId,
    required double price,
    required String message,
  }) async {
    try {
      final res = await _dio.post('/subastas/offers', data: {
        'serviceRequestId': serviceRequestId,
        'price': price,
        'message': message,
      });
      return Success(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      return Failure(_handleDio(e, 'Error al enviar oferta'));
    }
  }

  Future<ApiResult<Map<String, dynamic>>> withdrawOffer(int offerId) async {
    try {
      final res = await _dio.delete('/subastas/offers/$offerId');
      return Success(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      return Failure(_handleDio(e, 'Error al retirar oferta'));
    }
  }

  Future<ApiResult<Map<String, dynamic>>> markArrived({
    required int offerId,
    required double latitude,
    required double longitude,
  }) async {
    try {
      final res = await _dio.post('/subastas/offers/arrived', data: {
        'offerId': offerId,
        'latitude': latitude,
        'longitude': longitude,
      });
      return Success(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      return Failure(_handleDio(e, 'Error al marcar llegada'));
    }
  }
}
