import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';
import '../domain/models/provider_model.dart';

/// Repositorio que conecta con el backend NestJS
class ProvidersRepository {
  final Dio _dio = DioClient.instance.dio;

  // ── LISTAR proveedores con filtros ───────────────────────
  Future<ApiResult<ProvidersResponse>> getProviders({
    String? categorySlug,
    String? parentCategorySlug,
    String? availability,
    bool? verified,       // null = solo verificados (backend default), false = mostrar todos
    String? search,
    String? type,         // 'PROFESSIONAL' | 'BUSINESS'
    String? sortBy,       // 'reviews' | 'availability'
    String? location,     // búsqueda por texto en dirección
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
        'categorySlug':       ?categorySlug,
        'parentCategorySlug': ?parentCategorySlug,
        'availability':       ?availability,
        if (verified != null) 'verified': verified.toString(),
        if (search != null && search.isNotEmpty) 'search': search,
        'type':   ?type,
        'sortBy': ?sortBy,
        if (location != null && location.isNotEmpty) 'location': location,
      };

      final response = await _dio.get('/providers', queryParameters: queryParams);
      return Success(ProvidersResponse.fromJson(response.data as Map<String, dynamic>));
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al cargar proveedores'),
      );
    } catch (e) {
      return Failure(ServerException('Error inesperado: ${e.toString()}'));
    }
  }

  // ── OBTENER detalle de un proveedor ──────────────────────
  Future<ApiResult<ProviderModel>> getProviderDetail(int id) async {
    try {
      final response = await _dio.get('/providers/$id');
      return Success(ProviderModel.fromJson(response.data as Map<String, dynamic>));
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al cargar el proveedor'),
      );
    } catch (e) {
      return Failure(ServerException('Error inesperado: ${e.toString()}'));
    }
  }

  // ── LISTAR categorías ─────────────────────────────────────
  Future<ApiResult<List<CategoryModel>>> getCategories({String? forType}) async {
    try {
      final response = await _dio.get(
        '/providers/categories',
        queryParameters: forType != null ? {'type': forType} : null,
      );
      final list = (response.data as List)
          .map((c) => CategoryModel.fromJson(c as Map<String, dynamic>))
          .toList();
      return Success(list);
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al cargar categorías'),
      );
    } catch (e) {
      return Failure(ServerException('Error inesperado: ${e.toString()}'));
    }
  }

  // ── RECOMENDAR proveedor (post-reseña, solo añade) ───────
  Future<Map<String, dynamic>> recommend(int providerId, int userId) async {
    try {
      final response = await _dio.post(
        '/providers/$providerId/recommend',
        data: {'userId': userId},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ServerException(e.message ?? 'Error al recomendar');
    }
  }

  // ── REPORTAR PROVEEDOR ───────────────────────────────────
  /// Lanza [ConflictException] si el usuario ya reportó este proveedor.
  Future<void> reportProvider({
    required int providerId,
    required int userId,
    required String reason,
    String? description,
  }) async {
    await _dio.post(
      '/providers/$providerId/report',
      data: {
        'userId':      userId,
        'reason':      reason,
        if (description != null && description.isNotEmpty)
          'description': description,
      },
    );
  }

  // ── ESTADO DE RECOMENDACIÓN ──────────────────────────────
  Future<bool> checkRecommendation(int providerId, int userId) async {
    try {
      final response = await _dio.get(
        '/providers/$providerId/recommendation-status',
        queryParameters: {'userId': userId},
      );
      return (response.data as Map<String, dynamic>)['recommended'] as bool? ?? false;
    } catch (_) {
      return false;
    }
  }

  // ── TOGGLE RECOMENDACIÓN (añadir o quitar) ───────────────
  Future<bool> toggleRecommendation(int providerId, int userId) async {
    try {
      final response = await _dio.post(
        '/providers/$providerId/recommend-toggle',
        data: {'userId': userId},
      );
      return (response.data as Map<String, dynamic>)['recommended'] as bool? ?? false;
    } on DioException catch (e) {
      throw ServerException(e.message ?? 'Error al cambiar recomendación');
    }
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
  final List<CategoryModel> children;

  const CategoryModel({
    required this.id,
    required this.name,
    required this.slug,
    this.iconUrl,
    this.children = const [],
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id:       json['id'] as int,
      name:     json['name'] as String,
      slug:     json['slug'] as String,
      iconUrl:  json['iconUrl'] as String?,
      children: (json['children'] as List? ?? [])
          .map((c) => CategoryModel.fromJson(c as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Devuelve true si esta categoría es una macrocategoría (tiene hijos)
  bool get isParent => children.isNotEmpty;
}
