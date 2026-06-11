/// Localidad extra (no-seed) recibida del backend. El cliente mobile
/// la fusiona con el catálogo estático en `peru_locations.dart`.
class LocalityExtra {
  final int id;
  final String department;
  final String? province;
  final String? district;

  /// 'SEED' | 'USER' | 'ADMIN' — sirve para etiquetar visualmente en el
  /// futuro (por ahora todo lo que viene de /extras es no-seed).
  final String source;

  const LocalityExtra({
    required this.id,
    required this.department,
    this.province,
    this.district,
    this.source = 'USER',
  });

  factory LocalityExtra.fromJson(Map<String, dynamic> json) {
    return LocalityExtra(
      id: (json['id'] as num).toInt(),
      department: json['department'] as String,
      province: json['province'] as String?,
      district: json['district'] as String?,
      source: (json['source'] as String?) ?? 'USER',
    );
  }

  /// Serialización para el caché local (round-trip con [fromJson]).
  Map<String, dynamic> toJson() => {
    'id': id,
    'department': department,
    'province': province,
    'district': district,
    'source': source,
  };
}
