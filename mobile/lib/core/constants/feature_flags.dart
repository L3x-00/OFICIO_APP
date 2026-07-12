/// Kill-switches de features OCULTAS (no eliminadas) — 2026-07.
///
/// La app está en lanzamiento y se redujo la superficie para simplificar:
/// subastas (ConfiServ) y ofertas (offer_posts) quedan apagadas pero todo
/// su código sigue compilando. Reactivar = poner `true` + recompilar .aab
/// (el backend tiene su propio switch: FEATURE_SUBASTAS / FEATURE_OFERTAS
/// en Render — encender AMBOS lados).
///
/// Al ser `const`, el compilador elimina las ramas muertas (tree-shaking):
/// cero costo en runtime y los índices de tabs se ajustan solos donde se
/// usa collection-if.
library;

/// Subastas "ConfiServ": publicar necesidades, ofertas de proveedores,
/// Mis solicitudes (cliente) y tab Oportunidades (panel proveedor).
const bool kSubastasEnabled = false;

/// Ofertas/promociones (offer_posts): tab Ofertas del cliente, banner del
/// home y sección de gestión en el panel proveedor.
const bool kOfertasEnabled = false;

/// Referidos/monedas: contador de monedas del home, pantalla de canje,
/// entradas en perfil/ajustes, campo "código de referido" del onboarding.
/// Los saldos quedan CONGELADOS en BD (invisibles, no canjeables) y
/// reaparecen al reactivar. Backend: FEATURE_REFERIDOS.
const bool kReferidosEnabled = false;

// NOTA agenda/cotización: NO llevan flag móvil. Sus CTAs y entradas del
// panel se apagan solos porque derivan del array `features` que el backend
// ya filtra (FEATURE_AGENDA/FEATURE_COTIZACION + carta/catálogo solo
// NEGOCIO). "Mis citas"/"Mis cotizaciones" del perfil cliente se CONSERVAN
// para drenar citas/cotizaciones existentes.
