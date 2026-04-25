/// Límites del sistema según plan de suscripción.
/// Fuente única de verdad — cambiar aquí afecta toda la app.
class PlanLimits {
  PlanLimits._();

  // ── Fotos del perfil ─────────────────────────────────────
  static int photos(String plan) => switch (plan.toUpperCase()) {
        'PREMIUM'  => 10,
        'ESTANDAR' => 6,
        _          => 3, // GRATIS
      };

  // ── Servicios (OFICIO) ───────────────────────────────────
  static int services(String plan) => switch (plan.toUpperCase()) {
        'PREMIUM'  => 999,
        'ESTANDAR' => 6,
        _          => 1, // GRATIS
      };

  // ── Productos (NEGOCIO) ──────────────────────────────────
  static int products(String plan) => switch (plan.toUpperCase()) {
        'PREMIUM'  => 999,
        'ESTANDAR' => 6,
        _          => 3, // GRATIS
      };

  /// Máx. ítems para el tipo de perfil dado.
  static int items(String plan, {required bool isNegocio}) =>
      isNegocio ? products(plan) : services(plan);

  // ── Fotos por producto (NEGOCIO) ─────────────────────────
  /// GRATIS no puede subir foto por producto; ESTANDAR/PREMIUM sí.
  static bool hasProductPhotos(String plan) =>
      plan.toUpperCase() != 'GRATIS';

  // ── Estadísticas / Gestión de visitas ────────────────────
  static bool hasStatsAccess(String plan) =>
      plan.toUpperCase() != 'GRATIS';

  // ── Helpers booleanos ────────────────────────────────────
  static bool canAddPhoto(String plan, int currentCount) =>
      currentCount < photos(plan);

  static bool canAddItem(String plan, int currentCount,
          {required bool isNegocio}) =>
      currentCount < items(plan, isNegocio: isNegocio);

  // ── Etiquetas legibles ───────────────────────────────────
  static String photosLabel(String plan) =>
      '${photos(plan)} fotos';

  static String itemsLabel(String plan, {required bool isNegocio}) {
    final n = items(plan, isNegocio: isNegocio);
    final noun = isNegocio ? 'producto' : 'servicio';
    return n >= 999 ? '${noun}s ilimitados' : '$n ${n == 1 ? noun : '${noun}s'}';
  }

  static String statsLabel(String plan) =>
      hasStatsAccess(plan) ? 'Estadísticas completas' : 'Sin estadísticas';

  /// Devuelve la etiqueta del siguiente plan (para CTAs de upgrade).
  static String nextPlan(String plan) => switch (plan.toUpperCase()) {
        'GRATIS'   => 'Estándar',
        'ESTANDAR' => 'Premium',
        _          => 'Premium',
      };
}
