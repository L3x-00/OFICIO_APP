/// Tipos canónicos de proveedor usados por API y UI móvil.
///
/// `PROFESSIONAL` y `BUSINESS` solo existen como aliases de lectura para
/// clientes/backend antiguos. Nunca se vuelven a emitir.
enum ProviderType {
  oficio,
  profesional,
  negocio,
  unknown;

  static ProviderType fromString(String? value) {
    switch (value?.trim().toUpperCase()) {
      case 'OFICIO':
      case 'PROFESSIONAL':
        return ProviderType.oficio;
      case 'PROFESIONAL':
        return ProviderType.profesional;
      case 'NEGOCIO':
      case 'BUSINESS':
        return ProviderType.negocio;
      default:
        return ProviderType.unknown;
    }
  }

  String? get apiValue => switch (this) {
    ProviderType.oficio => 'OFICIO',
    ProviderType.profesional => 'PROFESIONAL',
    ProviderType.negocio => 'NEGOCIO',
    ProviderType.unknown => null,
  };

  String get label => switch (this) {
    ProviderType.oficio => 'Oficios',
    ProviderType.profesional => 'Servicios profesionales',
    ProviderType.negocio => 'Negocios',
    ProviderType.unknown => 'Sin clasificar',
  };

  bool get isIndividual =>
      this == ProviderType.oficio || this == ProviderType.profesional;
}

String? normalizeProviderType(String? value) =>
    ProviderType.fromString(value).apiValue;
