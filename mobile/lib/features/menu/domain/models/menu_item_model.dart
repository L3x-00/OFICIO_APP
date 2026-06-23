// Modelos de la Carta Digital. Reflejan la respuesta del backend
// `GET /providers/:id/menu` (agrupada por sección) y los ítems individuales.

/// Secciones canónicas de la carta (deben coincidir con el enum del backend).
const List<String> kMenuSections = [
  'entrada',
  'fondo',
  'postre',
  'bebida',
  'promocion',
  'otro',
];

/// Etiqueta legible para cada sección.
String menuSectionLabel(String section) {
  switch (section) {
    case 'entrada':
      return 'Entradas';
    case 'fondo':
      return 'Platos de fondo';
    case 'postre':
      return 'Postres';
    case 'bebida':
      return 'Bebidas';
    case 'promocion':
      return 'Promociones';
    default:
      return 'Otros';
  }
}

class MenuItemModel {
  final int id;
  final String name;
  final String? description;
  final double price;
  final double? offerPrice;
  final String? category;
  final String? photoUrl;
  final bool isAvailable;
  final bool isFeatured;
  final int order;

  /// Link wa.me prearmado (lo arma el backend; null si el proveedor no tiene
  /// WhatsApp o lo tiene oculto).
  final String? whatsappOrderUrl;

  const MenuItemModel({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.offerPrice,
    this.category,
    this.photoUrl,
    this.isAvailable = true,
    this.isFeatured = false,
    this.order = 0,
    this.whatsappOrderUrl,
  });

  /// ¿Tiene precio de oferta válido (menor al normal)?
  bool get hasOffer =>
      offerPrice != null && offerPrice! > 0 && offerPrice! < price;

  /// Precio efectivo a cobrar (oferta si aplica, si no el normal).
  double get effectivePrice => hasOffer ? offerPrice! : price;

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    return MenuItemModel(
      id: json['id'] as int,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      offerPrice: (json['offerPrice'] as num?)?.toDouble(),
      category: json['category'] as String?,
      photoUrl: json['photoUrl'] as String?,
      isAvailable: json['isAvailable'] as bool? ?? true,
      isFeatured: json['isFeatured'] as bool? ?? false,
      order: json['order'] as int? ?? 0,
      whatsappOrderUrl: json['whatsappOrderUrl'] as String?,
    );
  }
}

/// Una sección de la carta con sus ítems (orden ya resuelto por el backend).
class MenuSection {
  final String section;
  final List<MenuItemModel> items;

  const MenuSection({required this.section, required this.items});

  String get label => menuSectionLabel(section);

  factory MenuSection.fromJson(Map<String, dynamic> json) {
    return MenuSection(
      section: json['section'] as String? ?? 'otro',
      items: (json['items'] as List? ?? [])
          .map((e) => MenuItemModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Respuesta pública completa de la carta de un proveedor.
class MenuResponse {
  final int providerId;
  final List<MenuSection> sections;

  const MenuResponse({required this.providerId, required this.sections});

  bool get isEmpty => sections.every((s) => s.items.isEmpty);

  /// Lista plana de todos los ítems (para el panel del proveedor).
  List<MenuItemModel> get allItems => sections.expand((s) => s.items).toList();

  factory MenuResponse.fromJson(Map<String, dynamic> json) {
    return MenuResponse(
      providerId: json['providerId'] as int? ?? 0,
      sections: (json['sections'] as List? ?? [])
          .map((e) => MenuSection.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
