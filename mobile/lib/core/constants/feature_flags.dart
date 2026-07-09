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
