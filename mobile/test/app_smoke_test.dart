/// Smoke test del root de la app.
///
/// No usamos `Servi` directamente porque arrastra Firebase/Sentry/FCM
/// (`main.dart`). En su lugar montamos un `MaterialApp.router` con la
/// MISMA configuración que `main.dart` usa para locale + delegates +
/// router, y validamos:
///
///   • El árbol se construye sin lanzar excepciones (smoke real).
///   • La locale activa es `es-419` (la del marketplace LATAM).
///   • El router declara las rutas top-level críticas: `/`, `/welcome`,
///     `/login`, `/otp`, `/chats`, `/favorites`, `/alerts`,
///     `/profile`, `/chat/:roomId`, `/provider-panel` — y las rutas de
///     features ocultas (`/offers`, `/my-requests`) según su flag.
///
/// Bootstrap del AuthProvider: con `installTestBackend()` el secure
/// storage es un Map vacío → `restoreSession()` retorna null → estado
/// final = unauthenticated, así que el router resuelve a `/welcome`.
library;

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/constants/feature_flags.dart';
import 'package:mobile/core/router/app_router.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/providers/registration_provider.dart';
import 'package:mobile/features/chat/presentation/providers/chat_provider.dart';
import 'package:mobile/features/favorites/presentation/providers/favorites_provider.dart';
import 'package:mobile/features/notifications/presentation/providers/notifications_provider.dart';
import 'package:mobile/features/offer_posts/presentation/providers/offers_provider.dart';
import 'package:mobile/features/provider_dashboard/presentation/providers/dashboard_provider.dart';
import 'package:mobile/features/provider_dashboard/presentation/providers/offer_posts_provider.dart';
import 'package:mobile/features/providers_list/presentation/providers/providers_provider.dart';
import 'package:provider/provider.dart';

import 'helpers/test_setup.dart';

/// Walk recursivo de `router.configuration.routes` recolectando todos los
/// `GoRoute.path` declarados (incluye hijos de `StatefulShellRoute` y
/// `ShellRoute`). Devuelve un Set de paths normalizados.
Set<String> _collectPaths(GoRouter router) {
  final paths = <String>{};
  void visit(List<RouteBase> routes) {
    for (final r in routes) {
      if (r is GoRoute) {
        paths.add(r.path);
        visit(r.routes);
      } else if (r is ShellRoute) {
        visit(r.routes);
      } else if (r is StatefulShellRoute) {
        for (final branch in r.branches) {
          visit(branch.routes);
        }
      }
    }
  }

  visit(router.configuration.routes);
  return paths;
}

Widget _buildApp({required GoRouter router}) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<ThemeProvider>(create: (_) => ThemeProvider()),
      ChangeNotifierProvider<RegistrationProvider>(
        create: (_) => RegistrationProvider(),
      ),
      ChangeNotifierProvider<FavoritesProvider>(
        create: (_) => FavoritesProvider(),
      ),
      ChangeNotifierProvider<DashboardProvider>(
        create: (_) => DashboardProvider(),
      ),
      ChangeNotifierProvider<OfferPostsProvider>(
        create: (_) => OfferPostsProvider(),
      ),
      ChangeNotifierProvider<PublicOffersProvider>(
        create: (_) => PublicOffersProvider(),
      ),
      ChangeNotifierProvider<NotificationsProvider>(
        create: (_) => NotificationsProvider(),
      ),
      ChangeNotifierProvider<ProvidersProvider>(
        create: (_) => ProvidersProvider(),
      ),
      ChangeNotifierProvider<ChatProvider>(create: (_) => ChatProvider()),
    ],
    child: MaterialApp.router(
      title: 'Servi',
      debugShowCheckedModeBanner: false,
      locale: const Locale('es', '419'),
      supportedLocales: const [Locale('es', '419'), Locale('es'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: AppThemeColors.buildLight(),
      darkTheme: AppThemeColors.buildDark(),
      routerConfig: router,
    ),
  );
}

void main() {
  setUp(() {
    installTestBackend();
  });

  testWidgets('MaterialApp se construye sin excepciones (smoke)', (
    tester,
  ) async {
    final auth = AuthProvider()..attachRegistration(RegistrationProvider());
    await auth.initialize();

    final router = createRouter(
      authProvider: auth,
      navigatorKey: GlobalKey<NavigatorState>(),
    );

    await tester.pumpWidget(_buildApp(router: router));
    await tester.pump();

    // Smoke: el MaterialApp.router está en el árbol y no hubo throw.
    expect(find.byType(MaterialApp), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Locale activo es es-419', (tester) async {
    final auth = AuthProvider()..attachRegistration(RegistrationProvider());
    await auth.initialize();

    final router = createRouter(
      authProvider: auth,
      navigatorKey: GlobalKey<NavigatorState>(),
    );

    await tester.pumpWidget(_buildApp(router: router));
    await tester.pump();

    // Validamos la propiedad `locale` que se pasó al MaterialApp.
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.locale, const Locale('es', '419'));

    // supportedLocales incluye es-419 como primera opción (preferida).
    expect(app.supportedLocales.first, const Locale('es', '419'));
  });

  test('Router declara todas las rutas top-level críticas', () async {
    final auth = AuthProvider()..attachRegistration(RegistrationProvider());
    // initialize() no necesita pump — solo lee storage mockeado.
    installTestBackend();
    await auth.initialize();

    final router = createRouter(
      authProvider: auth,
      navigatorKey: GlobalKey<NavigatorState>(),
    );

    final paths = _collectPaths(router);

    // Auth flow
    expect(paths, contains('/welcome'));
    expect(paths, contains('/login'));
    expect(paths, contains('/otp'));
    expect(paths, contains('/onboarding'));
    expect(paths, contains('/forgot-password'));
    expect(paths, contains('/reset-password'));
    expect(paths, contains('/register-provider'));

    // Tabs del shell
    expect(paths, contains('/'));
    expect(paths, contains('/favorites'));
    expect(paths, contains('/alerts'));
    expect(paths, contains('/profile'));

    // Features ocultas (feature_flags.dart): sus rutas existen SOLO con
    // el flag encendido — el matcher se invierte según el flag para que
    // el test proteja ambos estados (hoy: ausentes; al reactivar: presentes).
    expect(
      paths,
      kOfertasEnabled ? contains('/offers') : isNot(contains('/offers')),
    );
    expect(
      paths,
      kSubastasEnabled
          ? contains('/my-requests')
          : isNot(contains('/my-requests')),
    );

    // Rutas privadas top-level
    expect(paths, contains('/chat/:roomId'));
    expect(paths, contains('/chats'));
    expect(paths, contains('/referrals'));
    expect(paths, contains('/edit-profile'));
    expect(paths, contains('/change-password'));
    expect(paths, contains('/trust-validation'));
    expect(paths, contains('/provider-panel'));
    expect(paths, contains('/provider/:id'));
    expect(paths, contains('/splash'));
  });
}
