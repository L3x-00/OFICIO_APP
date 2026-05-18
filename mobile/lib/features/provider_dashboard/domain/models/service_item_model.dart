/// Modelo de un servicio/producto ofrecido por el proveedor
/// Se almacena en el campo scheduleJson del backend bajo la clave "services"
class ServiceItem {
  final String id;
  final String name;
  final String? description;
  final double? price;
  final String? unit; // 'por hora', 'por trabajo', 'por m²', etc.
  final String? phone;
  /// URL pública de la imagen subida vía /upload/provider-photo.
  /// Persistida en el scheduleJson del backend junto a los otros
  /// campos — backend trata el JSON como opaco así que no requiere
  /// migración.
  final String? imageUrl;

  const ServiceItem({
    required this.id,
    required this.name,
    this.description,
    this.price,
    this.unit,
    this.phone,
    this.imageUrl,
  });

  String get priceLabel {
    if (price == null) return 'Consultar precio';
    final formatted = price! % 1 == 0
        ? '\$${price!.toInt()}'
        : '\$${price!.toStringAsFixed(2)}';
    return unit != null ? '$formatted $unit' : formatted;
  }

  factory ServiceItem.fromJson(Map<String, dynamic> json) {
    return ServiceItem(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      price: (json['price'] as num?)?.toDouble(),
      unit: json['unit'] as String?,
      phone: json['phone'],
      imageUrl: json['imageUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'phone': phone,
    if (description != null) 'description': description,
    if (price != null) 'price': price,
    if (unit != null) 'unit': unit,
    if (imageUrl != null) 'imageUrl': imageUrl,
  };

  ServiceItem copyWith({
    String? name,
    String? description,
    double? price,
    String? unit,
    String? phone,
    String? imageUrl,
  }) {
    return ServiceItem(
      id: id,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      unit: unit ?? this.unit,
      phone: phone ?? this.phone,
      imageUrl: imageUrl ?? this.imageUrl,
    );
  }
}
