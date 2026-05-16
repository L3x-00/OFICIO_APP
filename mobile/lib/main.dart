import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'core/constants/app_colors.dart';
import 'core/router/app_router.dart';
import 'core/services/fcm_service.dart';
import 'core/theme/app_theme_colors.dart';
import 'core/theme/theme_provider.dart';
import 'features/auth/presentation/providers/auth_provider.dart';
import 'features/auth/presentation/providers/registration_provider.dart';
import 'features/auth/presentation/screens/welcome_onboarding_modal.dart';
import 'features/provider_dashboard/presentation/widgets/welcome_provider_plan_modal.dart';
import 'features/chat/presentation/providers/chat_provider.dart';
import 'features/favorites/presentation/providers/favorites_provider.dart';
import 'features/notifications/domain/models/notification_model.dart';
import 'features/notifications/presentation/providers/notifications_provider.dart';
import 'features/offer_posts/presentation/providers/offers_provider.dart';
import 'features/provider_dashboard/presentation/providers/dashboard_provider.dart';
import 'features/provider_dashboard/presentation/providers/offer_posts_provider.dart';
import 'features/providers_list/presentation/providers/providers_provider.dart';

final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FcmService.setNavigatorKey(_navigatorKey);

  // ── Providers raíz inicializados antes de runApp ───────────
  // Necesitamos `AuthProvider.initialize()` resuelto antes de construir
  // el router, porque éste lee el `navigationState` para el `redirect`.
  final themeProvider = ThemeProvider();
  await themeProvider.initialize();

  final registration = RegistrationProvider();
  final auth = AuthProvider()..attachRegistration(registration);
  await auth.initialize();

  final router = createRouter(
    authProvider: auth,
    navigatorKey: _navigatorKey,
  );

  // DSN configurado en build con --dart-define=SENTRY_DSN=https://...
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
          ChangeNotifierProvider.value(value: registration),
          ChangeNotifierProvider.value(value: auth),
          ChangeNotifierProvider(create: (_) => FavoritesProvider()),
          ChangeNotifierProvider(create: (_) => DashboardProvider()),
          ChangeNotifierProvider(create: (_) => OfferPostsProvider()),
          ChangeNotifierProvider(create: (_) => PublicOffersProvider()),
          ChangeNotifierProvider(create: (_) => NotificationsProvider()),
          ChangeNotifierProvider(create: (_) => ProvidersProvider()),
          ChangeNotifierProvider(create: (_) => ChatProvider()),
        ],
        child: OficioApp(router: router),
      ),
    ),
  );
}

class OficioApp extends StatelessWidget {
  final GoRouter router;
  const OficioApp({super.key, required this.router});

  @override
  Widget build(BuildContext context) {
    final themeMode = context.watch<ThemeProvider>().mode;
    return _AuthSideEffects(
      router: router,
      child: MaterialApp.router(
        title: 'OficioApp',
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
        routerConfig: router,
      ),
    );
  }
}

/// Escucha los cambios de [AuthProvider] para disparar los efectos
/// laterales globales: sincronización de providers dependientes (favoritos,
/// chat, notificaciones), inicialización de FCM, modal de bienvenida tras
/// onboarding, diálogos de desactivación, rechazo de validación y
/// promoción de plan.
///
/// La UI sigue siendo manejada por GoRouter; este widget solo orquesta
/// los efectos secundarios que viven fuera del flujo de navegación.
class _AuthSideEffects extends StatefulWidget {
  final Widget child;
  final GoRouter router;

  const _AuthSideEffects({required this.child, required this.router});

  @override
  State<_AuthSideEffects> createState() => _AuthSideEffectsState();
}

class _AuthSideEffectsState extends State<_AuthSideEffects> {
  AppNavigationState? _prevNavState;
  bool _fcmInitialized = false;

  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    auth.addListener(_onAuthChanged);
    // Sync inicial — auth ya está inicializado cuando llegamos aquí.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _onAuthChanged();
    });
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
    final chat   = context.read<ChatProvider>();

    if (auth.user != null) {
      notifs.setUser(userId: auth.user!.id, role: auth.user!.role);
      favs.initialize(auth.user!.id);
      chat.initialize(auth.user!.id);

      if (!_fcmInitialized) {
        _fcmInitialized = true;
        FcmService.onMessageTap        = _handleFcmTap;
        FcmService.onForegroundMessage = _handleFcmInbound;
        FcmService.instance.initialize();
      }
    } else {
      notifs.clearUser();
      favs.clear();
      chat.clear();
      _fcmInitialized = false;
    }

    final current = auth.navigationState;

    // ── Modal de bienvenida tras completar onboarding ─────────
    // Usamos el navigatorKey de la app (root del MaterialApp.router) en vez
    // de `context` porque este widget vive *encima* de MaterialApp y su
    // context no tiene Navigator en scope — sin el navigatorKey el dialog
    // se silencia y el usuario nunca veía la bienvenida tras presionar
    // "Continuar" como cliente.
    if (_prevNavState == AppNavigationState.needsOnboarding &&
        current == AppNavigationState.authenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final navCtx = _navigatorKey.currentContext;
        if (navCtx == null || !navCtx.mounted) return;
        showDialog(
          context: navCtx,
          barrierDismissible: false,
          barrierColor: Colors.black.withValues(alpha: 0.65),
          builder: (dialogCtx) => WelcomeOnboardingModal(
            onDismiss: () =>
                Navigator.of(dialogCtx, rootNavigator: true).pop(),
          ),
        );
      });
    }
    _prevNavState = current;

    // ── Cuenta desactivada remotamente ────────────────────────
    if (auth.wasDeactivated && mounted) {
      auth.clearDeactivatedFlag();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _showDeactivationDialog();
      });
    }

    // ── Validación de confianza rechazada ─────────────────────
    if (auth.pendingTrustRejection != null && mounted) {
      final rejection = auth.pendingTrustRejection!;
      auth.clearTrustRejection();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _showTrustRejectionDialog(rejection);
      });
    }

    // ── Aprobación de perfil de proveedor (modal en home) ─────
    // Se dispara cuando el admin aprueba el perfil — el carrusel de
    // bienvenida + plan ESTANDAR de cortesía aparece en la pantalla
    // principal en tiempo real, sin esperar a que el usuario entre al
    // panel del proveedor. La gate "ya visto" la administra el propio
    // modal vía SharedPreferences por providerId.
    final approval = auth.pendingProviderApproval;
    if (approval != null && mounted) {
      auth.clearPendingProviderApproval();
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        final navCtx = _navigatorKey.currentContext;
        if (navCtx == null || !navCtx.mounted) return;
        await WelcomeProviderPlanModal.showIfFirstTime(
          navCtx,
          displayName: approval.displayName,
          providerId:  approval.providerId,
        );
      });
    }

    // ── Promoción de plan ─────────────────────────────────────
    // Disparado al recibir PLAN_APROBADO (Yape aprobado por el admin).
    // Se prefiere el carrusel WelcomeProviderPlanModal con variante
    // del plan exacto sobre el dialog plano anterior — comunica
    // mejor "tu plan está activo" + lista los beneficios del plan.
    if (auth.pendingPlanPromotion != null && mounted) {
      final payload = auth.pendingPlanPromotion!;
      auth.clearPlanPromotion();
      final dash = context.read<DashboardProvider>();
      // Limpia el flag local de "pago en revisión" — el plan acaba de
      // aprobarse, así que los CTAs deben rehabilitarse al instante.
      dash.clearPendingPaymentPlan();
      dash.loadDashboard(providerType: auth.activeProfileType);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _showPlanActivationCarousel(payload);
      });
    }
  }

  /// Mapea el plan del payload a la variante del carrousel y lo lanza
  /// usando el navigator del router (siempre disponible, no depende de
  /// la pantalla actual). El gate por (providerId, plan) en
  /// `WelcomeProviderPlanModal.showIfFirstTime` evita re-mostrar si el
  /// usuario ya lo vio.
  Future<void> _showPlanActivationCarousel(PlanActivationPayload payload) async {
    final navCtx = _navigatorKey.currentContext;
    if (navCtx == null || !navCtx.mounted) return;

    final auth = navCtx.read<AuthProvider>();
    final dash = navCtx.read<DashboardProvider>();

    // providerId: del dashboard si está cargado; si no, busca en
    // providerDataFor del auth. Sin id, no podemos persistir el flag
    // "ya visto" por plan — caemos al dialog clásico.
    int? providerId = dash.profile?.id;
    providerId ??= () {
      final data = auth.providerDataFor(auth.activeProfileType ?? 'OFICIO');
      final raw  = data?['id'];
      return raw is int ? raw : null;
    }();
    if (providerId == null) {
      _showPlanPromotionDialog(payload);
      return;
    }

    final variant = switch (payload.plan.toUpperCase()) {
      'PREMIUM'  => WelcomePlan.premium,
      'ESTANDAR' => WelcomePlan.estandar,
      _          => WelcomePlan.estandar,
    };
    final displayName = dash.profile?.businessName
        ?? auth.user?.firstName
        ?? '';
    await WelcomeProviderPlanModal.showIfFirstTime(
      navCtx,
      displayName: displayName,
      providerId:  providerId,
      plan:        variant,
    );
  }

  /// Inserta una notificación push recibida (foreground/tap) en el
  /// `NotificationsProvider` para que aparezca en el tab de Alertas.
  void _handleFcmInbound(RemoteMessage message) {
    if (!mounted) return;
    final notif = AppNotification.fromSocket({
      'type':              message.data['type']
                          ?? message.notification?.title?.toUpperCase()
                          ?? 'GENERIC',
      'title':             message.notification?.title ?? message.data['title'] ?? 'Notificación',
      'body':              message.notification?.body  ?? message.data['body']  ?? '',
      'targetProfileType': message.data['targetProfileType'],
    });
    context.read<NotificationsProvider>().addLocal(notif);
  }

  /// Deep-link FCM → ruta GoRouter correspondiente.
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
        widget.router.go('/profile');
      case 'NEW_OFFER':
        widget.router.push('/my-requests');
      case 'OFFER_ACCEPTED':
        // El tab de oportunidades vive dentro del panel del proveedor.
        widget.router.push('/provider-panel');
      case 'CHAT_MESSAGE':
        _openChatFromPush(message.data);
      default:
        break;
    }
  }

  Future<void> _openChatFromPush(Map<String, dynamic> data) async {
    final roomId = int.tryParse('${data['chatRoomId'] ?? ''}');
    if (roomId == null) {
      debugPrint('[FCM] CHAT_MESSAGE sin chatRoomId — push ignorado');
      return;
    }

    final auth = context.read<AuthProvider>();
    if (auth.user == null) return;

    final chat = context.read<ChatProvider>();
    await chat.initialize(auth.user!.id);
    if (!chat.rooms.any((r) => r.id == roomId)) {
      await chat.loadRooms();
    }

    if (!mounted) return;
    widget.router.push('/chat/$roomId');
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
          '📧 soporteofiapp@gmail.com',
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
  Widget build(BuildContext context) => widget.child;
}
