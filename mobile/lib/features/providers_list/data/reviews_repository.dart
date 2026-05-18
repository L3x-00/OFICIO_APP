import 'dart:io';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../domain/models/review_model.dart';

class ReviewsRepository {
  final Dio _dio = DioClient.instance.dio;

  // ── SUBIR FOTO antes de crear la reseña ─────────────────
  // En ReviewsRepository dentro de uploadPhoto:
  Future<String> uploadPhoto(File imageFile) async {
    // Creamos el FormData compatible con Dio
    String fileName = imageFile.path.split('/').last;
    FormData formData = FormData.fromMap({
      "file": await MultipartFile.fromFile(imageFile.path, filename: fileName),
    });

    // Usamos _dio para heredar interceptores de seguridad
    final response = await _dio.post('/upload/review-photo', data: formData);

    if (response.statusCode == 201 || response.statusCode == 200) {
      // Dio ya devuelve un Map, no necesitas parsear el String manualmente
      return response.data['url'];
    } else {
      throw Exception('Error al subir la imagen: ${response.statusCode}');
    }
  }

  // ── CREAR RESEÑA ─────────────────────────────────────────
  // userId NO se envía: el backend lo inyecta desde el JWT validado.
  // Antes mandábamos userId y la DTO sin decoradores hacía que el
  // ValidationPipe (whitelist) rechazara con "property userId should
  // not exist" cuando estaba con forbidNonWhitelisted.
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
    final response = await _dio.post(
      '/reviews',
      data: {
        'providerId': providerId,
        'rating': rating,
        'photoUrl': photoUrl,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
        'userLatAtReview': ?userLat,
        'userLngAtReview': ?userLng,
        'qrCodeUsed': ?qrCode,
      },
    );

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
      final response = await _dio.post(
        '/reviews/qr/validate',
        data: {'providerId': providerId, 'code': code},
      );
      return response.data as bool? ?? false;
    } catch (_) {
      return false;
    }
  }

  // ── EDITAR RESEÑA ────────────────────────────────────────
  // userId NO se envía: el backend lo deriva del JWT.
  Future<ReviewModel> updateReview({
    required int reviewId,
    required int userId,
    required int rating,
    required String photoUrl,
    String? comment,
  }) async {
    final response = await _dio.patch(
      '/reviews/$reviewId',
      data: {
        'rating':   rating,
        'photoUrl': photoUrl,
        'comment':  comment,
      },
    );
    return ReviewModel.fromJson(response.data as Map<String, dynamic>);
  }

  // ── RESPUESTAS A RESEÑAS ──────────────────────────────────
  Future<List<ReviewReplyModel>> getReplies(int reviewId) async {
    final response = await _dio.get('/reviews/$reviewId/replies');
    return (response.data as List)
        .map((r) => ReviewReplyModel.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  // userId NO se envía: el backend lo inyecta desde el JWT validado.
  Future<ReviewReplyModel> createReply({
    required int reviewId,
    required int userId,
    required String content,
    String? photoUrl,
  }) async {
    final response = await _dio.post(
      '/reviews/$reviewId/replies',
      data: {
        'content': content,
        if (photoUrl != null && photoUrl.isNotEmpty) 'photoUrl': photoUrl,
      },
    );
    return ReviewReplyModel.fromJson(response.data as Map<String, dynamic>);
  }
}
