import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../constants/app_colors.dart';
import '../theme/app_theme_colors.dart';
import '../../features/showcase/showcase_data.dart';
import '../../features/showcase/showcase_overlay.dart';
import 'app_router.dart' show kProfileBranchNavKey, AppRoutes;
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
    if (current == AppRoutes.tabPerfil && index != AppRoutes.tabPerfil) {
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
      // C-2: las GlobalKeys del showcase (kShowcaseFavTab, etc.) viven en
      // el icono de cada tab. Alertas se movió al AppBar (ver
      // providers_screen.dart) y Ofertas quedó fuera del bottom nav — este
      // widget ahora solo resuelve Favoritos/Perfil, siempre montados
      // (nunca desmontados por activeIcon) porque acá no existe ese
      // concepto: el color/ícono activo se decide con un solo widget.
      // Alto por contenido con un piso de 68, NO alto fijo: el SafeArea suma
      // el inset de la barra de navegación del sistema (24 dp en gestos,
      // ~48 dp en 3 botones) igual que hace el BottomNavigationBar del SDK
      // (minHeight: kBottomNavigationBarHeight + viewPadding.bottom). Con
      // `height: 68` fijo el inset se comía el alto y el tab central (69 dp)
      // desbordaba hasta 49 px.
      child: SafeArea(
        top: false,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 68),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _PyramidSideTab(
                active: currentIndex == AppRoutes.tabFavoritos,
                activeIcon: Icons.favorite_rounded,
                inactiveIcon: Icons.favorite_border_rounded,
                // Color custom — mismo rojo que tenía el corazón activo antes.
                activeColor: const Color(0xFFE53935),
                label: 'Favoritos',
                onTap: () => onTap(AppRoutes.tabFavoritos),
                showcaseWrap: (icon) => ShowcaseTarget(
                  step: kShowcaseStepsRegistered.firstWhere(
                    (s) => s.key == kShowcaseFavTab,
                  ),
                  isLast: isLastShowcaseStep(kShowcaseFavTab, isGuest: false),
                  targetHeight: 32,
                  targetWidth: 32,
                  child: icon,
                ),
              ),
              _PyramidCenterTab(
                active: currentIndex == AppRoutes.tabExplorar,
                onTap: () => onTap(AppRoutes.tabExplorar),
              ),
              _PyramidSideTab(
                active: currentIndex == AppRoutes.tabPerfil,
                activeIcon: Icons.person_rounded,
                inactiveIcon: Icons.person_outline_rounded,
                label: 'Perfil',
                onTap: () => onTap(AppRoutes.tabPerfil),
                showcaseWrap: (icon) => ShowcaseTarget(
                  step: kShowcaseStepsGuest.firstWhere(
                    (s) => s.key == kShowcaseProfileTab,
                  ),
                  isLast: isLastShowcaseStep(
                    kShowcaseProfileTab,
                    isGuest: true,
                  ),
                  targetHeight: 32,
                  targetWidth: 32,
                  child: icon,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Tab lateral del bottom nav piramidal (Favoritos / Perfil): ícono que
/// cruza-desvanece entre variante activa/inactiva + label que solo se
/// muestra (10px) cuando el tab está activo.
class _PyramidSideTab extends StatelessWidget {
  final bool active;
  final IconData activeIcon;
  final IconData inactiveIcon;
  final String label;
  final VoidCallback onTap;
  final Color activeColor;
  final Widget Function(Widget icon) showcaseWrap;

  const _PyramidSideTab({
    required this.active,
    required this.activeIcon,
    required this.inactiveIcon,
    required this.label,
    required this.onTap,
    required this.showcaseWrap,
    this.activeColor = AppColors.primary,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final icon = AnimatedSwitcher(
      duration: const Duration(milliseconds: 200),
      child: Icon(
        active ? activeIcon : inactiveIcon,
        key: ValueKey(active),
        color: active ? activeColor : c.textMuted,
        size: 24,
      ),
    );
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            showcaseWrap(icon),
            const SizedBox(height: 3),
            AnimatedOpacity(
              duration: const Duration(milliseconds: 200),
              opacity: active ? 1 : 0,
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: activeColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tab central del bottom nav piramidal (Explorar): elevado, más grande,
/// con fondo circular suave cuando está activo y un "bump" de escala
/// (1.0 → 1.15 → 1.0) al convertirse en el tab activo.
class _PyramidCenterTab extends StatefulWidget {
  final bool active;
  final VoidCallback onTap;

  const _PyramidCenterTab({required this.active, required this.onTap});

  @override
  State<_PyramidCenterTab> createState() => _PyramidCenterTabState();
}

class _PyramidCenterTabState extends State<_PyramidCenterTab>
    with SingleTickerProviderStateMixin {
  late final AnimationController _bumpController;
  late final Animation<double> _bump;

  @override
  void initState() {
    super.initState();
    _bumpController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _bump = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(
          begin: 1.0,
          end: 1.15,
        ).chain(CurveTween(curve: Curves.easeOut)),
        weight: 50,
      ),
      TweenSequenceItem(
        tween: Tween(
          begin: 1.15,
          end: 1.0,
        ).chain(CurveTween(curve: Curves.easeIn)),
        weight: 50,
      ),
    ]).animate(_bumpController);
    if (widget.active) _bumpController.value = 1;
  }

  @override
  void didUpdateWidget(covariant _PyramidCenterTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) {
      _bumpController.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _bumpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: widget.onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Transform.translate(
            offset: const Offset(0, -9),
            child: AnimatedBuilder(
              animation: _bump,
              builder: (_, child) =>
                  Transform.scale(scale: _bump.value, child: child),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.active
                      ? AppColors.primary.withValues(alpha: 0.12)
                      : Colors.transparent,
                  boxShadow: widget.active
                      ? [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.18),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: TweenAnimationBuilder<Color?>(
                    tween: ColorTween(
                      end: widget.active ? AppColors.primary : c.textMuted,
                    ),
                    duration: const Duration(milliseconds: 200),
                    builder: (_, color, _) =>
                        Icon(Icons.explore_rounded, size: 29, color: color),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 3),
          AnimatedOpacity(
            duration: const Duration(milliseconds: 200),
            opacity: widget.active ? 1 : 0,
            child: const Text(
              'Explorar',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
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
