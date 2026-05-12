import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../domain/locality_extra.dart';

class LocalitiesRepository {
  final Dio _dio = DioClient.instance.dio;

  /// Sugerir una ubicación detectada por GPS al catálogo del backend.
  /// Idempotente: si la combinación ya existe, devuelve la fila existente.
  Future<LocalityExtra> suggest({
    required String department,
    String? province,
    String? district,
  }) async {
    final res = await _dio.post('/localities/suggest', data: {
      'department': department,
      if (province != null && province.isNotEmpty) 'province': province,
      if (district != null && district.isNotEmpty) 'district': district,
    });
    return LocalityExtra.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  /// Trae las localidades NO seed (USER/ADMIN). El mobile las fusiona con
  /// el catálogo estático de peru_locations.dart al iniciar la app.
  Future<List<LocalityExtra>> getExtras() async {
    final res = await _dio.get('/localities/extras');
    final list = (res.data as List?) ?? const [];
    return list
        .map((e) => LocalityExtra.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }
}
