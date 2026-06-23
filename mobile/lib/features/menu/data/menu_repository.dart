import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';
import '../domain/models/menu_item_model.dart';

/// Conecta con los endpoints de Carta Digital del backend
/// (`/providers/:id/menu`). El JWT lo inyecta el interceptor de Dio.
class MenuRepository {
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

  /// Carta pública agrupada por sección.
  Future<ApiResult<MenuResponse>> getMenu(int providerId) async {
    try {
      final res = await _dio.get('/providers/$providerId/menu');
      return Success(MenuResponse.fromJson(res.data as Map<String, dynamic>));
    } catch (e) {
      return _fail(e, 'Error al cargar la carta');
    }
  }

  Future<ApiResult<MenuItemModel>> createItem(
    int providerId,
    Map<String, dynamic> payload,
  ) async {
    try {
      final res = await _dio.post('/providers/$providerId/menu', data: payload);
      return Success(MenuItemModel.fromJson(res.data as Map<String, dynamic>));
    } catch (e) {
      return _fail(e, 'Error al crear el plato');
    }
  }

  Future<ApiResult<MenuItemModel>> updateItem(
    int providerId,
    int itemId,
    Map<String, dynamic> payload,
  ) async {
    try {
      final res = await _dio.patch(
        '/providers/$providerId/menu/$itemId',
        data: payload,
      );
      return Success(MenuItemModel.fromJson(res.data as Map<String, dynamic>));
    } catch (e) {
      return _fail(e, 'Error al actualizar el plato');
    }
  }

  Future<ApiResult<void>> deleteItem(int providerId, int itemId) async {
    try {
      await _dio.delete('/providers/$providerId/menu/$itemId');
      return const Success(null);
    } catch (e) {
      return _fail(e, 'Error al eliminar el plato');
    }
  }

  Future<ApiResult<MenuItemModel>> toggle(int providerId, int itemId) async {
    try {
      final res = await _dio.patch(
        '/providers/$providerId/menu/$itemId/toggle',
      );
      return Success(MenuItemModel.fromJson(res.data as Map<String, dynamic>));
    } catch (e) {
      return _fail(e, 'Error al cambiar disponibilidad');
    }
  }

  /// Sube la foto del plato → devuelve la URL pública del CDN.
  Future<ApiResult<String>> uploadPhoto(int providerId, String filePath) async {
    try {
      final form = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath, filename: 'menu.jpg'),
      });
      final res = await _dio.post(
        '/providers/$providerId/menu/photo',
        data: form,
      );
      return Success((res.data as Map<String, dynamic>)['url'] as String);
    } catch (e) {
      return _fail(e, 'Error al subir la imagen');
    }
  }

  /// Reordena ítems en lote: [{id, order}].
  Future<ApiResult<void>> reorder(
    int providerId,
    List<Map<String, int>> items,
  ) async {
    try {
      await _dio.patch(
        '/providers/$providerId/menu/reorder',
        data: {'items': items},
      );
      return const Success(null);
    } catch (e) {
      return _fail(e, 'Error al reordenar');
    }
  }
}
