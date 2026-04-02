import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:provider/provider.dart';
import 'features/auth/presentation/providers/auth_provider.dart';
import 'features/auth/presentation/screens/splash_screen.dart';
import 'features/auth/presentation/screens/welcome_screen.dart';
import 'features/auth/presentation/screens/onboarding_screen.dart';
import 'features/auth/presentation/screens/profile_screen.dart';
import 'features/favorites/presentation/providers/favorites_provider.dart';
import 'features/favorites/presentation/screens/favorites_screen.dart';
import 'features/providers_list/presentation/screens/providers_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => FavoritesProvider()),
      ],
      child: const OficioApp(),
    ),
  );
}

class OficioApp extends StatelessWidget {
  const OficioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OficioApp',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.bgDark,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.primary,
          surface: AppColors.bgCard,
        ),
        useMaterial3: true,
      ),
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
      // 1. Splash: verifica sesión guardada
      AppNavigationState.loading => const SplashScreen(),

      // 2. Sin sesión: muestra bienvenida con carrusel
      AppNavigationState.unauthenticated => const WelcomeScreen(),

      // 3. Registrado pero sin elegir rol
      AppNavigationState.needsOnboarding => const OnboardingScreen(),

      // 4. Autenticado: app principal con tabs
      AppNavigationState.authenticated => _MainNavigation(
        userId: auth.user!.id,
      ),
    };
  }
}

/// Navegación principal con 3 pestañas
class _MainNavigation extends StatefulWidget {
  final int userId;
  const _MainNavigation({required this.userId});

  @override
  State<_MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<_MainNavigation> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    // Cargar favoritos una sola vez al autenticarse
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FavoritesProvider>().initialize(widget.userId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        // IndexedStack mantiene las pantallas vivas (evita re-renders)
        index: _currentIndex,
        children: [
          const ProvidersScreen(),
          FavoritesScreen(userId: widget.userId),
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: _BottomNav(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
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
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.06))),
      ),
      child: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: onTap,
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.search_rounded),
            activeIcon: Icon(Icons.search_rounded),
            label: 'Explorar',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.favorite_border_rounded),
            activeIcon: Icon(Icons.favorite_rounded),
            label: 'Favoritos',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline_rounded),
            activeIcon: Icon(Icons.person_rounded),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}
