/// Modelos del "Alcance" — distritos donde el proveedor es visible.
/// Respuesta de GET/PUT /provider-profile/me/coverage.
class CoverageLocality {
  final int id;
  final String name;
  final String? department;
  final String? province;
  final String? district;

  const CoverageLocality({
    required this.id,
    required this.name,
    this.department,
    this.province,
    this.district,
  });

  /// Nombre para mostrar: el distrito si existe, sino el nombre genérico.
  String get label => district ?? name;

  factory CoverageLocality.fromJson(Map<String, dynamic> json) {
    return CoverageLocality(
      id: json['id'] as int,
      name: json['name'] as String? ?? '',
      department: json['department'] as String?,
      province: json['province'] as String?,
      district: json['district'] as String?,
    );
  }
}

class CoverageModel {
  /// GRATIS | ESTANDAR | PREMIUM
  final String plan;

  /// Límite TOTAL de distritos visibles (incluye el registrado).
  final int maxDistricts;

  /// true = plan GRATIS: la selección está bloqueada.
  final bool locked;

  /// Distrito registrado (siempre visible, no editable).
  final CoverageLocality? home;

  /// Distritos ADICIONALES elegidos.
  final List<CoverageLocality> selected;

  /// Distritos elegibles (misma provincia del registrado).
  final List<CoverageLocality> options;

  const CoverageModel({
    required this.plan,
    required this.maxDistricts,
    required this.locked,
    this.home,
    this.selected = const [],
    this.options = const [],
  });

  /// Máximo de distritos adicionales al registrado.
  int get maxExtras => maxDistricts > 1 ? maxDistricts - 1 : 0;

  factory CoverageModel.fromJson(Map<String, dynamic> json) {
    List<CoverageLocality> parseList(dynamic raw) => (raw as List? ?? [])
        .map((e) => CoverageLocality.fromJson(e as Map<String, dynamic>))
        .toList();
    return CoverageModel(
      plan: json['plan'] as String? ?? 'GRATIS',
      maxDistricts: json['maxDistricts'] as int? ?? 1,
      locked: json['locked'] as bool? ?? true,
      home: json['home'] != null
          ? CoverageLocality.fromJson(json['home'] as Map<String, dynamic>)
          : null,
      selected: parseList(json['selected']),
      options: parseList(json['options']),
    );
  }
}
