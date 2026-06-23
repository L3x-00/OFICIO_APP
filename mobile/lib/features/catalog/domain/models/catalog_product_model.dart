// Modelos del Catálogo de Productos. Reflejan `GET /providers/:id/catalog`
// (agrupado por sección). A diferencia de la carta: tiene `stock`, la sección
// es texto libre y no hay "destacado".
import '../../../../shared/cart/cart_order.dart';

class CatalogProductModel implements OrderableItem {
  final int id;
  @override
  final String name;
  final String? description;
  final double price;
  final double? offerPrice;
  final int? stock;
  final String? category;
  final String? photoUrl;
  final bool isAvailable;
  final int order;

  /// Link wa.me prearmado (lo arma el backend; null si no es pedible).
  final String? whatsappOrderUrl;

  const CatalogProductModel({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.offerPrice,
    this.stock,
    this.category,
    this.photoUrl,
    this.isAvailable = true,
    this.order = 0,
    this.whatsappOrderUrl,
  });

  bool get hasOffer =>
      offerPrice != null && offerPrice! > 0 && offerPrice! < price;

  @override
  double get effectivePrice => hasOffer ? offerPrice! : price;

  /// Agotado si el toggle lo marca o si el stock llegó a 0 (auto).
  bool get isSoldOut => !isAvailable || stock == 0;

  factory CatalogProductModel.fromJson(Map<String, dynamic> json) {
    return CatalogProductModel(
      id: json['id'] as int,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      offerPrice: (json['offerPrice'] as num?)?.toDouble(),
      stock: json['stock'] as int?,
      category: json['category'] as String?,
      photoUrl: json['photoUrl'] as String?,
      isAvailable: json['isAvailable'] as bool? ?? true,
      order: json['order'] as int? ?? 0,
      whatsappOrderUrl: json['whatsappOrderUrl'] as String?,
    );
  }
}

/// Sección del catálogo con sus productos (orden ya resuelto por el backend).
class CatalogSection {
  final String section;
  final List<CatalogProductModel> items;

  const CatalogSection({required this.section, required this.items});

  /// Etiqueta legible: la sección es texto libre; "otros" → "Otros".
  String get label => section == 'otros' ? 'Otros' : section;

  factory CatalogSection.fromJson(Map<String, dynamic> json) {
    return CatalogSection(
      section: json['section'] as String? ?? 'otros',
      items: (json['items'] as List? ?? [])
          .map((e) => CatalogProductModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Respuesta pública completa del catálogo de un proveedor.
class CatalogResponse {
  final int providerId;
  final List<CatalogSection> sections;

  const CatalogResponse({required this.providerId, required this.sections});

  bool get isEmpty => sections.every((s) => s.items.isEmpty);

  List<CatalogProductModel> get allItems =>
      sections.expand((s) => s.items).toList();

  factory CatalogResponse.fromJson(Map<String, dynamic> json) {
    return CatalogResponse(
      providerId: json['providerId'] as int? ?? 0,
      sections: (json['sections'] as List? ?? [])
          .map((e) => CatalogSection.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
