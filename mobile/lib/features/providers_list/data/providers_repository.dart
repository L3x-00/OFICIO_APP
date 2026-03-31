import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../domain/models/provider_model.dart';

/// Repositorio que conecta con el backend NestJS
/// Reemplaza los datos mock del Hito 2
class ProvidersRepository {
  final Dio _dio = DioClient.instance.dio;

  // ── LISTAR proveedores con filtros ───────────────────────
  Future<ProvidersResponse> getProviders({
    String? categorySlug,
    String? availability,
    bool? onlyVerified,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
      if (categorySlug != null) 'categorySlug': categorySlug,
      if (availability != null) 'availability': availability,
      if (onlyVerified == true) 'onlyVerified': 'true',
      if (search != null && search.isNotEmpty) 'search': search,
    };

    final response = await _dio.get('/providers', queryParameters: queryParams);

    return ProvidersResponse.fromJson(response.data as Map<String, dynamic>);
  }

  // ── OBTENER detalle de un proveedor ──────────────────────
  Future<ProviderModel> getProviderDetail(int id) async {
    final response = await _dio.get('/providers/$id');
    return ProviderModel.fromJson(response.data as Map<String, dynamic>);
  }

  // ── LISTAR categorías ─────────────────────────────────────
  Future<List<CategoryModel>> getCategories() async {
    final response = await _dio.get('/providers/categories');
    return (response.data as List)
        .map((c) => CategoryModel.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  // ── REGISTRAR evento analítico ────────────────────────────
  Future<void> trackEvent(int providerId, String eventType) async {
    try {
      await _dio.post(
        '/providers/$providerId/track',
        data: {'eventType': eventType},
      );
    } catch (_) {
      // El fallo de analytics no debe romper la UX
    }
  }
}

// ─── Modelos auxiliares ───────────────────────────────────

class ProvidersResponse {
  final List<ProviderModel> data;
  final int total;
  final int page;
  final int lastPage;

  const ProvidersResponse({
    required this.data,
    required this.total,
    required this.page,
    required this.lastPage,
  });

  factory ProvidersResponse.fromJson(Map<String, dynamic> json) {
    return ProvidersResponse(
      data: (json['data'] as List)
          .map((p) => ProviderModel.fromJson(p as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
      page: json['page'] as int,
      lastPage: json['lastPage'] as int,
    );
  }
}

class CategoryModel {
  final int id;
  final String name;
  final String slug;
  final String? iconUrl;

  const CategoryModel({
    required this.id,
    required this.name,
    required this.slug,
    this.iconUrl,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] as int,
      name: json['name'] as String,
      slug: json['slug'] as String,
      iconUrl: json['iconUrl'] as String?,
    );
  }
}
