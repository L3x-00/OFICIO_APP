import '../../../provider_dashboard/domain/models/service_item_model.dart';

/// Modelo que representa un proveedor de servicios en la app
/// Mapea exactamente con la tabla `providers` del backend
class ProviderModel {
  final int id;

  /// Slug URL-friendly único — base de la Vanity URL pública
  /// `oficioapp.org.pe/p/{slug}`. Null para registros migrados antes de
  /// que existiera el campo; en ese caso la app cae al deep-link por id.
  final String? slug;
  final String businessName;

  /// Especialidad principal del proveedor (la marcada con isPrimary).
  final String categoryName;

  /// Todas las Especialidades (la primera es la principal `categoryName`).
  final List<String> categoryNames;
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

  /// Plan de suscripción: 'GRATIS'| 'ESTANDAR' | 'PREMIUM'
  final String subscriptionPlan;

  /// ID del usuario propietario — para detectar auto-interacción
  final int? userId;

  /// Número de usuarios que recomendaron este proveedor
  final int totalRecommendations;

  /// Solo OFICIO: indica que el profesional atiende a domicilio
  final bool hasHomeService;

  /// Solo NEGOCIO: ofrece servicio de delivery propio
  final bool hasDelivery;

  /// Solo NEGOCIO: entrega pedidos coordinando con el cliente
  final bool plenaCoordinacion;

  /// Locality info (name, department, province, district) — usada por
  /// `locationLabel` para formatear la ubicación en la tarjeta.
  final String? localityDepartment;
  final String? localityProvince;
  final String? localityDistrict;

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

  // ── Toggles de privacidad (independientes del plan) ──────
  // Si el proveedor los desactiva, la tarjeta/detalle ocultan el dato
  // aunque el plan permita exponerlo. Default true → registros previos
  // (sin el campo en el JSON) se comportan como antes.
  final bool showPhone;
  final bool showWhatsapp;
  final bool showExactLocation;

  /// Funcionalidades por categoría habilitadas para el proveedor
  /// (efectivas, ya resueltas con herencia en el backend):
  /// "agenda" | "carta_digital" | "catalogo" | "cotizacion".
  final List<String> features;

  const ProviderModel({
    required this.id,
    this.slug,
    required this.businessName,
    required this.categoryName,
    this.categoryNames = const [],
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
    this.hasDelivery = false,
    this.plenaCoordinacion = false,
    this.localityDepartment,
    this.localityProvince,
    this.localityDistrict,
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
    this.showPhone = true,
    this.showWhatsapp = true,
    this.showExactLocation = true,
    this.features = const [],
  });

  /// ¿El proveedor ofrece carta digital? (Gastronomía).
  bool get hasMenu => features.contains('carta_digital');

  /// ¿Catálogo de productos? (Tiendas/Ferreterías).
  bool get hasCatalog => features.contains('catalogo');

  /// ¿Agenda de citas?
  bool get hasAgenda => features.contains('agenda');

  /// ¿Cotización?
  bool get hasQuotation => features.contains('cotizacion');

  factory ProviderModel.fromJson(Map<String, dynamic> json) {
    return ProviderModel(
      id: json['id'] as int,
      slug: json['slug'] as String?,
      businessName: json['businessName'] as String,
      categoryName: _firstCategoryName(json),
      categoryNames: _allCategoryNames(json),
      phone: json['phone'] as String? ?? '',
      whatsapp: json['whatsapp'] as String?,
      averageRating: (json['averageRating'] as num?)?.toDouble() ?? 0.0,
      totalReviews: json['totalReviews'] as int? ?? 0,
      availability: AvailabilityStatus.fromString(
        json['availability'] as String? ?? 'DISPONIBLE',
      ),
      isVerified: json['isVerified'] as bool? ?? false,
      hasCleanRecord: json['hasCleanRecord'] as bool? ?? false,
      type: ProviderType.fromString(json['type'] as String? ?? 'OFICIO'),
      coverImageUrl: _coverFromImages(json['images'] as List?),
      thumbnailUrls: _thumbnailsFromImages(json['images'] as List?),
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      isFavorite: json['isFavorite'] as bool? ?? false,
      description: json['description'] as String?,
      address: json['address'] as String?,
      scheduleJson: json['scheduleJson'] as Map<String, dynamic>?,
      reviews: (json['reviews'] as List?)
          ?.map((r) => r as Map<String, dynamic>)
          .toList(),
      ownerName: _buildOwnerName(json['user']),
      ownerAvatarUrl: json['user']?['avatarUrl'] as String?,
      subscriptionPlan: json['subscription']?['plan'] as String? ?? 'GRATIS',
      userId: json['userId'] as int?,
      totalRecommendations: json['totalRecommendations'] as int? ?? 0,
      hasHomeService: json['hasHomeService'] as bool? ?? false,
      hasDelivery: json['hasDelivery'] as bool? ?? false,
      plenaCoordinacion: json['plenaCoordinacion'] as bool? ?? false,
      localityDepartment: json['locality']?['department'] as String?,
      localityProvince: json['locality']?['province'] as String?,
      localityDistrict: json['locality']?['district'] as String?,
      services: _parseServices(json['scheduleJson']),
      isTrusted: json['isTrusted'] as bool? ?? false,
      website: json['website'] as String?,
      instagram: json['instagram'] as String?,
      tiktok: json['tiktok'] as String?,
      facebook: json['facebook'] as String?,
      linkedin: json['linkedin'] as String?,
      twitterX: json['twitterX'] as String?,
      telegram: json['telegram'] as String?,
      whatsappBiz: json['whatsappBiz'] as String?,
      showPhone: json['showPhone'] as bool? ?? true,
      showWhatsapp: json['showWhatsapp'] as bool? ?? true,
      showExactLocation: json['showExactLocation'] as bool? ?? true,
      features:
          (json['features'] as List?)?.map((e) => e.toString()).toList() ??
          const [],
    );
  }

  /// Formato de ubicación para la tarjeta según el tipo de proveedor.
  ///   - OFICIO  → "El Tambo" (solo distrito).
  ///   - NEGOCIO → "HUANCAYO, El Tambo" (provincia + distrito) y, en
  ///     una segunda línea, la dirección si existe.
  /// Retorna null si no hay datos suficientes (locality vacío).
  String? get locationLabel {
    // Privacidad: si el proveedor ocultó su ubicación exacta, nunca exponemos
    // distrito — colapsamos a "Departamento, Provincia" (independiente del plan).
    if (!showExactLocation) {
      final dep = localityDepartment?.trim();
      final prov = localityProvince?.trim();
      final parts = <String>[
        if (dep != null && dep.isNotEmpty) dep.toUpperCase(),
        if (prov != null && prov.isNotEmpty) prov,
      ];
      return parts.isEmpty ? null : parts.join(', ');
    }
    if (type == ProviderType.oficio) {
      final d = localityDistrict?.trim();
      return (d == null || d.isEmpty) ? null : d;
    }
    // NEGOCIO: combinar provincia + distrito.
    final prov = localityProvince?.trim();
    final dist = localityDistrict?.trim();
    final parts = <String>[];
    if (prov != null && prov.isNotEmpty) parts.add(prov.toUpperCase());
    if (dist != null && dist.isNotEmpty) parts.add(dist);
    return parts.isEmpty ? null : parts.join(', ');
  }

  /// Cover image robusto: prefiere la que tenga `isCover==true`; si ningún
  /// elemento tiene el flag (datos antiguos, race en `addImage`, o respuesta
  /// que no incluyó el campo), usa la primera de la lista. Así la tarjeta
  /// del perfil nunca queda sin foto cuando existe al menos una.
  static String? _coverFromImages(List? images) {
    if (images == null || images.isEmpty) return null;
    final flagged = images
        .where((img) => img is Map && img['isCover'] == true)
        .map((img) => (img as Map)['url'] as String?)
        .firstOrNull;
    if (flagged != null && flagged.isNotEmpty) return flagged;
    final first = images.first;
    if (first is Map<String, dynamic>) return first['url'] as String?;
    return null;
  }

  /// Miniaturas: todas las imágenes menos la cover elegida arriba. Si no
  /// hubo cover marcada, descarta la primera (que ya se usó como cover en
  /// el fallback) para no duplicarla en el carrusel.
  static List<String> _thumbnailsFromImages(List? images) {
    if (images == null || images.isEmpty) return const [];
    final urls = images
        .whereType<Map>()
        .map((img) => img['url'] as String?)
        .whereType<String>()
        .toList();
    if (urls.isEmpty) return const [];

    final hasFlaggedCover = images.any(
      (img) => img is Map && img['isCover'] == true,
    );
    if (hasFlaggedCover) {
      return images
          .whereType<Map>()
          .where((img) => img['isCover'] != true)
          .take(3)
          .map((img) => img['url'] as String)
          .toList();
    }
    // Sin cover explícita: la primera ya se usó como cover en _coverFromImages.
    return urls.skip(1).take(3).toList();
  }

  /// Lee la primera categoría — soporta la nueva relación M:N
  /// (`providerCategories: [{ category: {name} }]`) y el legado
  /// (`category: {name}`) como fallback defensivo.
  static String _firstCategoryName(Map<String, dynamic> json) {
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
    return (json['category']?['name'] as String?) ?? '';
  }

  /// Todas las Especialidades del proveedor — soporta la relación M:N
  /// (`providerCategories: [{ category: {name} }]`). El backend las ordena
  /// con isPrimary primero, así que el índice 0 es la Especialidad principal.
  static List<String> _allCategoryNames(Map<String, dynamic> json) {
    final pcList = json['providerCategories'];
    if (pcList is List && pcList.isNotEmpty) {
      final names = pcList
          .whereType<Map<String, dynamic>>()
          .map(
            (pc) =>
                (pc['category'] as Map<String, dynamic>?)?['name'] as String?,
          )
          .whereType<String>()
          .where((n) => n.isNotEmpty)
          .toList();
      if (names.isNotEmpty) return names;
    }
    final legacy = json['category']?['name'] as String?;
    return (legacy != null && legacy.isNotEmpty) ? [legacy] : const [];
  }

  /// Especialidades secundarias — todas menos la principal.
  List<String> get secondaryCategoryNames =>
      categoryNames.length > 1 ? categoryNames.sublist(1) : const [];

  /// Etiqueta compacta para tarjetas pequeñas: "Electricista  +2".
  String get categoryLabel => secondaryCategoryNames.isEmpty
      ? categoryName
      : '$categoryName  +${secondaryCategoryNames.length}';

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
    final last = user['lastName'] as String? ?? '';
    final full = '$first $last'.trim();
    return full.isEmpty ? null : full;
  }

  ProviderModel copyWith({
    bool? isFavorite,
    List<Map<String, dynamic>>? reviews,
    List<ServiceItem>? services,
    AvailabilityStatus? availability,
  }) {
    return ProviderModel(
      id: id,
      slug: slug,
      businessName: businessName,
      categoryName: categoryName,
      categoryNames: categoryNames,
      phone: phone,
      whatsapp: whatsapp,
      averageRating: averageRating,
      totalReviews: totalReviews,
      availability: availability ?? this.availability,
      isVerified: isVerified,
      hasCleanRecord: hasCleanRecord,
      type: type,
      coverImageUrl: coverImageUrl,
      thumbnailUrls: thumbnailUrls,
      latitude: latitude,
      longitude: longitude,
      distanceKm: distanceKm,
      isFavorite: isFavorite ?? this.isFavorite,
      description: description,
      address: address,
      scheduleJson: scheduleJson,
      reviews: reviews ?? this.reviews,
      ownerName: ownerName,
      ownerAvatarUrl: ownerAvatarUrl,
      subscriptionPlan: subscriptionPlan,
      userId: userId,
      totalRecommendations: totalRecommendations,
      hasHomeService: hasHomeService,
      hasDelivery: hasDelivery,
      plenaCoordinacion: plenaCoordinacion,
      localityDepartment: localityDepartment,
      localityProvince: localityProvince,
      localityDistrict: localityDistrict,
      services: services ?? this.services,
      isTrusted: isTrusted,
      website: website,
      instagram: instagram,
      tiktok: tiktok,
      facebook: facebook,
      linkedin: linkedin,
      twitterX: twitterX,
      telegram: telegram,
      whatsappBiz: whatsappBiz,
      showPhone: showPhone,
      showWhatsapp: showWhatsapp,
      showExactLocation: showExactLocation,
      features: features,
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
      case 'OCUPADO':
        return AvailabilityStatus.ocupado;
      case 'CON_DEMORA':
        return AvailabilityStatus.conDemora;
      default:
        return AvailabilityStatus.disponible;
    }
  }

  String get label {
    switch (this) {
      case AvailabilityStatus.disponible:
        return 'Disponible';
      case AvailabilityStatus.ocupado:
        return 'Ocupado';
      case AvailabilityStatus.conDemora:
        return 'Con demora';
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
