/// Modelo del perfil de proveedor para el panel de control
class DashboardProfileModel {
  final int id;
  final String businessName;
  final String? description;
  final String phone;
  final String? whatsapp;
  final String? address;
  final double averageRating;
  final int totalReviews;
  final String availability; // DISPONIBLE | OCUPADO | CON_DEMORA
  final bool isVerified;
  final bool hasCleanRecord;
  final String type; // OFICIO | NEGOCIO
  final String? categoryName;
  final String? localityName;
  final List<ProfileImage> images;
  final SubscriptionInfo? subscription;
  final Map<String, dynamic>? scheduleJson;
  final int totalFavorites;

  const DashboardProfileModel({
    required this.id,
    required this.businessName,
    this.description,
    required this.phone,
    this.whatsapp,
    this.address,
    required this.averageRating,
    required this.totalReviews,
    required this.availability,
    required this.isVerified,
    required this.hasCleanRecord,
    required this.type,
    this.categoryName,
    this.localityName,
    required this.images,
    this.subscription,
    this.scheduleJson,
    this.totalFavorites = 0,
  });

  bool get isPaused => availability == 'OCUPADO';

  factory DashboardProfileModel.fromJson(Map<String, dynamic> json) {
    return DashboardProfileModel(
      id:            json['id'] as int,
      businessName:  json['businessName'] as String? ?? '',
      description:   json['description'] as String?,
      phone:         json['phone'] as String? ?? '',
      whatsapp:      json['whatsapp'] as String?,
      address:       json['address'] as String?,
      averageRating: (json['averageRating'] as num?)?.toDouble() ?? 0.0,
      totalReviews:  json['totalReviews'] as int? ?? 0,
      availability:  json['availability'] as String? ?? 'DISPONIBLE',
      isVerified:    json['isVerified'] as bool? ?? false,
      hasCleanRecord: json['hasCleanRecord'] as bool? ?? false,
      type:          json['type'] as String? ?? 'OFICIO',
      categoryName:  json['category']?['name'] as String?,
      localityName:  json['locality']?['name'] as String?,
      images:        (json['images'] as List?)
                       ?.map((img) => ProfileImage.fromJson(img as Map<String, dynamic>))
                       .toList() ?? [],
      subscription:  json['subscription'] != null
                       ? SubscriptionInfo.fromJson(json['subscription'] as Map<String, dynamic>)
                       : null,
      scheduleJson:  json['scheduleJson'] as Map<String, dynamic>?,
      totalFavorites: json['totalFavorites'] as int? ?? 0,
    );
  }

  DashboardProfileModel copyWith({
    String? businessName,
    String? description,
    String? phone,
    String? whatsapp,
    String? address,
    String? availability,
    List<ProfileImage>? images,
    Map<String, dynamic>? scheduleJson,
  }) {
    return DashboardProfileModel(
      id:            id,
      businessName:  businessName   ?? this.businessName,
      description:   description    ?? this.description,
      phone:         phone          ?? this.phone,
      whatsapp:      whatsapp       ?? this.whatsapp,
      address:       address        ?? this.address,
      averageRating: averageRating,
      totalReviews:  totalReviews,
      availability:  availability   ?? this.availability,
      isVerified:    isVerified,
      hasCleanRecord: hasCleanRecord,
      type:          type,
      categoryName:  categoryName,
      localityName:  localityName,
      images:        images         ?? this.images,
      subscription:  subscription,
      scheduleJson:  scheduleJson   ?? this.scheduleJson,
      totalFavorites: totalFavorites,
    );
  }
}

class ProfileImage {
  final int id;
  final String url;

  const ProfileImage({required this.id, required this.url});

  factory ProfileImage.fromJson(Map<String, dynamic> json) {
    return ProfileImage(
      id:  json['id'] as int,
      url: json['url'] as String,
    );
  }
}

class SubscriptionInfo {
  final String plan;
  final String status;
  final DateTime? endDate;

  const SubscriptionInfo({
    required this.plan,
    required this.status,
    this.endDate,
  });

  bool get isActive => status == 'ACTIVE';

  String get planLabel {
    switch (plan) {
      case 'BASICO':    return 'Básico';
      case 'ESTANDAR':  return 'Estándar';
      case 'PREMIUM':   return 'Premium';
      default:          return 'Gratis';
    }
  }

  factory SubscriptionInfo.fromJson(Map<String, dynamic> json) {
    return SubscriptionInfo(
      plan:    json['plan'] as String? ?? 'GRATIS',
      status:  json['status'] as String? ?? 'INACTIVE',
      endDate: json['endDate'] is String
                 ? DateTime.tryParse(json['endDate'] as String)
                 : null,
    );
  }
}

/// Analíticas del panel
class DashboardAnalytics {
  final int whatsappClicks;
  final int callClicks;
  final int totalClicks;
  final List<DailyClickEntry> dailyClicks;

  const DashboardAnalytics({
    required this.whatsappClicks,
    required this.callClicks,
    required this.totalClicks,
    required this.dailyClicks,
  });

  factory DashboardAnalytics.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>? ?? {};
    return DashboardAnalytics(
      whatsappClicks: summary['whatsappClicks'] as int? ?? 0,
      callClicks:     summary['callClicks'] as int? ?? 0,
      totalClicks:    summary['totalClicks'] as int? ?? 0,
      dailyClicks:    (json['dailyClicks'] as List?)
                        ?.map((e) => DailyClickEntry.fromJson(e as Map<String, dynamic>))
                        .toList() ?? [],
    );
  }
}

class DailyClickEntry {
  final String date; // ISO date: "2025-04-01"
  final int whatsapp;
  final int calls;

  const DailyClickEntry({
    required this.date,
    required this.whatsapp,
    required this.calls,
  });

  int get total => whatsapp + calls;

  factory DailyClickEntry.fromJson(Map<String, dynamic> json) {
    return DailyClickEntry(
      date:     json['date'] as String,
      whatsapp: json['whatsapp'] as int? ?? 0,
      calls:    json['calls'] as int? ?? 0,
    );
  }
}
