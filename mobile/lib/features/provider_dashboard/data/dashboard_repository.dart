import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../domain/models/dashboard_profile_model.dart';
import '../domain/models/service_item_model.dart';
import '../../providers_list/domain/models/review_model.dart';

class DashboardRepository {
  final Dio _dio = DioClient.instance.dio;

  // ── PERFIL ────────────────────────────────────────────────

  /// [type] = 'OFICIO' | 'NEGOCIO' — null devuelve el primer perfil encontrado.
  Future<DashboardProfileModel> getMyProfile({String? type}) async {
    final response = await _dio.get(
      '/provider-profile/me',
      queryParameters: type != null ? {'type': type} : null,
    );
    return DashboardProfileModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<DashboardProfileModel> updateMyProfile({
    String? businessName,
    String? description,
    String? phone,
    String? whatsapp,
    String? address,
    Map<String, dynamic>? scheduleJson,
    bool? hasHomeService,
    String? type,
  }) async {
    final body = <String, dynamic>{
      'businessName': ?businessName,
      'description':  ?description,
      'phone':        ?phone,
      'whatsapp':     ?whatsapp,
      'address':      ?address,
      'scheduleJson': ?scheduleJson,
      'hasHomeService': ?hasHomeService,
    };
    final response = await _dio.patch(
      '/provider-profile/me',
      queryParameters: type != null ? {'type': type} : null,
      data: body,
    );
    return DashboardProfileModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> setAvailability(String status, {String? type}) async {
    await _dio.patch(
      '/provider-profile/me/availability',
      queryParameters: type != null ? {'type': type} : null,
      data: {'availability': status},
    );
  }

  // ── ANALÍTICAS ────────────────────────────────────────────

  Future<DashboardAnalytics> getMyAnalytics({int days = 30, String? type}) async {
    final response = await _dio.get(
      '/provider-profile/me/analytics',
      queryParameters: {
        'days': days,
        'type': ?type,
      },
    );
    return DashboardAnalytics.fromJson(response.data as Map<String, dynamic>);
  }

  // ── RESEÑAS ───────────────────────────────────────────────

  Future<List<ReviewModel>> getMyReviews(int providerId, {int limit = 5}) async {
    final response = await _dio.get(
      '/reviews/provider/$providerId',
      queryParameters: {'limit': limit, 'page': 1},
    );
    final data = response.data;
    final list = (data is Map ? data['data'] : data) as List? ?? [];
    return list
        .map((r) => ReviewModel.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  // ── SERVICIOS (guardados en scheduleJson) ─────────────────

  Future<void> saveServices(
    List<ServiceItem> services,
    Map<String, dynamic>? existingSchedule, {
    String? type,
  }) async {
    final scheduleJson = Map<String, dynamic>.from(existingSchedule ?? {});
    scheduleJson['services'] = services.map((s) => s.toJson()).toList();
    await _dio.patch(
      '/provider-profile/me',
      queryParameters: type != null ? {'type': type} : null,
      data: {'scheduleJson': scheduleJson},
    );
  }

  // ── IMÁGENES ──────────────────────────────────────────────

  Future<String> uploadReviewPhoto(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });
    final response = await _dio.post('/upload/review-photo', data: formData);
    return response.data['url'] as String;
  }

  /// Sube una imagen de perfil del proveedor al disco. Devuelve la URL pública.
  Future<String> uploadProviderPhoto(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });
    final response = await _dio.post(
      '/upload/provider-photo',
      data: formData,
      options: Options(
        sendTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
      ),
    );
    return response.data['url'] as String;
  }

  /// Vincula la URL de una imagen subida al perfil del proveedor en la BD.
  Future<ProfileImageRef> saveProviderImage(String url, {String? type}) async {
    final response = await _dio.post(
      '/provider-profile/me/images',
      queryParameters: type != null ? {'type': type} : null,
      data: {'url': url},
    );
    return ProfileImageRef.fromJson(response.data as Map<String, dynamic>);
  }

  /// Elimina una imagen del perfil del proveedor de la BD.
  Future<void> deleteProviderImage(int imageId, {String? type}) async {
    await _dio.delete(
      '/provider-profile/me/images/$imageId',
      queryParameters: type != null ? {'type': type} : null,
    );
  }

  // ── SOLICITUD DE UPGRADE DE PLAN ─────────────────────────

  /// Envía solicitud de cambio de plan al backend.
  /// [plan] = 'ESTANDAR' | 'PREMIUM'
  /// [type] = 'OFICIO' | 'NEGOCIO'
  Future<void> requestPlanUpgrade(String plan, {String? type}) async {
    await _dio.post(
      '/provider-profile/me/plan-request',
      queryParameters: type != null ? {'type': type} : null,
      data: {'plan': plan},
    );
  }

  // ── NOTIFICACIONES DEL PROVEEDOR ─────────────────────────

  Future<ProviderNotificationsResult> getMyNotifications() async {
    final response = await _dio.get('/provider-profile/me/notifications');
    return ProviderNotificationsResult.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  Future<void> markNotificationRead(int id) async {
    await _dio.patch('/provider-profile/me/notifications/$id/read');
  }
}

// ── Modelo de referencia de imagen ───────────────────────

class ProfileImageRef {
  final int id;
  final String url;
  const ProfileImageRef({required this.id, required this.url});
  factory ProfileImageRef.fromJson(Map<String, dynamic> json) =>
      ProfileImageRef(id: json['id'] as int, url: json['url'] as String);
}

// ── Modelos de notificación ───────────────────────────────

class ProviderNotificationsResult {
  final List<ProviderNotification> data;
  final int unreadCount;

  const ProviderNotificationsResult({
    required this.data,
    required this.unreadCount,
  });

  factory ProviderNotificationsResult.fromJson(Map<String, dynamic> json) {
    return ProviderNotificationsResult(
      data: (json['data'] as List? ?? [])
          .map((e) => ProviderNotification.fromJson(e as Map<String, dynamic>))
          .toList(),
      unreadCount: json['unreadCount'] as int? ?? 0,
    );
  }
}

class ProviderNotification {
  final int id;
  final String type;  // APROBADO | RECHAZADO | MAS_INFO | VERIFICACION_REVOCADA
  final String message;
  final bool isRead;
  final DateTime sentAt;

  const ProviderNotification({
    required this.id,
    required this.type,
    required this.message,
    required this.isRead,
    required this.sentAt,
  });

  factory ProviderNotification.fromJson(Map<String, dynamic> json) {
    return ProviderNotification(
      id:      json['id'] as int,
      type:    json['type'] as String? ?? '',
      message: json['message'] as String? ?? '',
      isRead:  json['isRead'] as bool? ?? false,
      sentAt:  json['sentAt'] is String
                 ? DateTime.tryParse(json['sentAt'] as String) ?? DateTime.now()
                 : DateTime.now(),
    );
  }
}
