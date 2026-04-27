import '../../../provider_dashboard/domain/models/service_item_model.dart';

/// Modelo que representa un proveedor de servicios en la app
/// Mapea exactamente con la tabla `providers` del backend
class ProviderModel {
  final int id;
  final String businessName;
  final String categoryName;
  final String phone;
  final String? whatsapp;
  final double averageRating;
  final int totalReviews;
  final AvailabilityStatus availability;
  final bool isVerified;
  final bool hasCleanRecord;
  final ProviderType type;
  final String? coverImageUrl;
  final List<String> thumbnailUrls;
  final double? latitude;
  final double? longitude;
  final double? distanceKm;
  final bool isFavorite;
  final String? description;
  final String? address;
  final Map<String, dynamic>? scheduleJson;
  final List<Map<String, dynamic>>? reviews;
  /// Nombre real del dueño/profesional (de user.firstName + user.lastName)
  final String? ownerName;
  /// Avatar del dueño — relevante sobre todo para tipo OFICIO
  final String? ownerAvatarUrl;
  /// Plan de suscripción: 'GRATIS' | 'BASICO' | 'ESTANDAR' | 'PREMIUM'
  final String subscriptionPlan;
  /// ID del usuario propietario — para detectar auto-interacción
  final int? userId;
  /// Número de usuarios que recomendaron este proveedor
  final int totalRecommendations;
  /// Solo OFICIO: indica que el profesional atiende a domicilio
  final bool hasHomeService;
  /// Servicios/productos del proveedor (parseados de scheduleJson['services'])
  final List<ServiceItem> services;
  /// true cuando el admin validó los documentos de identidad del proveedor
  final bool isTrusted;
  // ── Redes sociales (todas opcionales) ───────────────────
  final String? website;
  final String? instagram;
  final String? tiktok;
  final String? facebook;
  final String? linkedin;
  final String? twitterX;
  final String? telegram;
  final String? whatsappBiz;

  const ProviderModel({
    required this.id,
    required this.businessName,
    required this.categoryName,
    required this.phone,
    this.whatsapp,
    required this.averageRating,
    required this.totalReviews,
    required this.availability,
    required this.isVerified,
    required this.hasCleanRecord,
    required this.type,
    this.coverImageUrl,
    this.thumbnailUrls = const [],
    this.latitude,
    this.longitude,
    this.distanceKm,
    this.isFavorite = false,
    this.description,
    this.address,
    this.scheduleJson,
    this.reviews,
    this.ownerName,
    this.ownerAvatarUrl,
    this.subscriptionPlan = 'GRATIS',
    this.userId,
    this.totalRecommendations = 0,
    this.hasHomeService = false,
    this.services = const [],
    this.isTrusted = false,
    this.website,
    this.instagram,
    this.tiktok,
    this.facebook,
    this.linkedin,
    this.twitterX,
    this.telegram,
    this.whatsappBiz,
  });

  factory ProviderModel.fromJson(Map<String, dynamic> json) {
    return ProviderModel(
      id:            json['id'] as int,
      businessName:  json['businessName'] as String,
      categoryName:  json['category']?['name'] as String? ?? '',
      phone:         json['phone'] as String,
      whatsapp:      json['whatsapp'] as String?,
      averageRating: (json['averageRating'] as num?)?.toDouble() ?? 0.0,
      totalReviews:  json['totalReviews'] as int? ?? 0,
      availability:  AvailabilityStatus.fromString(
                       json['availability'] as String? ?? 'DISPONIBLE',
                     ),
      isVerified:    json['isVerified'] as bool? ?? false,
      hasCleanRecord: json['hasCleanRecord'] as bool? ?? false,
      type:          ProviderType.fromString(
                       json['type'] as String? ?? 'OFICIO',
                     ),
      coverImageUrl: (json['images'] as List?)
                       ?.where((img) => img['isCover'] == true)
                       .map((img) => img['url'] as String)
                       .firstOrNull,
      thumbnailUrls: (json['images'] as List?)
                       ?.where((img) => img['isCover'] != true)
                       .take(3)
                       .map((img) => img['url'] as String)
                       .toList() ?? [],
      latitude:     (json['latitude'] as num?)?.toDouble(),
      longitude:    (json['longitude'] as num?)?.toDouble(),
      isFavorite:   json['isFavorite'] as bool? ?? false,
      description:  json['description'] as String?,
      address:      json['address'] as String?,
      scheduleJson: json['scheduleJson'] as Map<String, dynamic>?,
      reviews:      (json['reviews'] as List?)
                      ?.map((r) => r as Map<String, dynamic>)
                      .toList(),
      ownerName:              _buildOwnerName(json['user']),
      ownerAvatarUrl:         json['user']?['avatarUrl'] as String?,
      subscriptionPlan:       json['subscription']?['plan'] as String? ?? 'GRATIS',
      userId:                 json['userId'] as int?,
      totalRecommendations:   json['totalRecommendations'] as int? ?? 0,
      hasHomeService:         json['hasHomeService'] as bool? ?? false,
      services:               _parseServices(json['scheduleJson']),
      isTrusted:              json['isTrusted'] as bool? ?? false,
      website:                json['website']     as String?,
      instagram:              json['instagram']   as String?,
      tiktok:                 json['tiktok']      as String?,
      facebook:               json['facebook']    as String?,
      linkedin:               json['linkedin']    as String?,
      twitterX:               json['twitterX']    as String?,
      telegram:               json['telegram']    as String?,
      whatsappBiz:            json['whatsappBiz'] as String?,
    );
  }

  static List<ServiceItem> _parseServices(dynamic scheduleJson) {
    if (scheduleJson == null) return const [];
    final raw = (scheduleJson as Map<String, dynamic>)['services'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(ServiceItem.fromJson)
        .toList();
  }

  static String? _buildOwnerName(dynamic user) {
    if (user == null) return null;
    final first = user['firstName'] as String? ?? '';
    final last  = user['lastName']  as String? ?? '';
    final full  = '$first $last'.trim();
    return full.isEmpty ? null : full;
  }

  ProviderModel copyWith({
    bool? isFavorite,
    List<Map<String, dynamic>>? reviews,
    List<ServiceItem>? services,
  }) {
    return ProviderModel(
      id:               id,
      businessName:     businessName,
      categoryName:     categoryName,
      phone:            phone,
      whatsapp:         whatsapp,
      averageRating:    averageRating,
      totalReviews:     totalReviews,
      availability:     availability,
      isVerified:       isVerified,
      hasCleanRecord:   hasCleanRecord,
      type:             type,
      coverImageUrl:    coverImageUrl,
      thumbnailUrls:    thumbnailUrls,
      latitude:         latitude,
      longitude:        longitude,
      distanceKm:       distanceKm,
      isFavorite:       isFavorite ?? this.isFavorite,
      description:      description,
      address:          address,
      scheduleJson:     scheduleJson,
      reviews:          reviews ?? this.reviews,
      ownerName:              ownerName,
      ownerAvatarUrl:         ownerAvatarUrl,
      subscriptionPlan:       subscriptionPlan,
      userId:                 userId,
      totalRecommendations:   totalRecommendations,
      hasHomeService:         hasHomeService,
      services:               services ?? this.services,
      isTrusted:              isTrusted,
      website:                website,
      instagram:              instagram,
      tiktok:                 tiktok,
      facebook:               facebook,
      linkedin:               linkedin,
      twitterX:               twitterX,
      telegram:               telegram,
      whatsappBiz:            whatsappBiz,
    );
  }
}

// ─── Enums auxiliares ─────────────────────────────────────

enum AvailabilityStatus {
  disponible,
  ocupado,
  conDemora;

  static AvailabilityStatus fromString(String value) {
    switch (value.toUpperCase()) {
      case 'OCUPADO':     return AvailabilityStatus.ocupado;
      case 'CON_DEMORA':  return AvailabilityStatus.conDemora;
      default:            return AvailabilityStatus.disponible;
    }
  }

  String get label {
    switch (this) {
      case AvailabilityStatus.disponible: return 'Disponible';
      case AvailabilityStatus.ocupado:    return 'Ocupado';
      case AvailabilityStatus.conDemora:  return 'Con demora';
    }
  }
}

enum ProviderType {
  oficio,
  negocio;

  static ProviderType fromString(String value) {
    return value.toUpperCase() == 'NEGOCIO'
        ? ProviderType.negocio
        : ProviderType.oficio;
  }
}
