import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';
import '../domain/models/quotation_model.dart';

/// Conecta con los endpoints `/quotations`. El JWT lo inyecta el interceptor.
class QuotationRepository {
  final Dio _dio = DioClient.instance.dio;

  Failure<T> _fail<T>(Object e, String fallback) {
    if (e is DioException) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? fallback),
      );
    }
    return Failure(ServerException('Error inesperado: $e'));
  }

  // ── CLIENTE ────────────────────────────────────────────────

  Future<ApiResult<Quotation>> create({
    required int providerId,
    required String description,
    String? photoUrl,
  }) async {
    try {
      final res = await _dio.post(
        '/quotations',
        data: {
          'providerId': providerId,
          'description': description.trim(),
          if (photoUrl != null && photoUrl.isNotEmpty) 'photoUrl': photoUrl,
        },
      );
      return Success(Quotation.fromJson(res.data as Map<String, dynamic>));
    } catch (e) {
      return _fail(e, 'Error al enviar la solicitud');
    }
  }

  Future<ApiResult<List<Quotation>>> getMine() async {
    try {
      final res = await _dio.get('/quotations/mine');
      return Success(_parseList(res.data));
    } catch (e) {
      return _fail(e, 'Error al cargar tus cotizaciones');
    }
  }

  /// Sube la foto del problema → devuelve la URL del CDN.
  Future<ApiResult<String>> uploadPhoto(String filePath) async {
    try {
      final form = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: 'quote.jpg'),
      });
      final res = await _dio.post('/quotations/photo', data: form);
      return Success((res.data as Map<String, dynamic>)['url'] as String);
    } catch (e) {
      return _fail(e, 'Error al subir la imagen');
    }
  }

  // ── PROVEEDOR ──────────────────────────────────────────────

  Future<ApiResult<List<Quotation>>> getForProvider() async {
    try {
      final res = await _dio.get('/quotations/provider/mine');
      return Success(_parseList(res.data));
    } catch (e) {
      return _fail(e, 'Error al cargar las cotizaciones');
    }
  }

  Future<ApiResult<void>> respond(
    int id, {
    required String response,
    double? estimatedPrice,
  }) async {
    try {
      await _dio.patch(
        '/quotations/$id/respond',
        data: {'response': response.trim(), 'estimatedPrice': ?estimatedPrice},
      );
      return const Success(null);
    } catch (e) {
      return _fail(e, 'Error al responder');
    }
  }

  Future<ApiResult<void>> reject(int id) async {
    try {
      await _dio.patch('/quotations/$id/reject');
      return const Success(null);
    } catch (e) {
      return _fail(e, 'Error al rechazar');
    }
  }

  List<Quotation> _parseList(dynamic data) => (data as List? ?? [])
      .map((e) => Quotation.fromJson(e as Map<String, dynamic>))
      .toList();
}
