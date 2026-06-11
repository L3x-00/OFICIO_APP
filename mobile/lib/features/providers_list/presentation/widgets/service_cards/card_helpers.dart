// ─── Helpers de plan de suscripción ──────────────────────────
//
// Compartidos por todas las variantes de tarjeta para decidir bordes,
// badges y gating de contacto.

import '../../../domain/models/provider_model.dart';

bool isPremiumPlan(String plan) => plan == 'PREMIUM';

bool isStandardPlan(String plan) => plan == 'ESTANDAR' || plan == 'GRATIS';

/// Sólo planes pagos exponen WhatsApp/Llamada; GRATIS sólo deja el chat
/// interno (la fricción de los pagos paga la libertad de contacto).
bool isPaidPlan(String plan) => plan == 'PREMIUM' || plan == 'ESTANDAR';

// ─── Helpers de ubicación (SIEMPRE desde la BD, nunca geocoding) ──────
//
// Para la línea "Ubicación" se prefieren siempre los datos de la BD
// (localityProvince/localityDistrict). Nominatim solo se usa para resolver
// la "Dirección" exacta cuando no está guardada (ver ProviderAddressText).

/// "Departamento, Provincia" (ej. "Junín, Huancayo") — ubicación GRUESA que
/// se muestra cuando el proveedor desactivó `showExactLocation`. Nunca expone
/// distrito ni dirección. Null si no hay datos.
String? departmentProvinceLabel(ProviderModel p) {
  final dep = p.localityDepartment?.trim();
  final prov = p.localityProvince?.trim();
  final parts = <String>[
    if (dep != null && dep.isNotEmpty) dep,
    if (prov != null && prov.isNotEmpty) prov,
  ];
  return parts.isEmpty ? null : parts.join(', ');
}

/// "Provincia, Distrito" (ej. "Huancayo, Chilca"). Null si no hay datos.
/// Si el proveedor ocultó su ubicación exacta, colapsa a "Departamento,
/// Provincia" (privacidad = derecho, independiente del plan).
String? provinceDistrictLabel(ProviderModel p) {
  if (!p.showExactLocation) return departmentProvinceLabel(p);
  final prov = p.localityProvince?.trim();
  final dist = p.localityDistrict?.trim();
  final parts = <String>[
    if (prov != null && prov.isNotEmpty) prov,
    if (dist != null && dist.isNotEmpty) dist,
  ];
  return parts.isEmpty ? null : parts.join(', ');
}

/// "Distrito, Provincia" — orden usado en la cuadrícula (Mosaic).
/// Igual que arriba: colapsa a "Departamento, Provincia" si `showExactLocation`
/// está desactivado.
String? districtProvinceLabel(ProviderModel p) {
  if (!p.showExactLocation) return departmentProvinceLabel(p);
  final prov = p.localityProvince?.trim();
  final dist = p.localityDistrict?.trim();
  final parts = <String>[
    if (dist != null && dist.isNotEmpty) dist,
    if (prov != null && prov.isNotEmpty) prov,
  ];
  return parts.isEmpty ? null : parts.join(', ');
}

/// NEGOCIO: estado Abierto/Cerrado a partir de la disponibilidad.
/// Ocupado ⇒ Cerrado; cualquier otro estado ⇒ Abierto.
bool isBusinessOpen(ProviderModel p) =>
    p.availability != AvailabilityStatus.ocupado;
