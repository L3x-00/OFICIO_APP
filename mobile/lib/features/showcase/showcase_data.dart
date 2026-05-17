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

// ═══════════════════════════════════════════════════════════════
// FEATURE DISCOVERY — PANEL DEL PROVEEDOR (admin)
// ═══════════════════════════════════════════════════════════════
//
// Selectivo: solo resaltamos lo que NO es obvio y aporta valor real
// (límites de plan, vista pública, switch de perfil). Tutoriales por
// tab — no un walkthrough lineal del panel completo.
//
// Aislamiento: prefijos `kAdmin…` para no chocar con las keys del
// deck cliente y para que el filtro de "qué paso aplica a qué deck"
// sea trivial de auditar.

// ── TAB INICIO ───────────────────────────────────────────────
final GlobalKey kAdminPublicPreviewKey = GlobalKey(debugLabel: 'sc.admin.publicPreview');
final GlobalKey kAdminPlanBadgeKey     = GlobalKey(debugLabel: 'sc.admin.planBadge');
final GlobalKey kAdminSwitchRoleKey    = GlobalKey(debugLabel: 'sc.admin.switchRole');

// ── TAB SERVICIOS ────────────────────────────────────────────
final GlobalKey kAdminServiceQuotaKey  = GlobalKey(debugLabel: 'sc.admin.serviceQuota');
final GlobalKey kAdminAddServiceKey    = GlobalKey(debugLabel: 'sc.admin.addService');

// ── TAB ESTADÍSTICAS ─────────────────────────────────────────
final GlobalKey kAdminStatsPeriodKey    = GlobalKey(debugLabel: 'sc.admin.statsPeriod');
final GlobalKey kAdminStatsBreakdownKey = GlobalKey(debugLabel: 'sc.admin.statsBreakdown');
final GlobalKey kAdminStatsChartKey     = GlobalKey(debugLabel: 'sc.admin.statsChart');

/// Identificador del tab del panel para la clave de SharedPreferences.
/// Mantenido como String literal (no enum) para que el formato de la
/// key —`has_seen_admin_{tab}_{userId}_{providerType}`— quede claro
/// en el storage.
class AdminTab {
  static const String home     = 'home';
  static const String services = 'services';
  static const String stats    = 'stats';
}

/// Step "switch role" extraído como constante para que el
/// `_PanelAppBar` (que vive fuera del tab Home) lo comparta con
/// `buildAdminHomeSteps()`. Antes ambos lados declaraban su propio
/// `ShowcaseStep` literal y divergían si alguien editaba uno solo.
final ShowcaseStep kAdminSwitchRoleStep = ShowcaseStep(
  key: kAdminSwitchRoleKey,
  title: 'Tienes dos perfiles',
  description:
      'Puedes alternar entre tu perfil de Profesional y '
      'Negocio. Cada uno tiene su propio panel, estadísticas '
      'y configuración.',
);

/// Builder de los pasos para el tab INICIO. Los pasos opcionales
/// (switch de rol, copy alternativo por plan GRATIS) dependen del
/// estado en runtime — por eso es función, no constante.
List<ShowcaseStep> buildAdminHomeSteps({
  required String plan,
  required bool   hasBothProfiles,
}) {
  final isFree = plan == 'GRATIS';
  return [
    ShowcaseStep(
      key: kAdminPublicPreviewKey,
      title: 'Así te ven tus clientes',
      description:
          'Si eres plan GRATIS, WhatsApp y llamadas aparecen '
          'bloqueados. Sube a Estándar o Premium para activarlos.',
    ),
    ShowcaseStep(
      key: kAdminPlanBadgeKey,
      title: 'Tu plan actual',
      description: isFree
          ? 'Estás en plan Gratis. Toca para ver cómo destacar más.'
          : 'Aquí ves tu membresía. Toca para descubrir cómo '
            'obtener más beneficios y visibilidad.',
    ),
    if (hasBothProfiles) kAdminSwitchRoleStep,
  ];
}

/// Builder de pasos para el tab SERVICIOS. El paso del FAB sólo
/// aparece si el usuario ya llegó al límite — no tiene sentido
/// destacar "necesitas publicar más" si todavía puede añadir.
List<ShowcaseStep> buildAdminServicesSteps({
  required bool atLimit,
}) {
  return [
    ShowcaseStep(
      key: kAdminServiceQuotaKey,
      title: 'Tu cupo de servicios',
      description:
          'Con plan Gratis solo puedes publicar 1 servicio. Sube a '
          'Estándar (6) o Premium (ilimitado) para mostrar todo lo '
          'que haces.',
    ),
    if (atLimit)
      ShowcaseStep(
        key: kAdminAddServiceKey,
        title: '¿Necesitas publicar más?',
        description:
            'Has llegado al límite de tu plan. Toca aquí para ver '
            'cómo expandir tu catálogo.',
      ),
  ];
}

/// Builder de pasos para el tab ESTADÍSTICAS. El copy del gráfico
/// cambia si no hay datos todavía (evita prometer "tus días fuertes"
/// cuando todo está en cero).
List<ShowcaseStep> buildAdminStatsSteps({
  required bool hasChartData,
}) {
  return [
    ShowcaseStep(
      key: kAdminStatsPeriodKey,
      title: 'Mide tu crecimiento',
      description:
          'Cambia el rango de tiempo para ver tu evolución. Ideal '
          'para medir el impacto de tus promociones.',
    ),
    ShowcaseStep(
      key: kAdminStatsBreakdownKey,
      title: '¿Cómo te contactan?',
      description:
          'Descubre si tus clientes prefieren WhatsApp o llamadas '
          'y optimiza tu disponibilidad.',
    ),
    ShowcaseStep(
      key: kAdminStatsChartKey,
      title: hasChartData ? 'Tus días fuertes' : 'Tu crecimiento diario',
      description: hasChartData
          ? 'Identifica qué días recibes más contactos. ¡Publica '
            'ofertas esos días para maximizar!'
          : 'Aquí verás tu crecimiento diario. ¡Sigue promocionándote!',
    ),
  ];
}

/// `isLast` para los decks del panel admin. Como cada tab tiene su
/// propio deck pequeño, el helper recibe la lista activa.
bool isLastAdminStep(GlobalKey key, List<ShowcaseStep> deck) {
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
