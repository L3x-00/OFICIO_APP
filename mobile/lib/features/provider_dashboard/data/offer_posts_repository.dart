import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../domain/models/offer_post_model.dart';

class OfferPostsRepository {
  final Dio _dio = DioClient.instance.dio;

  Future<List<OfferPostModel>> getMyOffers({String? type}) async {
    final response = await _dio.get(
      '/providers/me/offers',
      queryParameters: type != null ? {'type': type} : null,
    );
    return (response.data as List)
        .map((j) => OfferPostModel.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<OfferPostModel> createOffer({
    required String title,
    required String description,
    double? price,
    String? photoPath,
    String? type,
  }) async {
    final data = FormData.fromMap({
      'title':       title,
      'description': description,
      if (price != null) 'price': price.toString(),
      if (photoPath != null)
        'photo': await MultipartFile.fromFile(photoPath, filename: 'offer.jpg'),
    });
    final response = await _dio.post(
      '/providers/me/offers',
      data: data,
      queryParameters: type != null ? {'type': type} : null,
    );
    return OfferPostModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteOffer(int offerId) async {
    await _dio.delete('/providers/me/offers/$offerId');
  }

  /// Edita una oferta existente. Si [photoPath] viene, reemplaza la foto;
  /// si [resetDuration] es true, el backend reinicia expiresAt al tope
  /// del plan vigente.
  Future<OfferPostModel> updateOffer({
    required int offerId,
    String? title,
    String? description,
    double? price,
    String? photoPath,
    bool? resetDuration,
  }) async {
    final data = FormData.fromMap({
      if (title       != null) 'title':       title,
      if (description != null) 'description': description,
      if (price       != null) 'price':       price.toString(),
      if (resetDuration != null) 'resetDuration': resetDuration.toString(),
      if (photoPath != null)
        'photo': await MultipartFile.fromFile(photoPath, filename: 'offer.jpg'),
    });
    final response = await _dio.patch('/providers/me/offers/$offerId', data: data);
    return OfferPostModel.fromJson(response.data as Map<String, dynamic>);
  }
}
