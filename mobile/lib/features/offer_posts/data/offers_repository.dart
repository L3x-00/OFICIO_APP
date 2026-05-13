import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../domain/models/public_offer_model.dart';

class OffersRepository {
  final Dio _dio = DioClient.instance.dio;

  Future<OffersPage> getOffers({
    String? categorySlug,
    String? department,
    String? province,
    String? district,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get('/offers', queryParameters: {
      'categorySlug': categorySlug,
      'department':   department,
      'province':     province,
      'district':     district,
      'page':  page,
      'limit': limit,
    }..removeWhere((_, v) => v == null));
    return OffersPage.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> reportOffer(int offerId, String reason) async {
    await _dio.post('/offers/$offerId/report', data: {'reason': reason});
  }
}
