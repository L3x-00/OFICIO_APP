import 'dart:io';
import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;
import '../../../core/network/dio_client.dart';
import '../domain/models/review_model.dart';

class ReviewsRepository {
  final Dio _dio = DioClient.instance.dio;

  // ── SUBIR FOTO antes de crear la reseña ─────────────────
  Future<String> uploadPhoto(File imageFile) async {
    // Usamos http multipart porque Dio tiene problemas
    // con multipart en Flutter Web
    final uri = Uri.parse('${DioClient.instance.baseUrl}/upload/review-photo');

    final request = http.MultipartRequest('POST', uri);
    request.files.add(
      await http.MultipartFile.fromPath('file', imageFile.path),
    );

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 201 || response.statusCode == 200) {
      // Parsear manualmente sin jsonDecode para evitar imports
      final body = response.body;
      // Extrae la URL del JSON {"url":"http://...","filename":"..."}
      final urlStart = body.indexOf('"url":"') + 7;
      final urlEnd = body.indexOf('"', urlStart);
      return body.substring(urlStart, urlEnd);
    } else {
      throw Exception('Error al subir la imagen: ${response.statusCode}');
    }
  }

  // ── CREAR RESEÑA ─────────────────────────────────────────
  Future<ReviewModel> createReview({
    required int providerId,
    required int userId,
    required int rating,
    required String photoUrl,
    String? comment,
    double? userLat,
    double? userLng,
    String? qrCode,
  }) async {
    final response = await _dio.post('/reviews', data: {
      'providerId': providerId,
      'userId': userId,
      'rating': rating,
      'photoUrl': photoUrl,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
      if (userLat != null) 'userLatAtReview': userLat,
      if (userLng != null) 'userLngAtReview': userLng,
      if (qrCode != null) 'qrCodeUsed': qrCode,
    });

    return ReviewModel.fromJson(response.data as Map<String, dynamic>);
  }

  // ── LISTAR RESEÑAS DE UN PROVEEDOR ───────────────────────
  Future<List<ReviewModel>> getProviderReviews(int providerId) async {
    final response = await _dio.get('/reviews/provider/$providerId');
    final data = response.data as Map<String, dynamic>;
    return (data['data'] as List)
        .map((r) => ReviewModel.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  // ── VALIDAR QR ────────────────────────────────────────────
  Future<bool> validateQrCode(int providerId, String code) async {
    try {
      final response = await _dio.post('/reviews/qr/validate', data: {
        'providerId': providerId,
        'code': code,
      });
      return response.data as bool? ?? false;
    } catch (_) {
      return false;
    }
  }
}