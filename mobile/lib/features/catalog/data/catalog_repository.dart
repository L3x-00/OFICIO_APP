import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';
import '../domain/models/catalog_product_model.dart';

/// Conecta con los endpoints de Catálogo del backend
/// (`/providers/:id/catalog`). El JWT lo inyecta el interceptor de Dio.
class CatalogRepository {
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

  Future<ApiResult<CatalogResponse>> getCatalog(int providerId) async {
    try {
      final res = await _dio.get('/providers/$providerId/catalog');
      return Success(
        CatalogResponse.fromJson(res.data as Map<String, dynamic>),
      );
    } catch (e) {
      return _fail(e, 'Error al cargar el catálogo');
    }
  }

  Future<ApiResult<CatalogProductModel>> createProduct(
    int providerId,
    Map<String, dynamic> payload,
  ) async {
    try {
      final res = await _dio.post(
        '/providers/$providerId/catalog',
        data: payload,
      );
      return Success(
        CatalogProductModel.fromJson(res.data as Map<String, dynamic>),
      );
    } catch (e) {
      return _fail(e, 'Error al crear el producto');
    }
  }

  Future<ApiResult<CatalogProductModel>> updateProduct(
    int providerId,
    int productId,
    Map<String, dynamic> payload,
  ) async {
    try {
      final res = await _dio.patch(
        '/providers/$providerId/catalog/$productId',
        data: payload,
      );
      return Success(
        CatalogProductModel.fromJson(res.data as Map<String, dynamic>),
      );
    } catch (e) {
      return _fail(e, 'Error al actualizar el producto');
    }
  }

  Future<ApiResult<void>> deleteProduct(int providerId, int productId) async {
    try {
      await _dio.delete('/providers/$providerId/catalog/$productId');
      return const Success(null);
    } catch (e) {
      return _fail(e, 'Error al eliminar el producto');
    }
  }

  Future<ApiResult<CatalogProductModel>> toggle(
    int providerId,
    int productId,
  ) async {
    try {
      final res = await _dio.patch(
        '/providers/$providerId/catalog/$productId/toggle',
      );
      return Success(
        CatalogProductModel.fromJson(res.data as Map<String, dynamic>),
      );
    } catch (e) {
      return _fail(e, 'Error al cambiar disponibilidad');
    }
  }

  Future<ApiResult<String>> uploadPhoto(int providerId, String filePath) async {
    try {
      final form = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: 'catalog.jpg'),
      });
      final res = await _dio.post(
        '/providers/$providerId/catalog/photo',
        data: form,
      );
      return Success((res.data as Map<String, dynamic>)['url'] as String);
    } catch (e) {
      return _fail(e, 'Error al subir la imagen');
    }
  }

  Future<ApiResult<void>> reorder(
    int providerId,
    List<Map<String, int>> items,
  ) async {
    try {
      await _dio.patch(
        '/providers/$providerId/catalog/reorder',
        data: {'items': items},
      );
      return const Success(null);
    } catch (e) {
      return _fail(e, 'Error al reordenar');
    }
  }
}
