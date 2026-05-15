class PublicOfferModel {
  final int id;
  final String title;
  final String description;
  final double? price;
  final String? photoUrl;
  final DateTime expiresAt;
  final List<OfferCategoryChip> categories;
  final OfferProviderInfo provider;

  const PublicOfferModel({
    required this.id,
    required this.title,
    required this.description,
    this.price,
    this.photoUrl,
    required this.expiresAt,
    required this.categories,
    required this.provider,
  });

  factory PublicOfferModel.fromJson(Map<String, dynamic> j) => PublicOfferModel(
    id:          j['id'] as int,
    title:       j['title'] as String,
    description: j['description'] as String,
    price:       (j['price'] as num?)?.toDouble(),
    photoUrl:    j['photoUrl'] as String?,
    expiresAt:   DateTime.parse(j['expiresAt'] as String),
    categories:  (j['categories'] as List? ?? [])
        .map((c) => OfferCategoryChip.fromJson(c['category'] as Map<String, dynamic>))
        .toList(),
    provider: OfferProviderInfo.fromJson(j['provider'] as Map<String, dynamic>),
  );

  String get priceLabel => price != null ? 'S/ ${price!.toStringAsFixed(0)}' : 'Consultar';

  Duration get timeLeft => expiresAt.difference(DateTime.now());

  String get timeLeftLabel {
    final d = timeLeft;
    if (d.isNegative) return 'Expirada';
    if (d.inHours >= 24) return '${d.inDays}d';
    if (d.inHours >= 1)  return '${d.inHours}h';
    return '${d.inMinutes}min';
  }
}

class OfferCategoryChip {
  final int id;
  final String name;
  final String slug;

  const OfferCategoryChip({required this.id, required this.name, required this.slug});

  factory OfferCategoryChip.fromJson(Map<String, dynamic> j) => OfferCategoryChip(
    id:   j['id'] as int,
    name: j['name'] as String,
    slug: j['slug'] as String? ?? '',
  );
}

class OfferProviderInfo {
  final int id;
  final String businessName;
  final double averageRating;
  final bool isVerified;
  /// 'OFICIO' (profesional) o 'NEGOCIO'. Necesario para mostrar el botón
  /// correcto en el detalle ("Ver perfil profesional" vs "Ver negocio")
  /// y para el badge de tipo.
  final String? type;
  final String? phone;
  final String? whatsapp;
  final String? coverUrl;
  final String? localityName;
  final String? plan;

  const OfferProviderInfo({
    required this.id,
    required this.businessName,
    required this.averageRating,
    required this.isVerified,
    this.type,
    this.phone,
    this.whatsapp,
    this.coverUrl,
    this.localityName,
    this.plan,
  });

  bool get isBusiness => (type ?? '').toUpperCase() == 'NEGOCIO';

  factory OfferProviderInfo.fromJson(Map<String, dynamic> j) {
    final images = j['images'] as List? ?? [];
    final coverUrl = images.isNotEmpty ? images.first['url'] as String? : null;
    final locality = j['locality'] as Map<String, dynamic>?;
    return OfferProviderInfo(
      id:            j['id'] as int,
      businessName:  j['businessName'] as String,
      averageRating: (j['averageRating'] as num?)?.toDouble() ?? 0,
      isVerified:    j['isVerified'] as bool? ?? false,
      type:          j['type'] as String?,
      phone:         j['phone'] as String?,
      whatsapp:      j['whatsapp'] as String?,
      coverUrl:      coverUrl,
      localityName:  locality?['name'] as String?,
      plan:          (j['subscription'] as Map<String, dynamic>?)?['plan'] as String?,
    );
  }
}

class OffersPage {
  final List<PublicOfferModel> data;
  final int total;
  final int page;
  final int lastPage;

  const OffersPage({required this.data, required this.total, required this.page, required this.lastPage});

  factory OffersPage.fromJson(Map<String, dynamic> j) => OffersPage(
    data:     (j['data'] as List).map((e) => PublicOfferModel.fromJson(e as Map<String, dynamic>)).toList(),
    total:    j['total'] as int,
    page:     j['page'] as int,
    lastPage: j['lastPage'] as int,
  );
}
