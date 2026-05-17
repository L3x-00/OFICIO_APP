import 'package:flutter/material.dart';

/// Definiciones de los pasos del Feature Discovery de la pantalla
/// principal. Centraliza los `GlobalKey` y los textos para que los
/// widgets target y el orquestador (ShowCaseWidget) compartan la misma
/// referencia sin duplicar strings.
///
/// **No** crear las keys dentro de los widgets — se instancian aquí
/// una sola vez por ejecución para que `startShowCase` reciba la misma
/// instancia que el `Showcase(key: ...)` declara en el árbol.

// ─────────────────────────────────────────────
// Pasos compartidos por usuario registrado e invitado
// ─────────────────────────────────────────────
final GlobalKey kShowcaseProviderCard = GlobalKey(debugLabel: 'sc.providerCard');
final GlobalKey kShowcaseSubastaBanner = GlobalKey(debugLabel: 'sc.subastaBanner');
final GlobalKey kShowcaseSearchBar = GlobalKey(debugLabel: 'sc.searchBar');
final GlobalKey kShowcaseFiltersIcon = GlobalKey(debugLabel: 'sc.filtersIcon');
final GlobalKey kShowcaseLocationChip = GlobalKey(debugLabel: 'sc.locationChip');
final GlobalKey kShowcaseCoinsIcon = GlobalKey(debugLabel: 'sc.coinsIcon');
final GlobalKey kShowcaseJoinUsFab = GlobalKey(debugLabel: 'sc.joinUsFab');

// ─────────────────────────────────────────────
// Tabs del BottomNavigationBar (declarados en app_shell)
// ─────────────────────────────────────────────
final GlobalKey kShowcaseFavTab = GlobalKey(debugLabel: 'sc.favTab');
final GlobalKey kShowcaseOffersTab = GlobalKey(debugLabel: 'sc.offersTab');
final GlobalKey kShowcaseAlertsTab = GlobalKey(debugLabel: 'sc.alertsTab');
final GlobalKey kShowcaseProfileTab = GlobalKey(debugLabel: 'sc.profileTab');

/// Modelo simple para los textos de cada paso. El orquestador los
/// consulta para wrappear los widgets target con el `title` y
/// `description` correctos.
class ShowcaseStep {
  final GlobalKey key;
  final String title;
  final String description;
  const ShowcaseStep({
    required this.key,
    required this.title,
    required this.description,
  });
}

/// Orden y copy de los pasos para usuario REGISTRADO.
final List<ShowcaseStep> kShowcaseStepsRegistered = [
  ShowcaseStep(
    key: kShowcaseProviderCard,
    title: 'Tarjeta del proveedor',
    description:
        'Aquí puedes ver reseñas, información, descripción, fotos, '
        'reportar, los botones de mensaje, llamadas, WhatsApp y el '
        'ícono de compartir.',
  ),
  ShowcaseStep(
    key: kShowcaseSubastaBanner,
    title: 'Publica tus necesidades',
    description:
        'Publica lo que necesitas y recibe ofertas de profesionales '
        'cercanos. Ellos te enviarán sus propuestas y tú eliges la '
        'mejor.',
  ),
  ShowcaseStep(
    key: kShowcaseSearchBar,
    title: 'Busca lo que necesitas',
    description:
        'Toca la lupa para buscar profesionales por nombre, categoría '
        'o servicio. Escribe y los resultados aparecerán '
        'automáticamente.',
  ),
  ShowcaseStep(
    key: kShowcaseFiltersIcon,
    title: 'Filtros avanzados',
    description:
        'Filtra por categoría, disponibilidad, verificación, orden y '
        'ubicación. También puedes ampliar la búsqueda a todo el '
        'departamento.',
  ),
  ShowcaseStep(
    key: kShowcaseLocationChip,
    title: 'Tu ubicación',
    description:
        'Muestra los servicios cerca de ti. Toca para cambiar de '
        'ubicación o ampliar la búsqueda a todo el Perú.',
  ),
  ShowcaseStep(
    key: kShowcaseCoinsIcon,
    title: 'Monedas y referidos',
    description:
        'Invita a profesionales y gana monedas. Canjéalas por planes '
        'gratis o servicios reales de la comunidad.',
  ),
  ShowcaseStep(
    key: kShowcaseJoinUsFab,
    title: 'Únete como profesional o negocio',
    description:
        '¿Quieres ofrecer tus servicios? Regístrate como profesional '
        'independiente o registra tu negocio. Elige entre planes '
        'Gratis, Estándar y Premium.',
  ),
  ShowcaseStep(
    key: kShowcaseFavTab,
    title: 'Guarda tus favoritos',
    description:
        'Guarda a tus proveedores de confianza aquí para tener acceso '
        'directo a ellos cuando los necesites.',
  ),
  ShowcaseStep(
    key: kShowcaseOffersTab,
    title: 'Ofertas y promociones',
    description:
        'Descubre descuentos y promociones exclusivas que publican los '
        'proveedores verificados.',
  ),
  ShowcaseStep(
    key: kShowcaseAlertsTab,
    title: 'Tus notificaciones',
    description:
        'Recibe alertas sobre el estado de tus solicitudes, nuevas '
        'ofertas y respuestas de proveedores.',
  ),
];

/// Devuelve true si `key` es el último paso del deck activo. El
/// `ShowcaseTarget` lo usa para cambiar el botón "Siguiente" a
/// "Empezar". "Último" depende del rol (registered vs guest), por eso
/// el helper recibe `isGuest`.
bool isLastShowcaseStep(GlobalKey key, {required bool isGuest}) {
  final deck = isGuest ? kShowcaseStepsGuest : kShowcaseStepsRegistered;
  return deck.isNotEmpty && deck.last.key == key;
}

/// Orden y copy de los pasos para usuario INVITADO. Reusa keys del set
/// registrado donde aplica + paso propio para el CTA de login.
final List<ShowcaseStep> kShowcaseStepsGuest = [
  // 1. Barra de búsqueda
  ShowcaseStep(
    key: kShowcaseSearchBar,
    title: 'Busca lo que necesitas',
    description:
        'Toca la lupa para buscar profesionales por nombre, categoría '
        'o servicio. Escribe y los resultados aparecerán '
        'automáticamente.',
  ),
  // 2. Tarjeta del proveedor
  ShowcaseStep(
    key: kShowcaseProviderCard,
    title: 'Tarjeta del proveedor',
    description:
        'Aquí puedes ver reseñas, información, descripción, fotos, '
        'reportar, los botones de mensaje, llamadas, WhatsApp y el '
        'ícono de compartir.',
  ),
  // 3. Filtros
  ShowcaseStep(
    key: kShowcaseFiltersIcon,
    title: 'Filtros avanzados',
    description:
        'Filtra por categoría, disponibilidad, verificación, orden y '
        'ubicación. También puedes ampliar la búsqueda a todo el '
        'departamento.',
  ),
  // 4. Ubicación
  ShowcaseStep(
    key: kShowcaseLocationChip,
    title: 'Tu ubicación',
    description:
        'Muestra los servicios cerca de ti. Toca para cambiar de '
        'ubicación o ampliar la búsqueda a todo el Perú.',
  ),
  // 5. Login / Registro — reusa el tab de Perfil del bottom nav que
  // para invitados lleva a Login/Registro.
  ShowcaseStep(
    key: kShowcaseProfileTab,
    title: 'Crea tu cuenta gratis',
    description:
        'Regístrate para chatear con profesionales, guardar favoritos, '
        'recibir notificaciones y publicar tus necesidades. Es '
        'completamente gratis.',
  ),
  // 6. CTA Join Us
  ShowcaseStep(
    key: kShowcaseJoinUsFab,
    title: 'Únete como profesional o negocio',
    description:
        '¿Quieres ofrecer tus servicios? Regístrate como profesional '
        'independiente o registra tu negocio. Elige entre planes '
        'Gratis, Estándar y Premium.',
  ),
];
