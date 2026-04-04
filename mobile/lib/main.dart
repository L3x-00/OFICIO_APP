import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:provider/provider.dart';
import 'features/auth/presentation/providers/auth_provider.dart';
import 'features/auth/presentation/screens/splash_screen.dart';
import 'features/auth/presentation/screens/welcome_screen.dart';
import 'features/auth/presentation/screens/onboarding_screen.dart';
import 'features/auth/presentation/screens/profile_screen.dart';
import 'features/favorites/presentation/providers/favorites_provider.dart';
import 'features/favorites/presentation/screens/favorites_screen.dart';
import 'features/providers_list/presentation/screens/providers_screen.dart';
import 'features/provider_dashboard/presentation/providers/dashboard_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final themeProvider = ThemeProvider();
  await themeProvider.initialize();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: themeProvider),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => FavoritesProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
      ],
      child: const ConfiServApp(),
    ),
  );
}

class ConfiServApp extends StatelessWidget {
  const ConfiServApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeMode = context.watch<ThemeProvider>().mode;
    return MaterialApp(
      title: 'ConfiServ',
      debugShowCheckedModeBanner: false,
      theme:      AppThemeColors.buildLight(),
      darkTheme:  AppThemeColors.buildDark(),
      themeMode:  themeMode,
      themeAnimationDuration: const Duration(milliseconds: 250),
      themeAnimationCurve: Curves.easeInOut,
      home: const _AppRoot(),
    );
  }
}

/// Árbol de navegación basado en el estado de autenticación
class _AppRoot extends StatelessWidget {
  const _AppRoot();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return switch (auth.navigationState) {
      AppNavigationState.loading         => const SplashScreen(),
      AppNavigationState.unauthenticated => const WelcomeScreen(),
      AppNavigationState.guest           => const _MainNavigation(userId: null),
      AppNavigationState.needsOnboarding => const OnboardingScreen(),
      AppNavigationState.authenticated   => _MainNavigation(userId: auth.user!.id),
    };
  }
}

/// Navegación principal con 3 pestañas
class _MainNavigation extends StatefulWidget {
  final int? userId;
  const _MainNavigation({this.userId});

  @override
  State<_MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<_MainNavigation> {
  int _currentIndex = 0;

  bool get _isGuest => widget.userId == null;

  @override
  void initState() {
    super.initState();
    if (!_isGuest) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.read<FavoritesProvider>().initialize(widget.userId!);
      });
    }
  }

  void _handleTabTap(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: [
          const ProvidersScreen(),
          FavoritesScreen(userId: _isGuest ? null : widget.userId!),
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: _BottomNav(
        currentIndex: _currentIndex,
        onTap: _handleTabTap,
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
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.search_rounded),          label: 'Explorar'),
          BottomNavigationBarItem(icon: Icon(Icons.favorite_border_rounded),  activeIcon: Icon(Icons.favorite_rounded), label: 'Favoritos'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded),   activeIcon: Icon(Icons.person_rounded),   label: 'Perfil'),
        ],
      ),
    );
  }
}
