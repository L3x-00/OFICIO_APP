import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../constants/feature_flags.dart';
import '../theme/app_theme_colors.dart';
import '../../features/notifications/presentation/providers/notifications_provider.dart';
import '../../features/showcase/showcase_data.dart';
import '../../features/showcase/showcase_overlay.dart';
import 'app_router.dart' show kProfileBranchNavKey;
import '../../features/providers_list/presentation/widgets/service_cards/service_detail_dialog.dart';

/// Shell del [StatefulShellRoute] — Scaffold con bottom navigation que
/// preserva el stack y estado de cada uno de los 5 tabs principales.
///
/// El `navigationShell` recibe del router y maneja el `IndexedStack`
/// internamente; aquí solo se conecta el `BottomNavigationBar` con el
/// `goBranch()` para cambiar de tab sin perder el estado.
class AppShell extends StatefulWidget {
  final StatefulNavigationShell navigationShell;

  const AppShell({super.key, required this.navigationShell});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  DateTime? _lastBackPress;

  void _onTabTapped(int index) {
    // Si saliendo del tab Perfil hacia otro tab, popUntil root
    // del branch para que las sub-páginas (Mis mensajes, etc.)
    // NO queden abiertas al volver. UX solicitada por el user.
    final current = widget.navigationShell.currentIndex;
    // El índice de Perfil depende de si el tab Ofertas existe (flag).
    const profileIdx = kOfertasEnabled ? 4 : 3;
    if (current == profileIdx && index != profileIdx) {
      kProfileBranchNavKey.currentState?.popUntil((r) => r.isFirst);
    }
    // Cierra el dialog flotante del detalle de servicio si está abierto
    // — UX solicitada: al cambiar de tab no debe quedar visible sobre
    // el nuevo contenido.
    ServiceDetailDialog.dismissActive();
    widget.navigationShell.goBranch(index, initialLocation: index == current);
  }

  @override
  Widget build(BuildContext context) {
    // ShowcaseRoot envuelve todo el shell — así los `Showcase` del
    // bottom nav y los de la pantalla principal comparten el mismo
    // `ShowCaseWidget` ancestro. `HomeShowcaseHost` (dentro de
    // ProvidersScreen) se encarga del trigger y del markSeen.
    return ShowcaseRoot(child: _buildShell(context));
  }

  Widget _buildShell(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        final now = DateTime.now();
        final isSecondPress =
            _lastBackPress != null &&
            now.difference(_lastBackPress!) < const Duration(seconds: 2);
        if (isSecondPress) {
          _lastBackPress = null;
          // ignore: deprecated_member_use
          SystemNavigator.pop();
        } else {
          _lastBackPress = now;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Desliza otra vez para salir de la app'),
              duration: const Duration(seconds: 2),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            ),
          );
        }
      },
      child: Scaffold(
        body: widget.navigationShell,
        bottomNavigationBar: _BottomNav(
          currentIndex: widget.navigationShell.currentIndex,
          onTap: _onTabTapped,
        ),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const _BottomNav({required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        border: Border(top: BorderSide(color: c.border)),
        boxShadow: c.isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 8,
                  offset: const Offset(0, -2),
                ),
              ],
      ),
      // C-2: las GlobalKeys del showcase (kShowcaseFavTab, etc.)
      // viven en `item.icon`. Cuando un tab está activo,
      // BottomNavigationBar renderiza `activeIcon` y el `icon`
      // queda desmontado (sin RenderBox). Por eso el tutorial del
      // cliente arranca SIEMPRE desde tab 0 (Explorar): los tabs
      // 1-4 están inactivos, sus `icon` están montados, las keys
      // resuelven. Defensa adicional: _AutoStart filtra keys cuyo
      // currentContext sea null antes de startShowCase (C-1).
      child: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: onTap,
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: c.textMuted,
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.search_rounded),
            label: 'Explorar',
          ),
          BottomNavigationBarItem(
            label: 'Favoritos',
            icon: ShowcaseTarget(
              step: kShowcaseStepsRegistered.firstWhere(
                (s) => s.key == kShowcaseFavTab,
              ),
              isLast: isLastShowcaseStep(kShowcaseFavTab, isGuest: false),
              targetHeight: 32,
              targetWidth: 32,
              child: const Icon(Icons.favorite_border_rounded),
            ),
            // Color custom al activarse — color explícito sobrescribe
            // el `selectedItemColor` global del BottomNavigationBar
            // solo para el icono. El label sigue siendo primary.
            activeIcon: const Icon(
              Icons.favorite_rounded,
              color: Color(0xFFE53935),
            ),
          ),
          // Feature OCULTA (kOfertasEnabled) — el mismo flag quita el branch
          // '/offers' del router y el paso kShowcaseOffersTab del deck, así
          // los índices y el firstWhere del showcase quedan sincronizados.
          if (kOfertasEnabled)
            BottomNavigationBarItem(
              label: 'Ofertas',
              icon: ShowcaseTarget(
                step: kShowcaseStepsRegistered.firstWhere(
                  (s) => s.key == kShowcaseOffersTab,
                ),
                isLast: isLastShowcaseStep(kShowcaseOffersTab, isGuest: false),
                targetHeight: 32,
                targetWidth: 32,
                child: const Icon(Icons.local_offer_outlined),
              ),
              activeIcon: const Icon(
                Icons.local_offer_rounded,
                color: Color(0xFFFF9800),
              ),
            ),
          BottomNavigationBarItem(
            label: 'Alertas',
            icon: ShowcaseTarget(
              step: kShowcaseStepsRegistered.firstWhere(
                (s) => s.key == kShowcaseAlertsTab,
              ),
              isLast: isLastShowcaseStep(kShowcaseAlertsTab, isGuest: false),
              targetHeight: 32,
              targetWidth: 32,
              child: Consumer<NotificationsProvider>(
                builder: (_, notifs, _) => Badge(
                  isLabelVisible: notifs.unreadCount > 0,
                  label: Text(
                    notifs.unreadCount > 9 ? '9+' : '${notifs.unreadCount}',
                    style: const TextStyle(fontSize: 10),
                  ),
                  child: const Icon(Icons.notifications_none_rounded),
                ),
              ),
            ),
            activeIcon: Consumer<NotificationsProvider>(
              builder: (_, notifs, _) => Badge(
                isLabelVisible: notifs.unreadCount > 0,
                label: Text(
                  notifs.unreadCount > 9 ? '9+' : '${notifs.unreadCount}',
                  style: const TextStyle(fontSize: 10),
                ),
                child: const Icon(
                  Icons.notifications_rounded,
                  color: Color(0xFFFBC02D),
                ),
              ),
            ),
          ),
          BottomNavigationBarItem(
            label: 'Perfil',
            icon: ShowcaseTarget(
              step: kShowcaseStepsGuest.firstWhere(
                (s) => s.key == kShowcaseProfileTab,
              ),
              isLast: isLastShowcaseStep(kShowcaseProfileTab, isGuest: true),
              targetHeight: 32,
              targetWidth: 32,
              child: const Icon(Icons.person_outline_rounded),
            ),
            activeIcon: const Icon(Icons.person_rounded),
          ),
        ],
      ),
    );
  }
}

// C-11: _TabAwareShell vivía aquí pero nunca se instanciaba — código
// muerto desde la refactorización a IndexedStack en StatefulShellRoute.
// Borrado para reducir confusión (el comentario "no interfiere con el
// showcase" del spec original era trivialmente cierto: no existía).
