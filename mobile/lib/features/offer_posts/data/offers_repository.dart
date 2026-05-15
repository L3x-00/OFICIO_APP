import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../domain/models/public_offer_model.dart';

class OffersRepository {
  final Dio _dio = DioClient.instance.dio;

  Future<OffersPage> getOffers({
    String? categorySlug,
    /// Lista de slugs para filtro multi-categoría (OR). Se serializa en CSV
    /// porque el backend espera un query string plano.
    List<String>? categorySlugs,
    /// 'OFICIO' o 'NEGOCIO'. null = ambos.
    String? providerType,
    String? department,
    String? province,
    String? district,
    int page = 1,
    int limit = 20,
  }) async {
    final csv = (categorySlugs == null || categorySlugs.isEmpty)
        ? null
        : categorySlugs.join(',');
    final response = await _dio.get('/offers', queryParameters: {
      'categorySlug':  categorySlug,
      'categorySlugs': csv,
      'providerType':  providerType,
      'department':    department,
      'province':      province,
      'district':      district,
      'page':  page,
      'limit': limit,
    }..removeWhere((_, v) => v == null));
    return OffersPage.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> reportOffer(int offerId, String reason) async {
    await _dio.post('/offers/$offerId/report', data: {'reason': reason});
  }
}
