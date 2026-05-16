import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../theme/app_theme_colors.dart';
import '../../features/notifications/presentation/providers/notifications_provider.dart';

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
    widget.navigationShell.goBranch(
      index,
      initialLocation: index == widget.navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        final now = DateTime.now();
        final isSecondPress = _lastBackPress != null &&
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
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
            : [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, -2))],
      ),
      child: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: onTap,
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: c.textMuted,
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.search_rounded), label: 'Explorar'),
          const BottomNavigationBarItem(icon: Icon(Icons.favorite_border_rounded), activeIcon: Icon(Icons.favorite_rounded), label: 'Favoritos'),
          const BottomNavigationBarItem(icon: Icon(Icons.local_offer_outlined), activeIcon: Icon(Icons.local_offer_rounded), label: 'Ofertas'),
          BottomNavigationBarItem(
            label: 'Alertas',
            icon: Consumer<NotificationsProvider>(
              builder: (_, notifs, _) => Badge(
                isLabelVisible: notifs.unreadCount > 0,
                label: Text(
                  notifs.unreadCount > 9 ? '9+' : '${notifs.unreadCount}',
                  style: const TextStyle(fontSize: 10),
                ),
                child: const Icon(Icons.notifications_none_rounded),
              ),
            ),
            activeIcon: Consumer<NotificationsProvider>(
              builder: (_, notifs, _) => Badge(
                isLabelVisible: notifs.unreadCount > 0,
                label: Text(
                  notifs.unreadCount > 9 ? '9+' : '${notifs.unreadCount}',
                  style: const TextStyle(fontSize: 10),
                ),
                child: const Icon(Icons.notifications_rounded),
              ),
            ),
          ),
          const BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded), activeIcon: Icon(Icons.person_rounded), label: 'Perfil'),
        ],
      ),
    );
  }
}
/// Wrapper que cierra cualquier bottom sheet abierto cuando el usuario
/// cambia de tab.
class _TabAwareShell extends StatefulWidget {
  final StatefulNavigationShell navigationShell;
  const _TabAwareShell({required this.navigationShell});

  @override
  State<_TabAwareShell> createState() => _TabAwareShellState();
}

class _TabAwareShellState extends State<_TabAwareShell> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.navigationShell.currentIndex;
  }

  @override
  Widget build(BuildContext context) {
    final newIndex = widget.navigationShell.currentIndex;
    if (newIndex != _currentIndex) {
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }
      _currentIndex = newIndex;
    }
    return AppShell(navigationShell: widget.navigationShell);
  }
}