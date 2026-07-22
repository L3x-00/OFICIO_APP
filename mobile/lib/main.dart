import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:in_app_update/in_app_update.dart';
import 'package:provider/provider.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/constants/feature_flags.dart';
import 'core/router/app_router.dart';
import 'core/services/fcm_service.dart';
import 'core/widgets/auth_side_effect_dialogs.dart';
import 'core/services/notification_handler.dart';
import 'core/theme/app_theme_colors.dart';
import 'core/theme/theme_provider.dart';
import 'features/auth/presentation/providers/auth_provider.dart';
import 'features/auth/presentation/providers/registration_provider.dart';
import 'features/auth/presentation/screens/welcome_onboarding_modal.dart';
import 'features/auth/presentation/screens/setup_password_screen.dart';
import 'features/provider_dashboard/presentation/widgets/welcome_provider_plan_modal.dart';
import 'features/chat/presentation/providers/chat_provider.dart';
import 'features/favorites/presentation/providers/favorites_provider.dart';
import 'features/notifications/domain/models/notification_model.dart';
import 'features/notifications/presentation/providers/notifications_provider.dart';
import 'features/offer_posts/presentation/providers/offers_provider.dart';
import 'features/provider_dashboard/presentation/providers/dashboard_provider.dart';
import 'features/provider_dashboard/presentation/providers/offer_posts_provider.dart';
import 'features/providers_list/presentation/providers/providers_provider.dart';
import 'features/showcase/showcase_manager.dart';
import 'dart:math';

final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

/// B-3: handler que corre en un isolate separado cuando llega un push
/// con la app en BACKGROUND o TERMINATED. Debe ser top-level y
/// anotado con `@pragma('vm:entry-point')` para que el compilador AOT
/// lo conserve. Sin esto, Android puede no procesar correctamente la
/// notif con `data:` payload.
///
/// Mantenemos la lógica al mínimo (solo log) porque la notif del
/// sistema ya se muestra automáticamente cuando el payload incluye
/// `notification:` desde el backend (push-notifications.service.ts).
/// El procesamiento real ocurre cuando el user toca la notif y la app
/// arranca → `onMessageOpenedApp` / `getInitialMessage` en FcmService.
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  // Re-inicializar Firebase en este isolate (cada isolate es independiente).
  await Firebase.initializeApp();
  // Debug log opcional — el resto del manejo es automático.
  // ignore: avoid_print
  print('[FCM bg] ${message.notification?.title} / ${message.data}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  // B-3: registrar el handler ANTES de runApp
  FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);
  FcmService.setNavigatorKey(_navigatorKey);

  // ✅ NUEVO: Forzar Edge-to-Edge y eliminar estilos de barras obsoletos
  // Esto le dice a Flutter que dibuje debajo de las barras del sistema,
  // apagando los colores manuales (la causa de la advertencia de Play Console).
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  // Desactivar cualquier color manual de barras que Flutter intente poner.
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      systemNavigationBarColor: Colors.transparent,
      statusBarColor: Colors.transparent,
    ),
  );

  // ── Providers raíz inicializados antes de runApp ───────────
  final themeProvider = ThemeProvider();
  await themeProvider.initialize();

  final registration = RegistrationProvider();
  final auth = AuthProvider()..attachRegistration(registration);
  await auth.initialize();

  final router = createRouter(authProvider: auth, navigatorKey: _navigatorKey);

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
        child: Servi(router: router),
      ),
    ),
  );
}

class Servi extends StatelessWidget {
  final GoRouter router;
  const Servi({super.key, required this.router});

  @override
  Widget build(BuildContext context) {
    final themeMode = context.watch<ThemeProvider>().mode;
    return _AuthSideEffects(
      router: router,
      child: MaterialApp.router(
        title: 'Servi',
        debugShowCheckedModeBanner: false,
        locale: const Locale('es', '419'),
        supportedLocales: const [
          Locale('es', '419'),
          Locale('es'),
          Locale('en'),
        ],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        theme: AppThemeColors.buildLight(),
        darkTheme: AppThemeColors.buildDark(),
        themeMode: themeMode,
        themeAnimationDuration: const Duration(milliseconds: 250),
        themeAnimationCurve: Curves.easeInOut,
        routerConfig: router,
        // Clamp del textScaleFactor del sistema. Si el user pone fuente
        // "Extra grande" en accesibilidad, un `fontSize: 11` (chip de
        // categoría, contador, helper text) escalaba a ~18 y rompía
        // paddings y rows. Limitamos entre 0.9 y 1.15 — permite leer
        // más grande sin reventar layouts. `withClampedTextScaling`
        // aplica a toda la app de una sola pasada, sin tocar widgets
        // uno a uno y mantiene accesibilidad parcial.
        builder: (context, child) {
          return MediaQuery.withClampedTextScaling(
            minScaleFactor: 0.9,
            maxScaleFactor: 1.15,
            child: child ?? const SizedBox.shrink(),
          );
        },
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

class _AuthSideEffectsState extends State<_AuthSideEffects>
    with WidgetsBindingObserver {
  AppNavigationState? _prevNavState;
  bool _fcmInitialized = false;

  /// Guard contra empujones múltiples del SetupPasswordScreen. El flag
  /// `socialAccountNeedsPassword` permanece `true` hasta que la pantalla
  /// se cierra y llama `clearSocialPasswordPrompt()`. Sin este guard
  /// cada `notifyListeners()` de auth (restoreSession + refresh + sync)
  /// pusheaba otra instancia → la pantalla aparecía 2-3 veces.
  bool _setupPasswordPushing = false;
  bool _providerApprovalShowing = false;
  bool _trustRejectionShowing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final auth = context.read<AuthProvider>();
    auth.addListener(_onAuthChanged);
    // Sync inicial — auth ya está inicializado cuando llegamos aquí.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _onAuthChanged();
    });
    // Checa Play Store por una actualización al arrancar la app. Es
    // fire-and-forget — la app sigue su flujo sin esperar. Si no hay
    // Play Store (iOS, Huawei, web) el plugin tira PlatformException
    // y el try-catch lo absorbe en silencio.
    _maybeOfferAppUpdate();
  }

  /// Pregunta a Play Store si hay una update disponible y arranca la
  /// descarga FLEXIBLE — en background, con snackbar nativo de Google
  /// Play para que el user reinicie cuando termine. Nunca interrumpe el
  /// flujo (no usamos `AppUpdateType.immediate`).
  Future<void> _maybeOfferAppUpdate() async {
    try {
      final info = await InAppUpdate.checkForUpdate();
      if (info.updateAvailability != UpdateAvailability.updateAvailable) {
        return;
      }
      // Solo intentamos el flexible si Play está seguro de que se puede
      // disparar — evita una excepción adicional si el flow está
      // bloqueado por política del dispositivo.
      if (info.flexibleUpdateAllowed) {
        await InAppUpdate.startFlexibleUpdate();
        // Cuando la descarga termina el plugin muestra su propio
        // snackbar nativo "Restart"; no necesitamos hacer nada acá.
      }
    } catch (e) {
      // iOS, build sin Play Services, sin internet — todo cae acá.
      // No es crítico; solo logueamos en debug y seguimos.
      if (kDebugMode) debugPrint('[InAppUpdate] check falló: $e');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    context.read<AuthProvider>().removeListener(_onAuthChanged);
    super.dispose();
  }

  /// Cuando la app vuelve a foreground (resumed), forzamos un
  /// `refreshProviderStatus` para que el sync detecte cualquier
  /// aprobación de perfil que haya ocurrido mientras el WS estaba
  /// desconectado (background). El sync encola el welcome modal y
  /// `_onAuthChanged` lo muestra al instante — sin que el user
  /// tenga que entrar al panel manualmente.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    if (!mounted) return;
    final auth = context.read<AuthProvider>();
    if (auth.user == null) return;
    auth.refreshProviderStatus();
    // Refresca el balance de monedas al volver al foreground: si el user recibió
    // monedas (ej. referido aprobado) mientras la app estaba en background, el
    // evento WS pudo perderse; aquí lo recuperamos para que el contador del
    // header se actualice sin reiniciar la app.
    auth.refreshCurrentUser();
  }

  void _onAuthChanged() {
    final auth = context.read<AuthProvider>();
    final notifs = context.read<NotificationsProvider>();
    final favs = context.read<FavoritesProvider>();
    final chat = context.read<ChatProvider>();

    if (auth.user != null) {
      notifs.setUser(userId: auth.user!.id, role: auth.user!.role);
      favs.initialize(auth.user!.id);
      chat.initialize(auth.user!.id);

      if (!_fcmInitialized) {
        _fcmInitialized = true;
        FcmService.onMessageTap = _handleFcmTap;
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

    // ── Setup de contraseña tras social-login de un user NUEVO ──
    // Se muestra INMEDIATAMENTE después del social-login exitoso —
    // ANTES de cualquier onboarding (provider o cliente) y antes del
    // welcome modal. Sin el `== authenticated` gate, atrapamos el
    // estado intermedio `needsOnboarding` que el social-login deja
    // tras crear un user nuevo (era el caso roto: el SetupPassword
    // aparecía recién tras completar el formulario de proveedor).
    //
    // SetupPasswordScreen usa `rootNavigator: true`, así queda encima
    // del router. Al cerrarse, llama `clearSocialPasswordPrompt()`
    // y el siguiente notifyListeners continúa el flow normal.
    if (auth.socialAccountNeedsPassword &&
        current != AppNavigationState.loading &&
        !_setupPasswordPushing) {
      // Marcamos ANTES del post-frame para que cualquier
      // `notifyListeners()` que dispare auth entre este punto y el
      // push real no entre por la misma rama y duplique la pantalla.
      _setupPasswordPushing = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) {
          _setupPasswordPushing = false;
          return;
        }
        final navCtx = _navigatorKey.currentContext;
        if (navCtx == null || !navCtx.mounted) {
          _setupPasswordPushing = false;
          return;
        }
        Navigator.of(navCtx, rootNavigator: true)
            .push(
              MaterialPageRoute(builder: (_) => const SetupPasswordScreen()),
            )
            .whenComplete(() {
              // Liberamos el guard cuando la pantalla se cierra; si el flag
              // de auth aún sigue `true` (raro), el próximo notifyListeners
              // podrá re-empujarla.
              if (mounted) _setupPasswordPushing = false;
            });
      });
      _prevNavState = current;
      return;
    }

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
        // Gate: bloquea el auto-start del tutorial mientras el welcome
        // está abierto — primero el welcome, luego el tour.
        ShowcaseManager.blockingModalActive = true;
        showDialog(
          context: navCtx,
          barrierDismissible: false,
          barrierColor: Colors.black.withValues(alpha: 0.65),
          builder: (dialogCtx) => WelcomeOnboardingModal(
            onDismiss: () {
              ShowcaseManager.blockingModalActive = false;
              Navigator.of(dialogCtx, rootNavigator: true).pop();
            },
          ),
        ).then((_) => ShowcaseManager.blockingModalActive = false);
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

    // ── Validación de confianza rechazada (TRUST_REJECTED) ────
    // Mismo patrón robusto que la aprobación: reintenta hasta que el navCtx
    // esté listo y solo limpia el flag tras mostrar. Antes limpiaba el flag de
    // forma SÍNCRONA antes del addPostFrameCallback, así que si el navCtx no
    // estaba listo en ese frame el dialog nunca aparecía (rechazo no se veía en
    // tiempo real, solo tras reiniciar).
    if (auth.pendingTrustRejection != null && mounted) {
      _tryShowTrustRejection(auth.pendingTrustRejection!);
    }

    // ── Solicitud de plan rechazada ───────────────────────────
    // Disparado por PLAN_RECHAZADO (socket en vivo o cold-start sync). Muestra
    // el modal "Solicitud rechazada" con el motivo del admin sobre cualquier
    // pantalla al abrir la app.
    if (auth.pendingPlanRejection != null && mounted) {
      final rejection = auth.pendingPlanRejection!;
      auth.clearPlanRejection();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        showPlanRejectionDialog(context, rejection);
      });
    }

    // ── Aprobación de perfil de proveedor (modal en home) ─────
    // Se dispara cuando el admin aprueba el perfil — el carrusel de
    // bienvenida + plan ESTANDAR de cortesía aparece en la pantalla
    // principal en tiempo real, sin esperar a que el usuario entre
    // al panel del proveedor. La gate "ya visto" la administra el
    // propio modal vía SharedPreferences por providerId.
    //
    // BUG previo: clearPendingProviderApproval() corría SÍNCRONO
    // antes del addPostFrameCallback. Si en ese frame
    // _navigatorKey.currentContext era null (router en transición),
    // el modal nunca se mostraba y el flag ya estaba limpiado → sin
    // segundo intento. Ahora _tryShowProviderApproval reintenta y
    // solo limpia el flag cuando el modal se mostró con éxito.
    final approval = auth.pendingProviderApproval;
    if (approval != null && mounted) {
      _tryShowProviderApproval(approval);
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
      dash.loadDashboard(providerType: auth.activeProfileType, force: true);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _showPlanActivationCarousel(payload);
      });
    }

    // ── Validación de identidad aprobada (TRUST_APPROVED) ────
    // Dialog de éxito sobre cualquier pantalla en tiempo real. El
    // _tryShowTrustApproval reintenta hasta que navCtx esté listo y
    // solo limpia el flag tras éxito.
    final trustApproval = auth.pendingTrustApproval;
    if (trustApproval != null && mounted) {
      _tryShowTrustApproval(trustApproval);
    }

    // ── Cuenta eliminada por el admin ────────────────────────
    // Admin borró la cuenta entera del user. Mostramos dialog con motivo
    // y disparamos logout — todo lo del user (providers, reviews, favs,
    // chats) ya fue cascadeado por el backend. El user tendrá que
    // re-registrarse desde cero.
    //
    // NO limpiamos el flag síncrono — si el dialog falla en montar (navCtx
    // null en transición), el próximo notifyListeners reintenta. La
    // limpieza ocurre dentro de _tryShowUserDeletion tras éxito.
    final userDeletion = auth.pendingUserDeletion;
    if (userDeletion != null && mounted) {
      _tryShowUserDeletion(userDeletion);
      return; // no procesar otros side-effects mientras se muestra el dialog
    }

    // ── Provider eliminado por el admin ──────────────────────
    // Admin borró el perfil OFICIO/NEGOCIO del user. _syncProviderStatus
    // ya removió el tipo de _providerProfiles (botón "Ir a mi panel"
    // → "Quiero ser parte" automático). Aquí mostramos el dialog con
    // el motivo + limpiamos las notifs locales viejas del provider
    // eliminado (cascade del backend ya borró las de BD; el provider
    // local en memoria sigue cacheándolas hasta el siguiente loadHistory).
    final deletion = auth.pendingProviderDeletion;
    if (deletion != null && mounted) {
      auth.clearProviderDeletion();
      // Re-carga historial de notifs: el cascade del backend ya borró
      // las viejas del provider eliminado (incluyendo la de "panel
      // aprobado"), pero el _items in-memory aún las tiene. Sin este
      // refresh, el user al entrar al tab Alertas seguiría viéndolas.
      notifs.loadHistory();
      // Si todavía tiene OTRO perfil activo, recargá el dashboard de
      // ese para no quedar con cache stale. Si no quedó ninguno, el
      // user volverá a "Quiero ser parte" en home.
      final remaining = auth.activeProfileType;
      if (remaining != null) {
        context.read<DashboardProvider>().loadDashboard(
          providerType: remaining,
          force: true,
        );
      }
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _tryShowProviderDeletion(deletion);
      });
    }
  }

  /// Intenta mostrar el modal de bienvenida tras aprobación del admin.
  /// Reintenta cada frame hasta que `_navigatorKey.currentContext` esté
  /// listo (máx ~500ms). Solo limpia `pendingProviderApproval` tras
  /// éxito — si todos los retries fallan, el flag queda y el próximo
  /// `notifyListeners()` lo reintenta.
  ///
  /// Sin esto: cuando el socket PROVIDER_APPROVED llegaba mientras el
  /// router estaba en transición, navCtx era null por 1-2 frames, el
  /// modal nunca aparecía y el flag se había limpiado SÍNCRONO antes.
  /// El user solo lo veía al entrar manualmente al panel home.
  Future<void> _tryShowProviderApproval(
    ProviderApprovalPayload approval,
  ) async {
    if (_providerApprovalShowing) return;
    _providerApprovalShowing = true;
    BuildContext? navCtx;
    try {
      // Hasta 30 frames (~500ms en 60fps) esperando al navigator.
      for (var i = 0; i < 30; i++) {
        navCtx = _navigatorKey.currentContext;
        if (navCtx != null && navCtx.mounted) break;
        await Future<void>.delayed(const Duration(milliseconds: 16));
        if (!mounted) return;
      }
      if (navCtx == null || !navCtx.mounted) {
        debugPrint(
          'Welcome modal: navCtx aun null tras 500ms; '
          'se reintentara en el proximo cambio de estado',
        );
        return;
      }
      if (!mounted) return;
      await WelcomeProviderPlanModal.showIfFirstTime(
        navCtx,
        displayName: approval.displayName,
        providerId: approval.providerId,
      );
      if (mounted) {
        context.read<AuthProvider>().clearPendingProviderApproval();
      }
    } finally {
      _providerApprovalShowing = false;
    }
  }

  /// Dialog informativo cuando el admin elimina el perfil del user.
  /// Se monta sobre cualquier pantalla via _navigatorKey. Reintenta hasta
  /// 30 frames (~500ms) esperando al navigator — antes era una llamada
  /// directa: si `navCtx` estaba null 1-2 frames (router en transición),
  /// el dialog NUNCA aparecía. Ahora espera igual que el de aprobación.
  Future<void> _tryShowProviderDeletion(
    ProviderDeletionPayload deletion,
  ) async {
    BuildContext? navCtx;
    for (var i = 0; i < 30; i++) {
      navCtx = _navigatorKey.currentContext;
      if (navCtx != null && navCtx.mounted) break;
      await Future<void>.delayed(const Duration(milliseconds: 16));
      if (!mounted) return;
    }
    if (navCtx == null || !navCtx.mounted) return;
    showProviderDeletionDialog(navCtx, deletion);
  }

  /// Dialog de éxito tras validación de identidad aprobada. Retry
  /// pattern hasta que el navigator esté listo (cubre el caso de la
  /// app abriendo desde push en background). Solo limpia el flag tras
  /// mostrar — si falla, el próximo notifyListeners reintenta.
  Future<void> _tryShowTrustApproval(TrustApprovalPayload payload) async {
    BuildContext? navCtx;
    for (var i = 0; i < 30; i++) {
      navCtx = _navigatorKey.currentContext;
      if (navCtx != null && navCtx.mounted) break;
      await Future<void>.delayed(const Duration(milliseconds: 16));
      if (!mounted) return;
    }
    if (navCtx == null || !navCtx.mounted) return;
    if (!mounted) return;
    context.read<AuthProvider>().clearTrustApproval();

    final isNegocio = payload.profileType == 'NEGOCIO';
    final namePart = payload.businessName.isEmpty
        ? ''
        : ' "${payload.businessName}"';

    await showDialog<void>(
      context: navCtx,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (ctx) =>
          _TrustApprovalDialog(isNegocio: isNegocio, namePart: namePart),
    );
  }

  /// Muestra el dialog de rechazo de validación en tiempo real. Reintenta
  /// frame por frame hasta que `_navigatorKey.currentContext` esté listo y solo
  /// limpia `pendingTrustRejection` tras mostrar — mismo patrón robusto que la
  /// aprobación, para que el rechazo aparezca sin reiniciar la app.
  Future<void> _tryShowTrustRejection(TrustRejectionPayload payload) async {
    if (_trustRejectionShowing) return;
    _trustRejectionShowing = true;
    BuildContext? navCtx;
    try {
      for (var i = 0; i < 30; i++) {
        navCtx = _navigatorKey.currentContext;
        if (navCtx != null && navCtx.mounted) break;
        await Future<void>.delayed(const Duration(milliseconds: 16));
        if (!mounted) return;
      }
      if (navCtx == null || !navCtx.mounted || !mounted) return;

      final receiptKey =
          payload.isProviderRegistration && payload.notificationId != null
          ? 'seen_provider_rejection_${payload.notificationId}'
          : null;
      if (receiptKey != null) {
        final prefs = await SharedPreferences.getInstance();
        if (prefs.getBool(receiptKey) == true) {
          if (mounted) context.read<AuthProvider>().clearTrustRejection();
          return;
        }
      }

      if (!navCtx.mounted || !mounted) return;
      await showTrustRejectionDialog(navCtx, payload);
      if (receiptKey != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool(receiptKey, true);
      }
      if (mounted) context.read<AuthProvider>().clearTrustRejection();
    } finally {
      _trustRejectionShowing = false;
    }
  }

  /// Intenta mostrar dialog bloqueante de cuenta eliminada. Reintenta
  /// frame por frame hasta que `_navigatorKey.currentContext` esté
  /// listo (máx ~500ms). Solo limpia `pendingUserDeletion` tras éxito;
  /// si falla, el flag persiste y el próximo notifyListeners reintenta.
  ///
  /// PopScope(canPop:false) bloquea back de Android.
  /// barrierDismissible:false bloquea tap fuera.
  /// La única salida es "Entendido" → logout → login. Mientras tanto
  /// el dialog cubre todo y el user no puede tocar nada de su perfil
  /// "fantasma" que sigue en pantalla.
  Future<void> _tryShowUserDeletion(UserDeletionPayload payload) async {
    BuildContext? navCtx;
    for (var i = 0; i < 30; i++) {
      navCtx = _navigatorKey.currentContext;
      if (navCtx != null && navCtx.mounted) break;
      await Future<void>.delayed(const Duration(milliseconds: 16));
      if (!mounted) return;
    }
    if (navCtx == null || !navCtx.mounted) return;
    if (!mounted) return;
    context.read<AuthProvider>().clearUserDeletion();
    await showDialog<void>(
      context: navCtx,
      barrierDismissible: false,
      builder: (ctx) => PopScope(
        canPop: false,
        child: AlertDialog(
          icon: const Icon(
            Icons.no_accounts_rounded,
            color: Colors.red,
            size: 40,
          ),
          title: const Text(
            'Tu cuenta ha sido eliminada',
            textAlign: TextAlign.center,
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Motivo del administrador:'),
              const SizedBox(height: 4),
              Text(
                payload.reason,
                style: const TextStyle(fontStyle: FontStyle.italic),
              ),
              const SizedBox(height: 12),
              const Text(
                'Tu cuenta y todos tus datos (perfiles de proveedor, '
                'reseñas, mensajes, favoritos) fueron eliminados. '
                'Puedes registrarte nuevamente como cliente o proveedor '
                'con el mismo correo.',
                style: TextStyle(fontSize: 13),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                if (!mounted) return;
                context.read<AuthProvider>().logout();
              },
              child: const Text('Entendido'),
            ),
          ],
        ),
      ),
    );
  }

  /// Mapea el plan del payload a la variante del carrousel y lo lanza
  /// usando el navigator del router (siempre disponible, no depende de
  /// la pantalla actual). El gate por (providerId, plan) en
  /// `WelcomeProviderPlanModal.showIfFirstTime` evita re-mostrar si el
  /// usuario ya lo vio.
  Future<void> _showPlanActivationCarousel(
    PlanActivationPayload payload,
  ) async {
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
      final raw = data?['providerId'] ?? data?['id'];
      return raw is int ? raw : null;
    }();
    if (providerId == null) {
      _showPlanPromotionDialog(payload);
      return;
    }

    final variant = switch (payload.plan.toUpperCase()) {
      'PREMIUM' => WelcomePlan.premium,
      'ESTANDAR' => WelcomePlan.estandar,
      _ => WelcomePlan.estandar,
    };
    final displayName =
        dash.profile?.businessName ?? auth.user?.firstName ?? '';
    await WelcomeProviderPlanModal.showIfFirstTime(
      navCtx,
      displayName: displayName,
      providerId: providerId,
      plan: variant,
    );
  }

  /// Inserta una notificación push recibida en FOREGROUND en el
  /// `NotificationsProvider` para que aparezca en el tab de Alertas.
  ///
  /// Background/terminated NO llama acá (FcmService ya no lo invoca):
  /// la notif ya está persistida y loadHistory la trae con id real.
  void _handleFcmInbound(RemoteMessage message) {
    if (!mounted) return;
    final notif = AppNotification.fromSocket({
      'type':
          message.data['type'] ??
          message.notification?.title?.toUpperCase() ??
          'GENERIC',
      'title':
          message.notification?.title ??
          message.data['title'] ??
          'Notificación',
      'body': message.notification?.body ?? message.data['body'] ?? '',
      'targetProfileType': message.data['targetProfileType'],
      // imageUrl viaja en data (broadcast del admin) — sin esto el
      // modal re-abierto desde Alertas perdía la foto.
      'imageUrl': _imageUrlFromMessage(message),
      // Metadata de deep-linking del push: sin reenviarla, el tile de Alertas
      // perdía el destino (CHAT_MESSAGE → lista vacía, NEW_OFFER → sin
      // requestId). AppNotification._extractActionData solo copia estas keys.
      'chatRoomId': message.data['chatRoomId'],
      'roomId': message.data['roomId'],
      'requestId': message.data['requestId'],
      'offerId': message.data['offerId'],
      'providerId': message.data['providerId'],
      'reviewId': message.data['reviewId'],
      'senderAvatarUrl': message.data['senderAvatarUrl'],
    });
    // B-4: pasamos targetUserId para que el provider lo valide
    // contra el user actual — defensa contra cross-contaminación
    // de tokens FCM (raro pero posible si dos users comparten dispositivo
    // y el clearToken del logout falló).
    context.read<NotificationsProvider>().addLocal(
      notif,
      targetUserId: message.data['targetUserId'],
    );
    final type = message.data['type'] as String?;
    if (type == 'PROVIDER_APPROVED' || type == 'PROVIDER_REJECTED') {
      context.read<AuthProvider>().refreshProviderStatus();
    }
  }

  /// Extrae la imageUrl del RemoteMessage (data o bloques nativos).
  String? _imageUrlFromMessage(RemoteMessage m) {
    final fromData = m.data['imageUrl'] ?? m.data['image'];
    if (fromData is String && fromData.isNotEmpty) return fromData;
    final android = m.notification?.android?.imageUrl;
    if (android != null && android.isNotEmpty) return android;
    final apple = m.notification?.apple?.imageUrl;
    if (apple != null && apple.isNotEmpty) return apple;
    return null;
  }

  /// Construye una AppNotification de broadcast desde el push y la
  /// registra en el inbox persistido (usado en el tap de background,
  /// que no pasa por _handleFcmInbound).
  void _recordBroadcastFromMessage(RemoteMessage message) {
    if (!mounted) return;
    final notif = AppNotification.fromSocket({
      'type': 'BROADCAST',
      'title':
          message.notification?.title ??
          message.data['title'] ??
          'Notificación',
      'body': message.notification?.body ?? message.data['body'] ?? '',
      'imageUrl': _imageUrlFromMessage(message),
    });
    context.read<NotificationsProvider>().recordBroadcast(notif);
  }

  /// Deep-link FCM → ruta GoRouter correspondiente.
  void _handleFcmTap(RemoteMessage message) {
    if (!mounted) return;
    final type = message.data['type'] as String?;
    debugPrint('[FCM] Navegando por tipo: $type, data: ${message.data}');
    switch (type) {
      case 'BROADCAST':
        // Push masiva del admin (con título/cuerpo/foto). NO navegamos
        // — abrimos el modal enriquecido para que el user vea la foto
        // completa con el cuerpo del mensaje. Si fue tocada desde
        // background/terminated, NotificationHandler difiere el show
        // al próximo frame hasta que el navigator esté montado.
        NotificationHandler.showFromRemoteMessage(message);
        // Persistir en "Alertas" para que el user pueda re-abrir el
        // modal cuantas veces quiera. El tap en background NO pasa por
        // _handleFcmInbound, así que lo registramos acá explícito.
        _recordBroadcastFromMessage(message);
      case 'PROVIDER_APPROVED':
        // El push pudo llegar con la app en background → el socket NO
        // recibió PROVIDER_APPROVED en vivo, por lo que el welcome modal
        // nunca se encoló. Forzamos un refresh del estado del proveedor:
        // si hay un perfil aprobado, _syncProviderStatus encola el modal
        // y _onAuthChanged lo muestra sobre la pantalla actual.
        context.read<AuthProvider>().refreshProviderStatus();
      case 'PROVIDER_REJECTED':
        // No forzar ruta: el rechazo se muestra como overlay global sobre
        // la pantalla actual. El refresh recupera motivo + id persistidos,
        // incluso si el socket se perdió mientras la app estaba pausada.
        context.read<AuthProvider>().refreshProviderStatus();
      case 'PLAN_APROBADO':
        // Cold-start desde push (app en background/terminada): el socket NO
        // recibió PLAN_APROBADO en vivo, así que el carrusel de beneficios
        // nunca se encoló. Lo encolamos aquí (igual que PROVIDER_APPROVED /
        // TRUST_APPROVED) para que _AuthSideEffects lo muestre sobre la
        // pantalla actual. Sin esto solo navegaba a /profile sin carrusel.
        final planAuth = context.read<AuthProvider>();
        final approvedPlan =
            (message.data['plan'] as String?)?.toUpperCase() ?? 'ESTANDAR';
        planAuth.setPendingPlanPromotion(
          PlanActivationPayload(
            plan: approvedPlan,
            title: message.data['title'] as String? ?? '¡Plan activado!',
          ),
        );
        planAuth.refreshProviderStatus();
        widget.router.go('/profile');
      case 'NEW_REVIEW':
      case 'PLAN_RECHAZADO':
      case 'PLAN_CANCELADO':
        widget.router.go('/profile');
      case 'TRUST_APPROVED':
        // Al abrir desde push, encolamos el payload para que
        // _AuthSideEffects dispare el dialog de éxito sobre la
        // pantalla actual (no fuerza navegación).
        final auth = context.read<AuthProvider>();
        auth.setPendingTrustApproval(
          TrustApprovalPayload(
            profileType: message.data['profileType'] as String? ?? 'OFICIO',
            businessName: '',
          ),
        );
      // Feature OCULTA (kSubastasEnabled): pushes viejos de subasta tocados
      // con el flag apagado no navegan (la ruta /my-requests no existe).
      case 'NEW_OFFER':
        if (!kSubastasEnabled) break;
        widget.router.go('/');
        // Deep-link a la solicitud específica que recibió la postulación.
        final reqId = message.data['requestId'];
        widget.router.push(
          reqId != null ? '/my-requests?requestId=$reqId' : '/my-requests',
        );
      case 'OFFER_ACCEPTED':
        if (!kSubastasEnabled) break;
        widget.router.go('/');
        widget.router.push('/provider-panel');
      case 'CHAT_MESSAGE':
        // 1. Nos aseguramos de estar en la pantalla principal (raíz)
        widget.router.go('/');
        // 2. Empujamos el chat encima de la principal
        final roomId = message.data['chatRoomId'] ?? message.data['roomId'];
        if (roomId != null) {
          widget.router.push('/chat/$roomId');
        }
      default:
        break;
    }
  }

  // Diálogos extraídos a core/widgets/auth_side_effect_dialogs.dart.
  // Los métodos quedan como delegantes finos para no tocar los call sites.
  void _showPlanPromotionDialog(PlanActivationPayload payload) =>
      showPlanPromotionDialog(context, payload);

  void _showDeactivationDialog() => showDeactivationDialog(context);

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Diálogo de validación aprobada con fondo verde sutil y animación de confeti.
class _TrustApprovalDialog extends StatefulWidget {
  final bool isNegocio;
  final String namePart;

  const _TrustApprovalDialog({required this.isNegocio, required this.namePart});

  @override
  State<_TrustApprovalDialog> createState() => _TrustApprovalDialogState();
}

class _TrustApprovalDialogState extends State<_TrustApprovalDialog>
    with TickerProviderStateMixin {
  late AnimationController _confettiController;
  late AnimationController _scaleController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    // Controlador del confeti (infinite loop)
    _confettiController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4000),
    )..repeat();

    // Controlador del icono (rebote elástico)
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _scaleAnimation = CurvedAnimation(
      parent: _scaleController,
      curve: Curves.elasticOut,
    );

    // Dispara el rebote justo al abrir
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scaleController.forward();
    });
  }

  @override
  void dispose() {
    _confettiController.dispose();
    _scaleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Verdes amigables adaptativos
    final backgroundColor = isDark
        ? const Color(0xFF1B3329) // Verde muy oscuro y sutil para modo oscuro
        : const Color(0xFFE8F5E9); // Verde claro pastel para modo claro
    final accentColor = isDark
        ? const Color(0xFF66BB6A) // Verde brillante para oscuro
        : const Color(0xFF2E7D32); // Verde profundo para claro

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(20),
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip
            .none, // Permite que el confeti caiga fuera de los límites del dialog
        children: [
          // Capa de Confeti (al fondo)
          Positioned.fill(
            child: IgnorePointer(
              child: CustomPaint(
                painter: _ConfettiPainter(_confettiController),
              ),
            ),
          ),

          // Capa del Contenido (Tarjeta principal)
          Container(
            width: double.maxFinite,
            padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: accentColor.withOpacity(0.3),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icono con animación de rebote (elasticOut)
                ScaleTransition(
                  scale: _scaleAnimation,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: accentColor.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.verified_user_rounded,
                      color: accentColor,
                      size: 48,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                // Título
                Text(
                  '¡Validación aprobada!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                const SizedBox(height: 12),
                // Mensaje
                Text(
                  'Los datos de tu perfil${widget.isNegocio ? " de negocio" : " profesional"}${widget.namePart} '
                  'han sido validados. Ya apareces como "Confiable" para tus clientes.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                ),
                const SizedBox(height: 28),
                // Botón
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accentColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Entendido',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Pintor personalizado para generar el efecto de confeti/serpentinas cayendo.
class _ConfettiPainter extends CustomPainter {
  final Animation<double> animation;
  _ConfettiPainter(this.animation) : super(repaint: animation);

  @override
  void paint(Canvas canvas, Size size) {
    final random = Random(42); // Seed fijo para que las posiciones no salten
    final colors = [
      Colors.green,
      Colors.teal,
      Colors.lightGreen,
      Colors.cyan,
      Colors.yellow,
      Colors.pink,
      Colors.orange,
    ];

    for (int i = 0; i < 50; i++) {
      final x = random.nextDouble() * size.width;
      final startY = -size.height * random.nextDouble();
      final speed = 0.5 + random.nextDouble() * 1.5;

      // Calcula la posición Y en bucle infinito
      final y =
          (startY + animation.value * size.height * speed) %
              (size.height * 1.2) -
          20;

      final paint = Paint()..color = colors[random.nextInt(colors.length)];
      final rectWidth = 6.0 + random.nextDouble() * 6;
      final rectHeight = 3.0 + random.nextDouble() * 3;

      canvas.save();
      canvas.translate(x, y);
      // Rota las serpentinas mientras caen
      canvas.rotate(animation.value * 10 * random.nextDouble() + i);
      canvas.drawRect(
        Rect.fromCenter(
          center: Offset.zero,
          width: rectWidth,
          height: rectHeight,
        ),
        paint,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
