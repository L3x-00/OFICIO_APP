enum ServiceRequestStatus { open, closed, expired, cancelled }

enum OfferStatus { pending, accepted, rejected, withdrawn }

class ServiceRequestModel {
  final int id;
  final int userId;
  final int categoryId;
  final String categoryName;
  final String? categoryIconUrl;
  final String description;
  final String? photoUrl;
  final double? budgetMin;
  final double? budgetMax;
  final DateTime? desiredDate;
  final double? latitude;
  final double? longitude;
  final String? department;
  final String? province;
  final String? district;
  final ServiceRequestStatus status;
  final int maxOffers;
  final DateTime expiresAt;
  final DateTime createdAt;
  final List<OfferModel> offers;

  const ServiceRequestModel({
    required this.id,
    required this.userId,
    required this.categoryId,
    required this.categoryName,
    this.categoryIconUrl,
    required this.description,
    this.photoUrl,
    this.budgetMin,
    this.budgetMax,
    this.desiredDate,
    this.latitude,
    this.longitude,
    this.department,
    this.province,
    this.district,
    required this.status,
    required this.maxOffers,
    required this.expiresAt,
    required this.createdAt,
    this.offers = const [],
  });

  bool get isOpen => status == ServiceRequestStatus.open;
  bool get isFull => offers.length >= maxOffers;
  Duration get timeLeft => expiresAt.difference(DateTime.now());
  bool get isExpired => timeLeft.isNegative;

  factory ServiceRequestModel.fromJson(Map<String, dynamic> json) {
    return ServiceRequestModel(
      id: json['id'] as int,
      userId: json['userId'] as int,
      categoryId: json['categoryId'] as int,
      categoryName: json['category']?['name'] as String? ?? '',
      categoryIconUrl: json['category']?['iconUrl'] as String?,
      description: json['description'] as String,
      photoUrl: json['photoUrl'] as String?,
      budgetMin: (json['budgetMin'] as num?)?.toDouble(),
      budgetMax: (json['budgetMax'] as num?)?.toDouble(),
      desiredDate: json['desiredDate'] != null
          ? DateTime.tryParse(json['desiredDate'] as String)
          : null,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      department: json['department'] as String?,
      province: json['province'] as String?,
      district: json['district'] as String?,
      status: _statusFromString(json['status'] as String? ?? 'OPEN'),
      maxOffers: json['maxOffers'] as int? ?? 5,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      offers: (json['offers'] as List?)
              ?.map((o) => OfferModel.fromJson(o as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  static ServiceRequestStatus _statusFromString(String s) {
    switch (s.toUpperCase()) {
      case 'CLOSED':    return ServiceRequestStatus.closed;
      case 'EXPIRED':   return ServiceRequestStatus.expired;
      case 'CANCELLED': return ServiceRequestStatus.cancelled;
      default:          return ServiceRequestStatus.open;
    }
  }
}

class OfferModel {
  final int id;
  final int serviceRequestId;
  final int providerId;
  final String providerName;
  final double providerRating;
  final int providerTotalReviews;
  final bool providerIsTrusted;
  final String? providerAvatarUrl;
  final double price;
  final String message;
  final OfferStatus status;
  final DateTime createdAt;

  const OfferModel({
    required this.id,
    required this.serviceRequestId,
    required this.providerId,
    required this.providerName,
    required this.providerRating,
    required this.providerTotalReviews,
    required this.providerIsTrusted,
    this.providerAvatarUrl,
    required this.price,
    required this.message,
    required this.status,
    required this.createdAt,
  });

  factory OfferModel.fromJson(Map<String, dynamic> json) {
    final provider = json['provider'] as Map<String, dynamic>?;
    final user = provider?['user'] as Map<String, dynamic>?;
    final images = provider?['images'] as List?;
    return OfferModel(
      id: json['id'] as int,
      serviceRequestId: json['serviceRequestId'] as int,
      providerId: json['providerId'] as int,
      providerName: provider?['businessName'] as String? ?? '',
      providerRating: (provider?['averageRating'] as num?)?.toDouble() ?? 0.0,
      providerTotalReviews: provider?['totalReviews'] as int? ?? 0,
      providerIsTrusted: provider?['isTrusted'] as bool? ?? false,
      providerAvatarUrl: user?['avatarUrl'] as String? ??
          (images?.isNotEmpty == true ? images!.first['url'] as String? : null),
      price: (json['price'] as num).toDouble(),
      message: json['message'] as String,
      status: _offerStatusFromString(json['status'] as String? ?? 'PENDING'),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  static OfferStatus _offerStatusFromString(String s) {
    switch (s.toUpperCase()) {
      case 'ACCEPTED':  return OfferStatus.accepted;
      case 'REJECTED':  return OfferStatus.rejected;
      case 'WITHDRAWN': return OfferStatus.withdrawn;
      default:          return OfferStatus.pending;
    }
  }
}

// Modelo ligero para la vista del proveedor en "Oportunidades"
class OpportunityModel {
  final int id;
  final String categoryName;
  final String? categoryIconUrl;
  final String description;
  final String? photoUrl;
  final double? budgetMin;
  final double? budgetMax;
  final String? clientFirstName;
  final String? district;
  final double? distanceKm;
  final int offersCount;
  final int maxOffers;
  final DateTime expiresAt;
  final bool canParticipate;

  const OpportunityModel({
    required this.id,
    required this.categoryName,
    this.categoryIconUrl,
    required this.description,
    this.photoUrl,
    this.budgetMin,
    this.budgetMax,
    this.clientFirstName,
    this.district,
    this.distanceKm,
    required this.offersCount,
    required this.maxOffers,
    required this.expiresAt,
    required this.canParticipate,
  });

  bool get isFull => offersCount >= maxOffers;
  Duration get timeLeft => expiresAt.difference(DateTime.now());

  factory OpportunityModel.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return OpportunityModel(
      id: json['id'] as int,
      categoryName: json['category']?['name'] as String? ?? '',
      categoryIconUrl: json['category']?['iconUrl'] as String?,
      description: json['description'] as String,
      photoUrl: json['photoUrl'] as String?,
      budgetMin: (json['budgetMin'] as num?)?.toDouble(),
      budgetMax: (json['budgetMax'] as num?)?.toDouble(),
      clientFirstName: user?['firstName'] as String?,
      district: user?['district'] as String?,
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      offersCount: json['offersCount'] as int? ?? 0,
      maxOffers: json['maxOffers'] as int? ?? 5,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      canParticipate: json['canParticipate'] as bool? ?? true,
    );
  }
}
