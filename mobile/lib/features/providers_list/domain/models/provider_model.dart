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
      scheduleJson: json['schedule'] as Map<String, dynamic>?,
      reviews:      (json['reviews'] as List?)
                      ?.map((r) => r as Map<String, dynamic>)
                      .toList(),
    );
  }

  ProviderModel copyWith({
    bool? isFavorite,
    List<Map<String, dynamic>>? reviews,
  }) {
    return ProviderModel(
      id:             id,
      businessName:   businessName,
      categoryName:   categoryName,
      phone:          phone,
      whatsapp:       whatsapp,
      averageRating:  averageRating,
      totalReviews:   totalReviews,
      availability:   availability,
      isVerified:     isVerified,
      hasCleanRecord: hasCleanRecord,
      type:           type,
      coverImageUrl:  coverImageUrl,
      thumbnailUrls:  thumbnailUrls,
      latitude:       latitude,
      longitude:      longitude,
      distanceKm:     distanceKm,
      isFavorite:     isFavorite ?? this.isFavorite,
      description:    description,
      address:        address,
      scheduleJson:   scheduleJson,
      reviews:        reviews ?? this.reviews,
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
