import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/auth/presentation/screens/change_password_screen.dart';
import '../../features/auth/presentation/screens/edit_profile_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/onboarding/onboarding_screen.dart';
import '../../features/auth/presentation/screens/onboarding/provider_onboarding_form.dart';
import '../../features/auth/presentation/screens/otp_verification_screen.dart';
import '../../features/auth/presentation/screens/profile_screen.dart';
import '../../features/auth/presentation/screens/reset_password_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/welcome_screen.dart';
import '../../features/chat/presentation/screens/chat_list_screen.dart';
import '../../features/chat/presentation/screens/chat_screen.dart';
import '../../features/favorites/presentation/screens/favorites_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/offer_posts/presentation/screens/offers_screen.dart';
import '../../features/provider_dashboard/presentation/screens/provider_panel.dart';
import '../../features/providers_list/domain/models/provider_model.dart';
import '../../features/providers_list/presentation/screens/provider_detail_screen.dart';
import '../../features/providers_list/presentation/screens/providers_screen.dart';
import '../../features/referrals/presentation/screens/referral_screen.dart';
import '../../features/subastas/presentation/providers/subastas_provider.dart';
import '../../features/subastas/presentation/screens/my_requests_screen.dart';
import '../../features/trust_validation/presentation/screens/trust_validation_form_screen.dart';
import 'app_shell.dart';
import 'router_notifier.dart';

// ── Rutas públicas (no requieren autenticación) ─────────────
const _publicPaths = <String>{
  '/welcome',
  '/login',
  '/forgot-password',
  '/reset-password',
};

bool _isAuthRoute(String loc) =>
    loc == '/welcome' || loc == '/login' || loc == '/forgot-password' || loc == '/reset-password';

bool _isPublic(String loc) => _publicPaths.any((p) => loc == p || loc.startsWith('$p?'));

/// Construye el [GoRouter] de la app.
///
/// `authProvider` ya debe estar inicializado (`AuthProvider.initialize()`
/// resuelto) antes de llamar a esta función — el router lee su estado para
/// la redirección global.
GoRouter createRouter({
  required AuthProvider authProvider,
  required GlobalKey<NavigatorState> navigatorKey,
}) {
  final routerNotifier = RouterNotifier(authProvider);

  return GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: '/',
    debugLogDiagnostics: false,
    refreshListenable: routerNotifier,
    redirect: (context, state) {
      final auth = authProvider;
      final navState = auth.navigationState;
      final loc = state.matchedLocation;

      // Aún cargando — el router se quedará en /splash mientras tanto
      if (navState == AppNavigationState.loading) {
        return loc == '/splash' ? null : '/splash';
      }

      // Email no verificado → forzar /otp
      if (navState == AppNavigationState.needsEmailVerification) {
        return loc == '/otp' ? null : '/otp';
      }

      // Necesita onboarding → forzar /onboarding (pero permitir register-provider)
      if (navState == AppNavigationState.needsOnboarding) {
        if (loc == '/onboarding' || loc == '/register-provider') return null;
        return '/onboarding';
      }

      // Sin sesión → permitir rutas públicas, bloquear el resto
      if (navState == AppNavigationState.unauthenticated) {
        if (_isPublic(loc)) return null;
        return '/welcome';
      }

      // Autenticado o invitado → si está en una pantalla de auth, mandarlo al home
      if (_isAuthRoute(loc) || loc == '/splash' || loc == '/otp' || loc == '/onboarding') {
        return '/';
      }

      return null;
    },
    routes: [
      // ── Pantalla de splash (estado loading) ─────────────────
      GoRoute(
        path: '/splash',
        builder: (_, _) => const SplashScreen(),
      ),

      // ── Rutas públicas (auth) ───────────────────────────────
      GoRoute(path: '/welcome', builder: (_, _) => const WelcomeScreen()),
      GoRoute(path: '/login',   builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/otp',     builder: (_, _) => const OtpVerificationScreen()),
      GoRoute(path: '/onboarding', builder: (_, _) => const OnboardingScreen()),
      GoRoute(
        path: '/register-provider',
        builder: (_, state) {
          final type = state.uri.queryParameters['type'];
          return ProviderOnboardingForm(providerType: type, isStandalone: true);
        },
      ),
      GoRoute(path: '/forgot-password', builder: (_, _) => const ForgotPasswordScreen()),
      GoRoute(
        path: '/reset-password',
        builder: (_, state) {
          final email = state.uri.queryParameters['email'] ?? '';
          return ResetPasswordScreen(email: email);
        },
      ),

      // ── Rutas privadas top-level ────────────────────────────
      GoRoute(
        path: '/chat/:roomId',
        builder: (_, state) {
          final roomId = int.parse(state.pathParameters['roomId']!);
          return ChatScreen(roomId: roomId);
        },
      ),
      // scope:'client' aísla la bandeja del cliente — un user con
      // doble perfil (OFICIO+NEGOCIO) no ve aquí mensajes recibidos
      // como proveedor; esos viven en el panel respectivo.
      GoRoute(path: '/chats',         builder: (_, _) => const ChatListScreen(scope: 'client')),
      GoRoute(path: '/referrals',     builder: (_, _) => const ReferralScreen()),
      GoRoute(
        path: '/my-requests',
        builder: (_, _) => ChangeNotifierProvider(
          create: (_) => SubastasProvider(),
          child: const MyRequestsScreen(),
        ),
      ),
      GoRoute(path: '/edit-profile',    builder: (_, _) => const EditProfileScreen()),
      GoRoute(path: '/change-password', builder: (_, _) => const ChangePasswordScreen()),
      GoRoute(
        path: '/trust-validation',
        builder: (_, state) {
          final type = state.uri.queryParameters['type'] ?? 'OFICIO';
          return TrustValidationFormScreen(providerType: type);
        },
      ),
      GoRoute(
        path: '/provider-panel',
        builder: (_, state) {
          final type = state.uri.queryParameters['type'] ?? 'OFICIO';
          return ProviderPanel(providerType: type);
        },
      ),

      // ── /provider/:id — vista pública del detalle ──────────
      //
      // Originalmente se mostraba como bottom sheet con
      // `ProviderDetailSheet.show(context, provider)`. La ruta nueva permite
      // deep-linking pasando el modelo vía `extra`. Si no se provee, redirige
      // al home (deep link sin contexto válido).
      GoRoute(
        path: '/provider/:id',
        builder: (_, state) {
          final provider = state.extra as ProviderModel?;
          if (provider == null) {
            return const Scaffold(
              body: Center(child: Text('Proveedor no disponible — abre desde la app.')),
            );
          }
          return Scaffold(body: ProviderDetailSheet(provider: provider));
        },
      ),

      // ── Shell con bottom navigation (5 tabs) ────────────────
      StatefulShellRoute.indexedStack(
        builder: (_, _, navigationShell) => AppShell(navigationShell: navigationShell),
        branches: [
          // Tab 0 — Explorar
          StatefulShellBranch(routes: [
            GoRoute(path: '/', builder: (_, _) => const ProvidersScreen()),
          ]),
          // Tab 1 — Favoritos
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/favorites',
              builder: (_, _) {
                final userId = authProvider.user?.id;
                return FavoritesScreen(userId: userId);
              },
            ),
          ]),
          // Tab 2 — Ofertas
          StatefulShellBranch(routes: [
            GoRoute(path: '/offers', builder: (_, _) => const OffersScreen()),
          ]),
          // Tab 3 — Alertas
          StatefulShellBranch(routes: [
            GoRoute(path: '/alerts', builder: (_, _) => const NotificationsScreen()),
          ]),
          // Tab 4 — Perfil
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen()),
          ]),
        ],
      ),
    ],
  );
}

// ── Helpers de path por tab — útil para navegación desde código ──
class AppRoutes {
  const AppRoutes._();
  static const String home       = '/';
  static const String favorites  = '/favorites';
  static const String offers     = '/offers';
  static const String alerts     = '/alerts';
  static const String profile    = '/profile';
  static const String welcome    = '/welcome';
  static const String login      = '/login';
  static const String otp        = '/otp';
  static const String onboarding = '/onboarding';
  static const String chats      = '/chats';
  static const String referrals  = '/referrals';
  static const String myRequests = '/my-requests';

  // Tabs index — útil para mantener compatibilidad con código viejo
  // que decide qué tab activar por índice.
  static const int tabExplorar  = 0;
  static const int tabFavoritos = 1;
  static const int tabOfertas   = 2;
  static const int tabAlertas   = 3;
  static const int tabPerfil    = 4;
}
