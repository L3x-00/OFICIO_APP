import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../domain/models/dashboard_profile_model.dart';
import '../domain/models/service_item_model.dart';
import '../../providers_list/domain/models/review_model.dart';

class DashboardRepository {
  final Dio _dio = DioClient.instance.dio;

  // ── PERFIL ────────────────────────────────────────────────

  Future<DashboardProfileModel> getMyProfile() async {
    final response = await _dio.get('/provider-profile/me');
    return DashboardProfileModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<DashboardProfileModel> updateMyProfile({
    String? businessName,
    String? description,
    String? phone,
    String? whatsapp,
    String? address,
    Map<String, dynamic>? scheduleJson,
  }) async {
    final body = <String, dynamic>{
      if (businessName != null) 'businessName': businessName,
      if (description  != null) 'description':  description,
      if (phone        != null) 'phone':         phone,
      if (whatsapp     != null) 'whatsapp':      whatsapp,
      if (address      != null) 'address':       address,
      if (scheduleJson != null) 'scheduleJson':  scheduleJson,
    };
    final response = await _dio.patch('/provider-profile/me', data: body);
    return DashboardProfileModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> setAvailability(String status) async {
    await _dio.patch(
      '/provider-profile/me/availability',
      data: {'availability': status},
    );
  }

  // ── ANALÍTICAS ────────────────────────────────────────────

  Future<DashboardAnalytics> getMyAnalytics({int days = 30}) async {
    final response = await _dio.get(
      '/provider-profile/me/analytics',
      queryParameters: {'days': days},
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
    Map<String, dynamic>? existingSchedule,
  ) async {
    final scheduleJson = Map<String, dynamic>.from(existingSchedule ?? {});
    scheduleJson['services'] = services.map((s) => s.toJson()).toList();
    await _dio.patch(
      '/provider-profile/me',
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

  /// Sube una imagen de perfil del proveedor. Devuelve la URL pública.
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
      type:    json['type'] as String,
      message: json['message'] as String,
      isRead:  json['isRead'] as bool? ?? false,
      sentAt:  DateTime.parse(json['sentAt'] as String),
    );
  }
}
