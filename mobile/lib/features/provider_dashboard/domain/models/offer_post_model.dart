class OfferPostModel {
  final int id;
  final int providerId;
  final String title;
  final String description;
  final double? price;
  final String? photoUrl;
  final DateTime expiresAt;
  final bool isActive;
  final DateTime createdAt;
  final List<OfferCategoryModel> categories;
  final int reportCount;

  const OfferPostModel({
    required this.id,
    required this.providerId,
    required this.title,
    required this.description,
    this.price,
    this.photoUrl,
    required this.expiresAt,
    required this.isActive,
    required this.createdAt,
    required this.categories,
    this.reportCount = 0,
  });

  factory OfferPostModel.fromJson(Map<String, dynamic> json) {
    final cats = (json['categories'] as List? ?? [])
        .map((c) => OfferCategoryModel.fromJson(c['category'] as Map<String, dynamic>))
        .toList();
    return OfferPostModel(
      id:          json['id'] as int,
      providerId:  json['providerId'] as int,
      title:       json['title'] as String,
      description: json['description'] as String,
      price:       (json['price'] as num?)?.toDouble(),
      photoUrl:    json['photoUrl'] as String?,
      expiresAt:   DateTime.parse(json['expiresAt'] as String),
      isActive:    json['isActive'] as bool? ?? true,
      createdAt:   DateTime.parse(json['createdAt'] as String),
      categories:  cats,
      reportCount: (json['_count']?['reports'] as int?) ?? 0,
    );
  }

  String get priceLabel => price != null ? 'S/ ${price!.toStringAsFixed(0)}' : 'Consultar';

  bool get isExpired => DateTime.now().isAfter(expiresAt);

  Duration get timeLeft => expiresAt.difference(DateTime.now());

  String get timeLeftLabel {
    final d = timeLeft;
    if (d.isNegative) return 'Expirada';
    if (d.inHours >= 24) return '${d.inDays}d restante${d.inDays == 1 ? '' : 's'}';
    if (d.inHours >= 1)  return '${d.inHours}h restante${d.inHours == 1 ? '' : 's'}';
    return '${d.inMinutes}min restantes';
  }
}

class OfferCategoryModel {
  final int id;
  final String name;
  final String slug;

  const OfferCategoryModel({required this.id, required this.name, required this.slug});

  factory OfferCategoryModel.fromJson(Map<String, dynamic> json) => OfferCategoryModel(
    id:   json['id'] as int,
    name: json['name'] as String,
    slug: json['slug'] as String? ?? '',
  );
}
