class ProfileCategory {
  final int id;
  final String name;
  final String? slug;

  const ProfileCategory({required this.id, required this.name, this.slug});

  factory ProfileCategory.fromJson(Map<String, dynamic> json) => ProfileCategory(
    id:   json['id'] as int,
    name: json['name'] as String,
    slug: json['slug'] as String?,
  );
}

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
  final bool hasHomeService; // solo OFICIO: atiende a domicilio
  /// ID de la categoría del proveedor — necesario para `joinCategoryRooms`
  /// del WebSocket (recibe notificaciones solo para esta categoría).
  final int? categoryId;
  final String? categoryName;
  final List<ProfileCategory> categories;
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
    this.hasHomeService = false,
    this.categoryId,
    this.categoryName,
    this.categories = const [],
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
      type:           json['type'] as String? ?? 'OFICIO',
      hasHomeService: json['hasHomeService'] as bool? ?? false,
      // El backend (`provider-profile/me`) anida la categoría como
      // `category: { id, name, slug }`. Como fallback aceptamos también
      // `categoryId` plano en la raíz por si una respuesta lo trae así.
      categoryId:    _firstCategoryId(json),
      categoryName:  _firstCategoryName(json),
      categories:    (json['providerCategories'] as List?)
                       ?.map((pc) => ProfileCategory.fromJson(pc['category'] as Map<String, dynamic>))
                       .toList() ?? [],
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
    bool? hasHomeService,
    List<ProfileImage>? images,
    Map<String, dynamic>? scheduleJson,
  }) {
    return DashboardProfileModel(
      id:             id,
      businessName:   businessName    ?? this.businessName,
      description:    description     ?? this.description,
      phone:          phone           ?? this.phone,
      whatsapp:       whatsapp        ?? this.whatsapp,
      address:        address         ?? this.address,
      averageRating:  averageRating,
      totalReviews:   totalReviews,
      availability:   availability    ?? this.availability,
      isVerified:     isVerified,
      hasCleanRecord: hasCleanRecord,
      type:           type,
      hasHomeService: hasHomeService  ?? this.hasHomeService,
      categoryId:     categoryId,
      categoryName:   categoryName,
      categories:     categories,
      localityName:   localityName,
      images:         images          ?? this.images,
      subscription:   subscription,
      scheduleJson:   scheduleJson    ?? this.scheduleJson,
      totalFavorites: totalFavorites,
    );
  }

  static int? _firstCategoryId(Map<String, dynamic> json) {
    final pcList = json['providerCategories'];
    if (pcList is List && pcList.isNotEmpty) {
      final first = pcList.first;
      if (first is Map<String, dynamic>) {
        final cat = first['category'];
        if (cat is Map<String, dynamic>) {
          final id = cat['id'];
          if (id is int) return id;
        }
      }
    }
    return (json['category']?['id'] as int?) ?? (json['categoryId'] as int?);
  }

  static String? _firstCategoryName(Map<String, dynamic> json) {
    final pcList = json['providerCategories'];
    if (pcList is List && pcList.isNotEmpty) {
      final first = pcList.first;
      if (first is Map<String, dynamic>) {
        final cat = first['category'];
        if (cat is Map<String, dynamic>) {
          final name = cat['name'] as String?;
          if (name != null && name.isNotEmpty) return name;
        }
      }
    }
    return json['category']?['name'] as String?;
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

  // Backend usa enum Prisma SubscriptionStatus con valores en español:
  // ACTIVA, VENCIDA, CANCELADA, GRACIA
  bool get isActive  => status == 'ACTIVA' || status == 'GRACIA';
  bool get isExpired => status == 'VENCIDA' || status == 'CANCELADA';
  bool get isGrace   => status == 'GRACIA';

  /// true si vence en ≤3 días (aviso temprano al usuario)
  bool get isExpiringSoon {
    if (!isActive || endDate == null) return false;
    final daysLeft = endDate!.difference(DateTime.now()).inDays;
    return daysLeft >= 0 && daysLeft <= 3;
  }

  int? get daysUntilExpiration {
    if (endDate == null) return null;
    return endDate!.difference(DateTime.now()).inDays;
  }

  String get planLabel {
    switch (plan) {
      case 'ESTANDAR':  return 'Estándar';
      case 'PREMIUM':   return 'Premium';
      default:          return 'Gratis';
    }
  }

  factory SubscriptionInfo.fromJson(Map<String, dynamic> json) {
    return SubscriptionInfo(
      plan:    json['plan'] as String? ?? 'GRATIS',
      status:  json['status'] as String? ?? 'GRACIA',
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
  /// Vistas de la tarjeta del proveedor. Antes el panel mostraba siempre 0
  /// porque ignorábamos este conteo aunque el backend ya recibía los
  /// eventos `view` desde `ProviderDetailSheet`.
  final int views;
  final int totalClicks;
  final List<DailyClickEntry> dailyClicks;

  const DashboardAnalytics({
    required this.whatsappClicks,
    required this.callClicks,
    required this.views,
    required this.totalClicks,
    required this.dailyClicks,
  });

  factory DashboardAnalytics.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>? ?? {};
    return DashboardAnalytics(
      whatsappClicks: summary['whatsappClicks'] as int? ?? 0,
      callClicks:     summary['callClicks'] as int? ?? 0,
      views:          summary['views']          as int? ?? 0,
      totalClicks:    summary['totalClicks']    as int? ?? 0,
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
