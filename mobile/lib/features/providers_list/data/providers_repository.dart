import 'dart:async';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/errors/failures.dart';
import '../../../core/services/local_cache_service.dart';
import '../domain/models/provider_model.dart';

/// Repositorio que conecta con el backend NestJS
class ProvidersRepository {
  final Dio _dio = DioClient.instance.dio;
  final LocalCacheService _cache = LocalCacheService();

  // ── LISTAR proveedores con filtros ───────────────────────
  Future<ApiResult<ProvidersResponse>> getProviders({
    String? categorySlug,
    String? parentCategorySlug,
    String? availability,
    bool?
    verified, // null = solo verificados (backend default), false = mostrar todos
    String? search,
    String? type, // 'PROFESSIONAL' | 'BUSINESS'
    String? sortBy, // 'reviews' | 'availability'
    String? location, // búsqueda por texto en dirección
    // Filtros de ubicación estructurados (jerarquía peruana)
    String? department,
    String? province,
    String? district,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
        'categorySlug': ?categorySlug,
        'parentCategorySlug': ?parentCategorySlug,
        'availability': ?availability,
        if (verified != null) 'verified': verified.toString(),
        if (search != null && search.isNotEmpty) 'search': search,
        'type': ?type,
        'sortBy': ?sortBy,
        if (location != null && location.isNotEmpty) 'location': location,
        if (department != null && department.isNotEmpty)
          'department': department,
        if (province != null && province.isNotEmpty) 'province': province,
        if (district != null && district.isNotEmpty) 'district': district,
      };

      final response = await _dio.get(
        '/providers',
        queryParameters: queryParams,
      );
      return Success(
        ProvidersResponse.fromJson(response.data as Map<String, dynamic>),
      );
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

  // ── HOME AGRUPADA (carruseles por categoría padre) ───────
  /// Consume GET /providers/featured-grouped: top categorías padre con sus
  /// primeros proveedores. Alimenta los carruseles del home sin tocar la
  /// paginación de [getProviders].
  Future<ApiResult<List<FeaturedGroup>>> getFeaturedGrouped({
    String? province,
    String? department,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        if (province != null && province.isNotEmpty) 'province': province,
        if (department != null && department.isNotEmpty)
          'department': department,
      };
      final response = await _dio.get(
        '/providers/featured-grouped',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      final list = (response.data as List)
          .map((g) => FeaturedGroup.fromJson(g as Map<String, dynamic>))
          .toList();
      return Success(list);
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al cargar el inicio'),
      );
    } catch (e) {
      return Failure(ServerException('Error inesperado: ${e.toString()}'));
    }
  }

  // ── BÚSQUEDA POR RADIO (mapa radar del filtro) ───────────
  /// Consume GET /providers/nearby?latitude=&longitude=&radiusKm= (PostGIS).
  /// Devuelve proveedores dentro del radio ordenados por cercanía (cada uno
  /// trae `distanceKm`). Sin caché — depende de coords exactas.
  Future<ApiResult<List<ProviderModel>>> getNearby({
    required double latitude,
    required double longitude,
    required double radiusKm,
    // Mismos filtros del listado: la búsqueda por radio respeta la categoría /
    // tipo / texto activos en vez de devolver a TODOS los cercanos.
    String? categorySlug,
    String? parentCategorySlug,
    String? type,
    String? search,
  }) async {
    try {
      final response = await _dio.get(
        '/providers/nearby',
        queryParameters: {
          'latitude': latitude,
          'longitude': longitude,
          'radiusKm': radiusKm,
          if (categorySlug != null && categorySlug.isNotEmpty)
            'categorySlug': categorySlug,
          if (parentCategorySlug != null && parentCategorySlug.isNotEmpty)
            'parentCategorySlug': parentCategorySlug,
          if (type != null && type.isNotEmpty) 'type': type,
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
      final list = (response.data as List)
          .map((p) => ProviderModel.fromJson(p as Map<String, dynamic>))
          .toList();
      return Success(list);
    } on DioException catch (e) {
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error en la búsqueda por radio'),
      );
    } catch (e) {
      return Failure(ServerException('Error inesperado: ${e.toString()}'));
    }
  }

  // ── OBTENER detalle de un proveedor ──────────────────────
  Future<ApiResult<ProviderModel>> getProviderDetail(int id) async {
    try {
      final response = await _dio.get('/providers/$id');
      return Success(
        ProviderModel.fromJson(response.data as Map<String, dynamic>),
      );
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
  /// Categorías con caché Offline-First (Cache-First, Network-Second):
  ///   • Caché válido (≤6h)  → se devuelve YA + refresco silencioso en 2º plano
  ///                            (stale-while-revalidate, sin tocar la UI).
  ///   • Caché ausente/viejo → red; si responde, se cachea y se devuelve.
  ///   • Red falla con caché → se devuelve el caché EXPIRADO (contingencia).
  ///   • Red falla sin caché → Failure.
  /// Datos estáticos/baja frecuencia → menos lentitud en 3G/4G + menos Redis.
  Future<ApiResult<List<CategoryModel>>> getCategories({
    String? forType,
  }) async {
    final key = 'cache_categories_${forType ?? 'all'}';

    final cached = await _cache.getData<List<CategoryModel>>(
      key,
      _categoriesFromMap,
      maxAge: const Duration(hours: 6),
    );
    if (cached != null && cached.isNotEmpty) {
      // Revalidación en segundo plano (no esperada, silenciosa).
      unawaited(_refreshCategories(key, forType));
      return Success(cached);
    }

    return _fetchCategories(key, forType, useStaleOnError: true);
  }

  /// Pide categorías a la red, las cachea y las devuelve. Ante fallo de red,
  /// si `useStaleOnError`, devuelve el caché aunque esté expirado.
  Future<ApiResult<List<CategoryModel>>> _fetchCategories(
    String key,
    String? forType, {
    bool useStaleOnError = false,
  }) async {
    try {
      final response = await _dio.get(
        '/providers/categories',
        queryParameters: forType != null ? {'type': forType} : null,
      );
      final list = (response.data as List)
          .map((c) => CategoryModel.fromJson(c as Map<String, dynamic>))
          .toList();
      await _cache.setData<List<CategoryModel>>(key, list, _categoriesToMap);
      return Success(list);
    } on DioException catch (e) {
      final stale = await _staleCategories(key, useStaleOnError);
      if (stale != null) return Success(stale);
      return Failure(
        e.error is AppException
            ? e.error as AppException
            : ServerException(e.message ?? 'Error al cargar categorías'),
      );
    } catch (e) {
      final stale = await _staleCategories(key, useStaleOnError);
      if (stale != null) return Success(stale);
      return Failure(ServerException('Error inesperado: ${e.toString()}'));
    }
  }

  /// Refresco silencioso: solo actualiza el caché (sin UI, sin errores).
  Future<void> _refreshCategories(String key, String? forType) async {
    try {
      final response = await _dio.get(
        '/providers/categories',
        queryParameters: forType != null ? {'type': forType} : null,
      );
      final list = (response.data as List)
          .map((c) => CategoryModel.fromJson(c as Map<String, dynamic>))
          .toList();
      await _cache.setData<List<CategoryModel>>(key, list, _categoriesToMap);
    } catch (_) {
      // Mantiene el caché vigente si la red falla.
    }
  }

  Future<List<CategoryModel>?> _staleCategories(
    String key,
    bool enabled,
  ) async {
    if (!enabled) return null;
    final stale = await _cache.getData<List<CategoryModel>>(
      key,
      _categoriesFromMap,
      maxAge: const Duration(days: 3650), // ignora expiración (contingencia)
    );
    return (stale != null && stale.isNotEmpty) ? stale : null;
  }

  static List<CategoryModel> _categoriesFromMap(Map<String, dynamic> m) =>
      ((m['items'] as List?) ?? const [])
          .map(
            (c) => CategoryModel.fromJson(Map<String, dynamic>.from(c as Map)),
          )
          .toList();

  static Map<String, dynamic> _categoriesToMap(List<CategoryModel> list) => {
    'items': list.map((c) => c.toJson()).toList(),
  };

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
        'userId': userId,
        'reason': reason,
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
      return (response.data as Map<String, dynamic>)['recommended'] as bool? ??
          false;
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
      return (response.data as Map<String, dynamic>)['recommended'] as bool? ??
          false;
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

/// Un grupo del home: una categoría padre + sus proveedores destacados.
class FeaturedGroup {
  final CategoryModel category;
  final List<ProviderModel> providers;

  const FeaturedGroup({required this.category, required this.providers});

  factory FeaturedGroup.fromJson(Map<String, dynamic> json) {
    return FeaturedGroup(
      category: CategoryModel.fromJson(
        json['category'] as Map<String, dynamic>,
      ),
      providers: (json['providers'] as List? ?? const [])
          .map((p) => ProviderModel.fromJson(p as Map<String, dynamic>))
          .toList(),
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
      id: json['id'] as int,
      name: json['name'] as String,
      slug: json['slug'] as String,
      iconUrl: json['iconUrl'] as String?,
      children: (json['children'] as List? ?? [])
          .map((c) => CategoryModel.fromJson(c as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Devuelve true si esta categoría es una macrocategoría (tiene hijos)
  bool get isParent => children.isNotEmpty;

  /// Serialización para el caché local (round-trip con [fromJson]).
  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'slug': slug,
    'iconUrl': iconUrl,
    'children': children.map((c) => c.toJson()).toList(),
  };
}
