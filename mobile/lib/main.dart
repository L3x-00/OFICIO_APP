import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:provider/provider.dart';
import 'features/auth/presentation/providers/auth_provider.dart';
import 'features/auth/presentation/screens/splash_screen.dart';
import 'features/auth/presentation/screens/welcome_screen.dart';
import 'features/auth/presentation/screens/onboarding_screen.dart';
import 'features/auth/presentation/screens/otp_verification_screen.dart';
import 'features/auth/presentation/screens/profile_screen.dart';
import 'features/auth/presentation/screens/welcome_onboarding_modal.dart';
import 'features/favorites/presentation/providers/favorites_provider.dart';
import 'features/favorites/presentation/screens/favorites_screen.dart';
import 'features/providers_list/presentation/screens/providers_screen.dart';
import 'features/provider_dashboard/presentation/providers/dashboard_provider.dart';
import 'features/notifications/presentation/providers/notifications_provider.dart';
import 'features/notifications/presentation/screens/notifications_screen.dart';

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
        ChangeNotifierProvider(create: (_) => NotificationsProvider()),
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

/// Árbol de navegación basado en el estado de autenticación.
/// Stateful para poder detectar el flag [wasDeactivated] y mostrar
/// el diálogo de cuenta desactivada antes de redirigir al login.
class _AppRoot extends StatefulWidget {
  const _AppRoot();

  @override
  State<_AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<_AppRoot> {
  /// Último estado de navegación conocido — permite detectar transiciones.
  AppNavigationState? _prevNavState;

  @override
  void initState() {
    super.initState();
    context.read<AuthProvider>().addListener(_onAuthChanged);
  }

  @override
  void dispose() {
    context.read<AuthProvider>().removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onAuthChanged() {
    final auth   = context.read<AuthProvider>();
    final notifs = context.read<NotificationsProvider>();
    final favs   = context.read<FavoritesProvider>();

    // Sincronizar NotificationsProvider y FavoritesProvider con auth
    if (auth.user != null) {
      notifs.setUser(userId: auth.user!.id, role: auth.user!.role);
      favs.initialize(auth.user!.id);
    } else {
      notifs.clearUser();
      favs.clear();
    }

    final current = auth.navigationState;

    // ── Mostrar modal de bienvenida al completar onboarding por primera vez ──
    if (_prevNavState == AppNavigationState.needsOnboarding &&
        current == AppNavigationState.authenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        showDialog(
          context: context,
          barrierDismissible: false,
          barrierColor: Colors.black.withValues(alpha: 0.65),
          builder: (_) => WelcomeOnboardingModal(
            onDismiss: () =>
                Navigator.of(context, rootNavigator: true).pop(),
          ),
        );
      });
    }

    _prevNavState = current;

    // ── Cuenta desactivada remotamente ──────────────────────────────────────
    if (auth.wasDeactivated && mounted) {
      auth.clearDeactivatedFlag();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _showDeactivationDialog();
      });
    }

    // ── Validación de confianza rechazada ────────────────────────────────────
    if (auth.pendingTrustRejection != null && mounted) {
      final rejection = auth.pendingTrustRejection!;
      auth.clearTrustRejection();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _showTrustRejectionDialog(rejection);
      });
    }
  }

  void _showTrustRejectionDialog(TrustRejectionPayload rejection) {
    final c = context.colors;
    const accent = Color(0xFFEF4444);
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      builder: (ctx) => Dialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64, height: 64,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.shield_outlined, color: accent, size: 34),
              ),
              const SizedBox(height: 16),
              Text(
                'Solicitud de validación rechazada',
                style: TextStyle(color: c.textPrimary, fontSize: 17, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: accent.withValues(alpha: 0.25)),
                ),
                child: Text(
                  rejection.reason.isNotEmpty ? rejection.reason : 'No se especificó un motivo.',
                  style: const TextStyle(color: accent, fontSize: 13, height: 1.5),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: accent,
                        side: BorderSide(color: accent.withValues(alpha: 0.5)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Cerrar', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: accent,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Ver detalles', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDeactivationDialog() {
    final c = context.colors;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        icon: Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: AppColors.busy.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.block_rounded, color: AppColors.busy, size: 34),
        ),
        title: Text(
          'Cuenta desactivada',
          style: TextStyle(
            color: c.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
          textAlign: TextAlign.center,
        ),
        content: Text(
          'Tu cuenta ha sido desactivada por el administrador.\n\n'
          'Por favor comunícate con soporte para recibir más información.\n\n'
          '📧 soporte@confiserv.com',
          style: TextStyle(color: c.textSecondary, fontSize: 14, height: 1.6),
          textAlign: TextAlign.center,
        ),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Entendido', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return switch (auth.navigationState) {
      AppNavigationState.loading                => const SplashScreen(),
      AppNavigationState.unauthenticated        => const WelcomeScreen(),
      AppNavigationState.guest                  => const _MainNavigation(userId: null),
      AppNavigationState.needsEmailVerification => const OtpVerificationScreen(),
      AppNavigationState.needsOnboarding        => const OnboardingScreen(),
      AppNavigationState.authenticated          => _MainNavigation(userId: auth.user!.id),
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
          const NotificationsScreen(),
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
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.search_rounded), label: 'Explorar'),
          const BottomNavigationBarItem(icon: Icon(Icons.favorite_border_rounded), activeIcon: Icon(Icons.favorite_rounded), label: 'Favoritos'),
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
