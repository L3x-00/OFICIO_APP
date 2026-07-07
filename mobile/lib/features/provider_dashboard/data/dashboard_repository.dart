import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/dio_client.dart';
import '../domain/models/coverage_model.dart';
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
    return DashboardProfileModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  Future<DashboardProfileModel> updateMyProfile({
    String? businessName,
    String? description,
    String? phone,
    String? whatsapp,
    String? address,
    Map<String, dynamic>? scheduleJson,
    bool? hasHomeService,
    // Toggles de privacidad (independientes del plan).
    bool? showPhone,
    bool? showWhatsapp,
    bool? showExactLocation,
    String? type,
    // ── Redes sociales ───────────────────────────────────────
    // Mapeo: oficio = todas; negocio = whatsappBiz, website, tiktok,
    // facebook, instagram. La sección del perfil filtra antes de enviar
    // — el backend acepta todos los campos sin discriminar por tipo,
    // así que el filtrado del frontend es la verdad operativa.
    String? website,
    String? instagram,
    String? tiktok,
    String? facebook,
    String? linkedin,
    String? twitterX,
    String? telegram,
    String? whatsappBiz,
    // Edición de Especialidades desde el panel. La primera del array es la
    // principal — `isPrimary: true` lo asigna el backend por orden.
    // Si es null, el backend NO toca las categorías existentes.
    List<int>? categoryIds,
  }) async {
    final body = <String, dynamic>{
      'businessName': ?businessName,
      'description': ?description,
      'phone': ?phone,
      'whatsapp': ?whatsapp,
      'address': ?address,
      'scheduleJson': ?scheduleJson,
      'hasHomeService': ?hasHomeService,
      'showPhone': ?showPhone,
      'showWhatsapp': ?showWhatsapp,
      'showExactLocation': ?showExactLocation,
      // String vacío => limpiar valor en backend (DTO acepta null/'').
      'website': ?website,
      'instagram': ?instagram,
      'tiktok': ?tiktok,
      'facebook': ?facebook,
      'linkedin': ?linkedin,
      'twitterX': ?twitterX,
      'telegram': ?telegram,
      'whatsappBiz': ?whatsappBiz,
      'categoryIds': ?categoryIds,
    };
    final response = await _dio.patch(
      '/provider-profile/me',
      queryParameters: type != null ? {'type': type} : null,
      data: body,
    );
    return DashboardProfileModel.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  Future<void> setAvailability(String status, {String? type}) async {
    await _dio.patch(
      '/provider-profile/me/availability',
      queryParameters: type != null ? {'type': type} : null,
      data: {'availability': status},
    );
  }

  // ── ANALÍTICAS ────────────────────────────────────────────

  Future<DashboardAnalytics> getMyAnalytics({
    int days = 30,
    String? type,
  }) async {
    final response = await _dio.get(
      '/provider-profile/me/analytics',
      queryParameters: {'days': days, 'type': ?type},
    );
    return DashboardAnalytics.fromJson(response.data as Map<String, dynamic>);
  }

  // ── RESEÑAS ───────────────────────────────────────────────

  Future<List<ReviewModel>> getMyReviews(
    int providerId, {
    int limit = 5,
  }) async {
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

  /// Versión bytes-based de [uploadProviderPhoto] — funciona en todas las
  /// plataformas (web, Android, iOS). Usar en el formulario de registro.
  Future<String> uploadProviderPhotoFile(XFile file) async {
    final bytes = await file.readAsBytes();
    final formData = FormData.fromMap({
      'file': MultipartFile.fromBytes(
        bytes,
        filename: file.name.isNotEmpty ? file.name : 'photo.jpg',
      ),
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
  ///
  /// [isCover] le indica al backend que esta imagen debe quedar marcada
  /// como portada (override del flag automático `existingCount===0`).
  /// El form de onboarding lo pasa `true` para la primera foto para
  /// evitar races donde dos uploads concurrentes vean `existingCount=0`
  /// y ambos terminen como cover (o peor, ninguno).
  Future<ProfileImageRef> saveProviderImage(
    String url, {
    String? type,
    bool isCover = false,
  }) async {
    final response = await _dio.post(
      '/provider-profile/me/images',
      queryParameters: type != null ? {'type': type} : null,
      data: {'url': url, if (isCover) 'isCover': true},
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

  // ── ALCANCE (distritos donde se muestra el proveedor) ────

  Future<CoverageModel> getCoverage({String? type}) async {
    final response = await _dio.get(
      '/provider-profile/me/coverage',
      queryParameters: type != null ? {'type': type} : null,
    );
    return CoverageModel.fromJson(response.data as Map<String, dynamic>);
  }

  /// Reemplaza los distritos ADICIONALES (el registrado siempre cuenta).
  Future<CoverageModel> setCoverage(
    List<int> localityIds, {
    String? type,
  }) async {
    final response = await _dio.put(
      '/provider-profile/me/coverage',
      queryParameters: type != null ? {'type': type} : null,
      data: {'localityIds': localityIds},
    );
    return CoverageModel.fromJson(response.data as Map<String, dynamic>);
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

  Future<void> deleteProviderProfile({String? type}) async {
    await _dio.delete(
      '/provider-profile/me',
      queryParameters: type != null ? {'type': type} : null,
    );
  }

  // ── NOTIFICACIONES DEL PROVEEDOR ─────────────────────────

  /// Notificaciones del usuario. `providerType` (OFICIO|NEGOCIO) filtra
  /// las notif del panel admin a las del perfil específico (más las
  /// globales con `targetProfileType=null`). Sin `providerType`,
  /// devuelve todo — usado por la bandeja "Alertas" del cliente.
  Future<ProviderNotificationsResult> getMyNotifications({
    String? providerType,
  }) async {
    final response = await _dio.get(
      '/provider-profile/me/notifications',
      queryParameters: providerType != null && providerType.isNotEmpty
          ? {'type': providerType}
          : null,
    );
    return ProviderNotificationsResult.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  Future<void> markNotificationRead(int id) async {
    await _dio.patch('/provider-profile/me/notifications/$id/read');
  }

  // ── REPORTE DE PROBLEMA DE PLATAFORMA ────────────────────

  Future<void> cancelPlan() async {
    await _dio.patch('/payments/cancel-plan');
  }

  Future<void> reportPlatformIssue({
    required int userId,
    required String description,
  }) async {
    await _dio.post(
      '/providers/report-issue',
      data: {'userId': userId, 'description': description},
    );
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
  final String type; // APROBADO | RECHAZADO | MAS_INFO | VERIFICACION_REVOCADA
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
      id: json['id'] as int,
      type: json['type'] as String? ?? '',
      message: json['message'] as String? ?? '',
      isRead: json['isRead'] as bool? ?? false,
      sentAt: json['sentAt'] is String
          ? DateTime.tryParse(json['sentAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
