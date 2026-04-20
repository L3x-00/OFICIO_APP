import 'dart:io';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';

class TrustValidationRepository {
  final Dio _dio = DioClient.instance.dio;

  Future<ApiResult<Map<String, dynamic>>> submitRequest({
    required String providerType,
    required Map<String, String> fields,
    required Map<String, File?> photos,
  }) async {
    try {
      final formData = FormData();

      // Text fields
      fields.forEach((key, value) {
        if (value.isNotEmpty) formData.fields.add(MapEntry(key, value));
      });

      // Photo files
      for (final entry in photos.entries) {
        final file = entry.value;
        if (file != null) {
          formData.files.add(MapEntry(
            entry.key,
            await MultipartFile.fromFile(file.path, filename: file.path.split('/').last),
          ));
        }
      }

      final response = await _dio.post(
        '/trust-validation/request',
        data: formData,
        queryParameters: {'type': providerType},
      );
      return Success(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      return Failure(e.error is AppException
          ? e.error as AppException
          : ServerException(e.message ?? 'Error al enviar solicitud'));
    }
  }

  Future<ApiResult<Map<String, dynamic>>> getMyStatus(String providerType) async {
    try {
      final response = await _dio.get(
        '/trust-validation/my-status',
        queryParameters: {'type': providerType},
      );
      return Success(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      return Failure(ServerException(e.message ?? 'Error'));
    }
  }
}
