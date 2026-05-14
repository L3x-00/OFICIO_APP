// ─── Helpers de plan de suscripción ──────────────────────────
//
// Compartidos por todas las variantes de tarjeta para decidir bordes,
// badges y gating de contacto.

bool isPremiumPlan(String plan) => plan == 'PREMIUM';

bool isStandardPlan(String plan) => plan == 'ESTANDAR' || plan == 'GRATIS';

/// Sólo planes pagos exponen WhatsApp/Llamada; GRATIS sólo deja el chat
/// interno (la fricción de los pagos paga la libertad de contacto).
bool isPaidPlan(String plan) => plan == 'PREMIUM' || plan == 'ESTANDAR';
