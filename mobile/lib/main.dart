import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'core/services/fcm_service.dart';
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
import 'features/providers_list/presentation/providers/providers_provider.dart';

/// Handler de mensajes en background — debe ser función de nivel superior.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('[FCM] Mensaje en background: ${message.notification?.title}');
}

final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  FcmService.setNavigatorKey(_navigatorKey);
  final themeProvider = ThemeProvider();
  await themeProvider.initialize();

  // DSN configurado en build con --dart-define=SENTRY_DSN=https://...
  // Si no se provee, Sentry queda deshabilitado (no lanza errores).
  const sentryDsn = String.fromEnvironment('SENTRY_DSN', defaultValue: '');

  await SentryFlutter.init(
    (options) {
      options.dsn = sentryDsn;
      options.environment = const String.fromEnvironment(
        'ENVIRONMENT',
        defaultValue: 'development',
      );
      options.tracesSampleRate = 0.2;
      options.debug = false;
    },
    appRunner: () => runApp(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: themeProvider),
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => FavoritesProvider()),
          ChangeNotifierProvider(create: (_) => DashboardProvider()),
          ChangeNotifierProvider(create: (_) => NotificationsProvider()),
          ChangeNotifierProvider(create: (_) => ProvidersProvider()),
        ],
        child: const ConfiServApp(),
      ),
    ),
  );
}

class ConfiServApp extends StatelessWidget {
  const ConfiServApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeMode = context.watch<ThemeProvider>().mode;
    return MaterialApp(
      navigatorKey: _navigatorKey,
      title: 'ConfiServ',
      debugShowCheckedModeBanner: false,
      locale: const Locale('es', '419'),
      supportedLocales: const [Locale('es', '419'), Locale('es'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
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

  bool _fcmInitialized = false;

  void _onAuthChanged() {
    final auth   = context.read<AuthProvider>();
    final notifs = context.read<NotificationsProvider>();
    final favs   = context.read<FavoritesProvider>();

    // Sincronizar NotificationsProvider y FavoritesProvider con auth
    if (auth.user != null) {
      notifs.setUser(userId: auth.user!.id, role: auth.user!.role);
      favs.initialize(auth.user!.id);

      // Inicializar FCM una sola vez por sesión
      if (!_fcmInitialized) {
        _fcmInitialized = true;
        FcmService.onMessageTap = _handleFcmTap;
        FcmService.instance.initialize(context);
      }
    } else {
      notifs.clearUser();
      favs.clear();
      _fcmInitialized = false;
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

    // ── Promoción de plan ─────────────────────────────────────────────────────
    if (auth.pendingPlanPromotion != null && mounted) {
      final payload = auth.pendingPlanPromotion!;
      auth.clearPlanPromotion();
      // Recargar dashboard para que los límites/efectos del plan se apliquen de inmediato
      context.read<DashboardProvider>().loadDashboard(
        providerType: auth.activeProfileType,
      );
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _showPlanPromotionDialog(payload);
      });
    }
  }

  /// Navega a la pantalla adecuada según los datos de la notificación push.
  void _handleFcmTap(RemoteMessage message) {
    if (!mounted) return;
    final type = message.data['type'] as String?;
    debugPrint('[FCM] Navegando por tipo: $type, data: ${message.data}');
    switch (type) {
      case 'NEW_REVIEW':
      case 'PROVIDER_APPROVED':
      case 'PROVIDER_REJECTED':
      case 'PLAN_APROBADO':
      case 'PLAN_RECHAZADO':
        // Abrir perfil del proveedor / panel
        Navigator.of(context, rootNavigator: true).push(
          MaterialPageRoute(builder: (_) => const ProfileScreen()),
        );
      case 'NEW_OFFER':
      case 'OFFER_ACCEPTED':
        // Navegar a solicitudes de subasta
        context.read<AuthProvider>(); // asegurar acceso
        Navigator.of(context, rootNavigator: true).push(
          MaterialPageRoute(builder: (_) => const ProfileScreen()),
        );
      default:
        break;
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
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        _showTrustRejectionDetail(rejection);
                      },
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

  void _showPlanPromotionDialog(PlanActivationPayload payload) {
    final c = context.colors;
    const green = Color(0xFF10B981);

    final benefits = switch (payload.plan) {
      'PREMIUM'  => [
        'Máxima visibilidad ante clientes',
        'Servicios y productos ilimitados',
        'Estadísticas avanzadas de perfil',
        'Badge "Premium" destacado',
        'Acceso prioritario a oportunidades',
      ],
      'ESTANDAR' => [
        'Mayor visibilidad ante clientes',
        'Hasta 10 servicios o productos',
        'Estadísticas básicas de perfil',
        'Acceso a oportunidades de trabajo',
      ],
      _ => [
        'Mayor visibilidad ante clientes',
        'Acceso a más funcionalidades',
      ],
    };

    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (ctx) => Dialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 68, height: 68,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF065F46), Color(0xFF047857)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: green.withValues(alpha: 0.35), blurRadius: 16, offset: const Offset(0, 5))],
                ),
                child: const Icon(Icons.workspace_premium_rounded, color: Colors.white, size: 34),
              ),
              const SizedBox(height: 16),
              Text(
                payload.title,
                style: TextStyle(color: c.textPrimary, fontSize: 17, fontWeight: FontWeight.w900),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                'Ahora tienes acceso a estos beneficios:',
                style: TextStyle(color: c.textSecondary, fontSize: 13),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: green.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: green.withValues(alpha: 0.25)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: benefits.map((b) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_rounded, color: green, size: 15),
                        const SizedBox(width: 8),
                        Expanded(child: Text(b, style: const TextStyle(color: green, fontSize: 12, height: 1.4))),
                      ],
                    ),
                  )).toList(),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: c.textMuted,
                        side: BorderSide(color: c.border),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Aceptar'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        _showPlanBenefitsDetail(payload.plan, benefits);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: green,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Ver detalles'),
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

  void _showPlanBenefitsDetail(String plan, List<String> benefits) {
    final c = context.colors;
    const green = Color(0xFF10B981);
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.workspace_premium_rounded, color: green, size: 22),
                  const SizedBox(width: 10),
                  Text(
                    'Plan ${plan[0]}${plan.substring(1).toLowerCase()} — Beneficios',
                    style: TextStyle(color: c.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ...benefits.asMap().entries.map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 24, height: 24,
                      decoration: BoxDecoration(
                        color: green.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '${e.key + 1}',
                          style: const TextStyle(color: green, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(e.value, style: TextStyle(color: c.textPrimary, fontSize: 13, height: 1.4)),
                    ),
                  ],
                ),
              )),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Entendido', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showTrustRejectionDetail(TrustRejectionPayload rejection) {
    final c = context.colors;
    const accent = Color(0xFFEF4444);

    String formattedDate = '';
    if (rejection.rejectedAt != null) {
      try {
        final dt = DateTime.parse(rejection.rejectedAt!).toLocal();
        formattedDate =
            '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}'
            '  ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      } catch (_) {}
    }

    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      builder: (ctx) => Dialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.info_outline_rounded, color: accent, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text('Detalles del rechazo',
                      style: TextStyle(color: c.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text('Motivo', style: TextStyle(color: c.textSecondary, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
              const SizedBox(height: 6),
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
                ),
              ),
              if (formattedDate.isNotEmpty) ...[
                const SizedBox(height: 14),
                Text('Fecha y hora', style: TextStyle(color: c.textSecondary, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.schedule_rounded, size: 14, color: c.textSecondary),
                    const SizedBox(width: 6),
                    Text(formattedDate, style: TextStyle(color: c.textSecondary, fontSize: 13)),
                  ],
                ),
              ],
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accent,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                  ),
                  child: const Text('Entendido', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
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
  DateTime? _lastBackPress;

  bool get _isGuest => widget.userId == null;

  @override
  void initState() {
    super.initState();
    if (!_isGuest) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        context.read<FavoritesProvider>().initialize(widget.userId!);
        context.read<AuthProvider>().refreshUser();
      });
    }
  }

  @override
  void didUpdateWidget(_MainNavigation oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Transición guest → autenticado: state reutilizado, initState no vuelve a correr.
    // refreshUser fuerza notifyListeners para que ProfileScreen (offstage en IndexedStack)
    // reconstruya con auth.user ya no-nulo.
    if (oldWidget.userId == null && widget.userId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        context.read<FavoritesProvider>().initialize(widget.userId!);
        context.read<AuthProvider>().refreshUser();
      });
    }
  }

  void _handleTabTap(int index) {
    setState(() => _currentIndex = index);
    if (index == 3 && !_isGuest) {
      context.read<AuthProvider>().refreshUser();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Seleccionar solo userId: rebuild solo en login/logout, no en cada notificación.
    // ValueKey fuerza destrucción+recreación de ProfileScreen cuando userId cambia
    // (null→id al logear, id→null al salir), garantizando que build() corra con
    // auth.user ya cargado — soluciona el blank screen en IndexedStack offstage.
    final authUserId = context.select<AuthProvider, int?>(
      (auth) => auth.user?.id,
    );

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
        body: IndexedStack(
          index: _currentIndex,
          children: [
            const ProvidersScreen(),
            FavoritesScreen(userId: _isGuest ? null : widget.userId!),
            const NotificationsScreen(),
            ProfileScreen(key: ValueKey(authUserId)),
          ],
        ),
        bottomNavigationBar: _BottomNav(
          currentIndex: _currentIndex,
          onTap: _handleTabTap,
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
