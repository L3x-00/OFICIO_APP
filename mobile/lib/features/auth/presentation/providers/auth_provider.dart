import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import '../../data/auth_repository.dart';
import '../../data/auth_local_storage.dart';
import '../../data/saved_accounts_storage.dart';
import '../../domain/models/user_model.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/network/socket_service.dart';
import '../../../../core/services/fcm_service.dart';
import 'auth/auth_models.dart';
import 'registration_provider.dart';

// Re-export para que el resto de la app pueda seguir importando solo
// `auth_provider.dart` y resolver `AppNavigationState` y los payload
// types sin tocar nada más.
export 'auth/auth_models.dart';

// Splits de responsabilidad — `part of` para que cada mixin acceda al
// estado privado de la clase sin romper la encapsulación de la API
// pública (la única forma en Dart de tener mixins + private state es
// compartir library; con import puro habría que exponer todo o
// duplicar abstracciones que solo añaden ruido).
part 'auth/auth_socket_mixin.dart';
part 'auth/auth_provider_logic_mixin.dart';
part 'auth/auth_recovery_mixin.dart';

class AuthProvider extends ChangeNotifier
    with AuthSocketMixin, AuthProviderLogicMixin, AuthRecoveryMixin {
  @override
  final AuthRepository _repo = AuthRepository();

  @override
  UserModel? _user;
  bool _isInitialized = false;
  @override
  bool _needsOnboarding = false;
  @override
  bool _needsEmailVerification = false;
  bool _isGuest = false;
  @override
  String? _error;
  @override
  bool _isLoading = false;

  // ── Registro pendiente ───────────────────────────────────────
  // El estado de "esperando OTP" vive en RegistrationProvider. Lo
  // adjuntamos vía `attachRegistration` desde main.dart para evitar
  // ciclos de dependencia y para no acoplar la sesión activa con el
  // flujo transitorio de registro.
  @override
  RegistrationProvider? _registration;

  void attachRegistration(RegistrationProvider reg) {
    _registration = reg;
  }

  /// Compat: getter delegado al RegistrationProvider.
  String? get pendingEmail => _registration?.pendingEmail;
  @override
  String? get _pendingRegistrationId => _registration?.pendingId;

  /// true cuando el servidor notificó que esta cuenta fue desactivada.
  /// _AppRoot escucha este flag para mostrar el diálogo de desactivación.
  @override
  bool _wasDeactivated = false;
  bool get wasDeactivated => _wasDeactivated;

  void clearDeactivatedFlag() {
    _wasDeactivated = false;
    notifyListeners();
  }

  // ── Multi-perfil de proveedor ─────────────────────────────
  // Almacena los tipos de perfil que tiene el usuario: 'OFICIO', 'NEGOCIO'.
  @override
  final Set<String> _providerProfiles = {};
  @override
  String? _activeProfileType;
  // Estado de verificación sincronizado con el backend.
  @override
  String? _providerVerificationStatus; // 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  // Estado y motivo de rechazo por tipo de perfil.
  @override
  final Map<String, String> _verificationStatusByType = {};
  @override
  final Map<String, String> _rejectionReasonByType = {};
  @override
  final Map<String, Map<String, dynamic>> _providerDataByType = {};

  /// Cuando el admin recién aprueba un perfil, guardamos aquí el
  /// `providerId` + displayName para que la pantalla principal (no el
  /// panel) muestre el modal de bienvenida en tiempo real. Persiste
  /// hasta que el listener lo consume vía [clearPendingProviderApproval].
  /// La gate de "ya visto" la administra `WelcomeProviderPlanModal` vía
  /// SharedPreferences.
  @override
  ProviderApprovalPayload? _pendingProviderApproval;
  ProviderApprovalPayload? get pendingProviderApproval =>
      _pendingProviderApproval;

  void clearPendingProviderApproval() {
    _pendingProviderApproval = null;
    notifyListeners();
  }

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated =>
      _user != null && !_needsOnboarding && !_needsEmailVerification;
  bool get isGuest => _isGuest;
  bool get needsOnboarding => _needsOnboarding;
  bool get needsEmailVerification => _needsEmailVerification;
  bool get isInitialized => _isInitialized;
  String? get error => _error;

  Set<String> get providerProfiles => Set.unmodifiable(_providerProfiles);
  String? get activeProfileType => _activeProfileType;
  String? get providerVerificationStatus => _providerVerificationStatus;
  bool get hasOficioProfile => _providerProfiles.contains('OFICIO');
  bool get hasNegocioProfile => _providerProfiles.contains('NEGOCIO');

  /// true cuando el usuario tiene al menos un perfil de proveedor APROBADO.
  bool get hasApprovedProvider =>
      _verificationStatusByType.values.any((s) => s == 'APROBADO');

  /// Devuelve el status de verificación para un tipo específico ('OFICIO'|'NEGOCIO').
  String? verificationStatusFor(String type) => _verificationStatusByType[type];

  /// Devuelve el motivo de rechazo para un tipo específico (null si no fue rechazado).
  String? rejectionReasonFor(String type) => _rejectionReasonByType[type];

  /// Devuelve los datos completos del perfil de proveedor para pre-llenar el formulario.
  Map<String, dynamic>? providerDataFor(String type) =>
      _providerDataByType[type];

  /// Plan REAL del proveedor según el backend (`/users/my-provider-status`),
  /// disponible apenas se restaura la sesión al reabrir la app. 'GRATIS' si
  /// no hay perfil/plan. Útil para bloquear funciones premium de inmediato
  /// sin esperar a que cargue el dashboard.
  String planFor(String type) =>
      (_providerDataByType[type]?['plan'] as String?) ?? 'GRATIS';

  /// Refresca el estado del proveedor desde el servidor (útil post-validación).
  Future<void> refreshProviderStatus() async {
    await _syncProviderStatus();
    notifyListeners();
  }

  /// Elimina la cuenta del usuario en cascada y hace logout local.
  Future<bool> deleteAccount() async {
    try {
      SocketService.instance.removeDeactivationListener(
        _handleRemoteDeactivation,
      );
      SocketService.instance.removeNotificationListener(
        _handleRemoteNotification,
      );
      SocketService.instance.disconnect();
      await _repo.deleteAccount();
      _user = null;
      _isGuest = false;
      _needsOnboarding = false;
      _needsEmailVerification = false;
      _providerProfiles.clear();
      _activeProfileType = null;
      _providerVerificationStatus = null;
      _verificationStatusByType.clear();
      _rejectionReasonByType.clear();
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Devuelve true si el usuario autenticado puede registrar un nuevo
  /// perfil del tipo dado ('OFICIO' o 'NEGOCIO') — es decir, aún no
  /// lo tiene.
  bool canBecomeRole(String type) => !_providerProfiles.contains(type);

  /// true si al menos uno de los tipos de proveedor está disponible
  /// para registrar.
  bool get canBecomeAnyProvider =>
      canBecomeRole('OFICIO') || canBecomeRole('NEGOCIO');

  /// Estado calculado para la navegación.
  ///
  /// El orden de las guards importa: `_needsEmailVerification` debe
  /// evaluarse ANTES de `_user==null`. Tras `register()`, el user
  /// todavía no existe en BD (se crea en `verifyOtp`), así que `_user`
  /// es null mientras `_needsEmailVerification=true`. Si la guard de
  /// `unauthenticated` fuera primero, el router redirigiría al user
  /// a `/welcome` (perdiendo el flow de OTP) en lugar de mantenerlo
  /// en `/otp`.
  AppNavigationState get navigationState {
    if (!_isInitialized) return AppNavigationState.loading;
    if (_needsEmailVerification)
      return AppNavigationState.needsEmailVerification;
    if (_user == null && _isGuest) return AppNavigationState.guest;
    if (_user == null) return AppNavigationState.unauthenticated;
    if (_needsOnboarding) return AppNavigationState.needsOnboarding;
    return AppNavigationState.authenticated;
  }

  /// Permite navegar la app sin registrarse.
  void browseAsGuest() {
    _isGuest = true;
    notifyListeners();
  }

  // ── Bootstrap ──────────────────────────────────────────────

  Future<void> initialize() async {
    _user = await _repo.restoreSession();
    if (_user != null) {
      // Refrescar token ANTES de conectar el socket y sincronizar.
      await _refreshUserToken();
      await _syncProviderStatus();
      // Caso de aprobación recibida en background (FCM): la app puede
      // abrir recién aquí. Si el sync revela un perfil APROBADO,
      // encolamos el welcome modal — el gate de SharedPreferences
      // evita re-mostrarlo si el usuario ya lo vio.
      _enqueueProviderWelcomeIfNeeded();
      // Cold-start: si un perfil quedó RECHAZADO (validación de datos),
      // encola el modal "Datos no validados" para que aparezca al abrir.
      _enqueueTrustRejectionIfNeeded();
      _connectSocketForUser(_user!.id);
      // Sincroniza el balance de monedas al abrir la app. `restoreSession`
      // trae los `coins` guardados (viejos); si el usuario recibió monedas
      // de un referido mientras la app estaba cerrada, el contador del
      // header marcaría un valor desfasado (típicamente 0) hasta que se
      // recibiera una notificación por socket en vivo. unawaited: no
      // bloquea el arranque — al resolverse hace notifyListeners().
      unawaited(refreshCurrentUser());
    }
    _isInitialized = true;
    notifyListeners();
  }

  /// Refresca el access token para que el JWT refleje el nuevo rol
  /// (PROVEEDOR). Silencioso en caso de error.
  @override
  Future<void> _refreshUserToken() async {
    final result = await _repo.refreshTokens();
    result.when(
      success: (updatedUser) {
        if (_user != null && updatedUser.role.isNotEmpty) {
          _user = _user!.copyWith(role: updatedUser.role);
        }
      },
      failure: (_) {},
    );
  }

  /// Refresca el user completo desde /users/me — usado para actualizar
  /// `coins` tras un referido aprobado u otros eventos que modifican el
  /// balance. Silencioso si falla; notifica al final para que el header
  /// del home reactive el contador.
  Future<void> refreshCurrentUser() async {
    final result = await _repo.getCurrentUser();
    result.when(
      success: (fresh) {
        if (_user != null) {
          _user = _user!.copyWith(
            coins: fresh.coins,
            avatarUrl: fresh.avatarUrl,
            phone: fresh.phone,
            department: fresh.department,
            province: fresh.province,
            district: fresh.district,
          );
          notifyListeners();
        }
      },
      failure: (_) {},
    );
  }

  // ── Trust rejection overlay ───────────────────────────────
  @override
  TrustRejectionPayload? _pendingTrustRejection;
  TrustRejectionPayload? get pendingTrustRejection => _pendingTrustRejection;

  void setPendingTrustRejection(TrustRejectionPayload payload) {
    _pendingTrustRejection = payload;
    notifyListeners();
  }

  void clearTrustRejection() {
    _pendingTrustRejection = null;
    notifyListeners();
  }

  // ── Provider deletion overlay ─────────────────────────────
  // Set por el handler PROVIDER_DELETED del socket. _AuthSideEffects
  // lo consume para mostrar el dialog con el motivo del admin.
  ProviderDeletionPayload? _pendingProviderDeletion;
  ProviderDeletionPayload? get pendingProviderDeletion =>
      _pendingProviderDeletion;

  /// Llamado por el socket mixin cuando llega PROVIDER_DELETED.
  void setPendingProviderDeletion(ProviderDeletionPayload payload) {
    _pendingProviderDeletion = payload;
    notifyListeners();
  }

  void clearProviderDeletion() {
    _pendingProviderDeletion = null;
    notifyListeners();
  }

  // ── User deletion overlay (admin borró la cuenta) ─────────
  // Set por el handler USER_DELETED del socket. _AuthSideEffects lo
  // consume para mostrar el dialog con el motivo y disparar logout.
  UserDeletionPayload? _pendingUserDeletion;
  UserDeletionPayload? get pendingUserDeletion => _pendingUserDeletion;

  void setPendingUserDeletion(UserDeletionPayload payload) {
    _pendingUserDeletion = payload;
    notifyListeners();
  }

  void clearUserDeletion() {
    _pendingUserDeletion = null;
    notifyListeners();
  }

  // ── Trust approval overlay (admin validó identidad) ───────
  // Set por el handler TRUST_APPROVED del socket. _AuthSideEffects lo
  // consume para mostrar un dialog de éxito en tiempo real, sobre
  // cualquier pantalla. Si la app está en background, FCM dispara la
  // notif y al volver el handler vuelve a setear este flag.
  TrustApprovalPayload? _pendingTrustApproval;
  TrustApprovalPayload? get pendingTrustApproval => _pendingTrustApproval;

  void setPendingTrustApproval(TrustApprovalPayload payload) {
    _pendingTrustApproval = payload;
    notifyListeners();
  }

  void clearTrustApproval() {
    _pendingTrustApproval = null;
    notifyListeners();
  }

  // ── Plan promotion overlay ────────────────────────────────
  @override
  PlanActivationPayload? _pendingPlanPromotion;
  PlanActivationPayload? get pendingPlanPromotion => _pendingPlanPromotion;

  /// Encola el carrusel de beneficios de plan. Lo usa el tap de push
  /// PLAN_APROBADO (cold-start/background) para que _AuthSideEffects lo
  /// muestre, igual que el socket en vivo.
  void setPendingPlanPromotion(PlanActivationPayload payload) {
    _pendingPlanPromotion = payload;
    notifyListeners();
  }

  void clearPlanPromotion() {
    _pendingPlanPromotion = null;
    notifyListeners();
  }

  // ── Plan rejection overlay (solicitud de plan rechazada) ──
  // Set por el handler PLAN_RECHAZADO del socket o por el cold-start sync.
  // _AuthSideEffects lo consume para mostrar "Solicitud rechazada" + motivo.
  PlanRejectionPayload? _pendingPlanRejection;
  PlanRejectionPayload? get pendingPlanRejection => _pendingPlanRejection;

  void setPendingPlanRejection(PlanRejectionPayload payload) {
    _pendingPlanRejection = payload;
    notifyListeners();
  }

  void clearPlanRejection() {
    _pendingPlanRejection = null;
    notifyListeners();
  }

  // ── Login / Logout ─────────────────────────────────────────

  Future<bool> login(
    String email,
    String password, {
    bool rememberSession = false,
  }) async {
    _isGuest = false;
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.login(email: email, password: password);

    result.when(
      success: (user) {
        _user = user;
        _needsOnboarding = (user.role == null || user.role.isEmpty);
      },
      failure: (e) => _error = e.message,
    );

    // Limpiar estado de cuenta anterior antes de sincronizar nueva.
    if (result.isSuccess && _user != null) {
      _providerProfiles.clear();
      _activeProfileType = null;
      _providerVerificationStatus = null;
      _verificationStatusByType.clear();
      _rejectionReasonByType.clear();
      await _syncProviderStatus();
      _connectSocketForUser(_user!.id);
    }

    // Guardar cuenta si el usuario lo solicitó.
    if (result.isSuccess && rememberSession && _user != null) {
      final accessToken = await AuthLocalStorage.getAccessToken();
      final refreshToken = await AuthLocalStorage.getRefreshToken();
      if (accessToken != null && refreshToken != null) {
        final saveResult = await SavedAccountsStorage.addOrUpdate(
          SavedAccount(
            userId: _user!.id,
            email: email,
            firstName: _user!.firstName,
            lastName: _user!.lastName,
            accessToken: accessToken,
            refreshToken: refreshToken,
          ),
        );
        if (saveResult == SaveAccountResult.limitReached) {
          _savedAccountLimitReached = true;
        }
      }
    }

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  Future<bool> loginWithSocial(String idToken) async {
    _isGuest = false;
    _isLoading = true;
    _error = null;
    // Limpia flags transitorios de un intento previo (p. ej. una
    // registración manual que quedó pendiente de OTP). Sin esto, el
    // flag `_needsEmailVerification` sobrevivía al cambio de método y
    // la app mandaba al OTP screen aunque el social-login fuera nuevo.
    _needsEmailVerification = false;
    _needsOnboarding = false;
    _registration?.clearPendingRegistration();
    notifyListeners();

    final result = await _repo.socialLogin(idToken);

    result.when(
      success: (data) {
        _user = data.user;
        // Nuevo usuario → ir a OnboardingScreen para elegir rol/tipo de cuenta.
        _needsOnboarding = data.isNewUser || (data.user.role.isEmpty);
        // Solo los usuarios sociales recién creados llevan el dummy hash —
        // ofrecérles setear su contraseña propia. Si el user ya existía
        // (login social vinculado a cuenta vieja), no muestra el prompt.
        _socialAccountNeedsPassword = data.isNewUser;
      },
      failure: (e) => _error = e.message,
    );

    if (result.isSuccess && _user != null) {
      _providerProfiles.clear();
      _activeProfileType = null;
      _providerVerificationStatus = null;
      _verificationStatusByType.clear();
      _rejectionReasonByType.clear();
      // Forzar carga completa del perfil (incluye department/province/
      // district que el endpoint /auth/social-login no devuelve).
      final freshUser = await _repo.getCurrentUser();
      freshUser.when(
        success: (u) => _user = u,
        // Notificar igual: la sesión básica ya está creada (data.user);
        // si el fetch extendido falla, la UI debe reaccionar al menos
        // a los datos del social-login.
        failure: (_) => notifyListeners(),
      );
      await _syncProviderStatus();
      _connectSocketForUser(_user!.id);
    }

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  /// true cuando el último intento de guardar cuenta falló por límite (máx. 3).
  bool _savedAccountLimitReached = false;
  bool get savedAccountLimitReached => _savedAccountLimitReached;

  /// true cuando el último social-login creó una cuenta nueva — la app
  /// debe ofrecerle al usuario establecer una contraseña propia para
  /// que después pueda hacer login manual o cambiarla. main.dart escucha
  /// este flag y empuja la pantalla `SetupPasswordScreen`. La limpieza
  /// es responsabilidad del consumidor con [clearSocialPasswordPrompt].
  bool _socialAccountNeedsPassword = false;
  bool get socialAccountNeedsPassword => _socialAccountNeedsPassword;

  void clearSocialPasswordPrompt() {
    _socialAccountNeedsPassword = false;
    notifyListeners();
  }

  /// Establece la contraseña por primera vez para una cuenta creada via
  /// social-login. Falla silenciosa: el error queda en `_error`.
  Future<bool> setupPassword(String newPassword) async {
    final result = await _repo.setupPassword(newPassword);
    return result.when(
      success: (_) => true,
      failure: (e) {
        _error = e.message;
        notifyListeners();
        return false;
      },
    );
  }

  String? get userRole => _user?.role;

  void clearSavedAccountLimitFlag() {
    _savedAccountLimitReached = false;
    notifyListeners();
  }

  /// Inicia sesión desde una cuenta guardada en el dispositivo sin contraseña.
  Future<bool> loginFromSaved(SavedAccount account) async {
    _isGuest = false;
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.loginFromSaved(account);

    result.when(
      success: (user) {
        _user = user;
        _needsOnboarding = false;
      },
      failure: (e) => _error = e.message,
    );

    if (result.isSuccess && _user != null) {
      _providerProfiles.clear();
      _activeProfileType = null;
      _providerVerificationStatus = null;
      _verificationStatusByType.clear();
      _rejectionReasonByType.clear();
      await _syncProviderStatus();
      _connectSocketForUser(_user!.id);
    }

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  Future<bool> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    _isGuest = false;
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.register(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
    );

    result.when(
      success: (data) {
        final pendingId = data['pendingId'] as String?;
        if (pendingId != null) {
          _registration?.setPending(pendingId: pendingId, email: email);
        }
        _needsEmailVerification = true;
      },
      failure: (e) => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  @override
  Future<void> logout() async {
    // Desregistrar listeners antes de limpiar _user para evitar doble trigger.
    SocketService.instance.removeDeactivationListener(
      _handleRemoteDeactivation,
    );
    SocketService.instance.removeNotificationListener(
      _handleRemoteNotification,
    );
    SocketService.instance.disconnect();

    // Limpiar token FCM (backend + Firebase) ANTES de invalidar el
    // access token, para que la petición DELETE viaje con la cookie/JWT
    // vigente. Falla silenciosa: si no hay red o la respuesta es 401,
    // igual seguimos con el logout local.
    unawaited(FcmService.instance.clearToken());

    // Limpiar estado local inmediatamente → UI navega a WelcomeScreen
    // sin esperar red.
    _user = null;
    _isGuest = false;
    _needsOnboarding = false;
    _needsEmailVerification = false;
    _error = null;
    _providerProfiles.clear();
    _activeProfileType = null;
    _providerVerificationStatus = null;
    _verificationStatusByType.clear();
    _rejectionReasonByType.clear();
    notifyListeners();

    // Invalidar tokens en el servidor en segundo plano.
    _repo.logout().ignore();
  }

  // ── Perfil del usuario ─────────────────────────────────────

  /// Guarda la ubicación del usuario en el backend y actualiza el
  /// estado local.
  Future<bool> updateLocation({
    required String department,
    required String province,
    required String district,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.updateProfile(
      department: department,
      province: province,
      district: district,
    );

    result.when(
      success: (userData) {
        _user = _user?.copyWith(
          department: department,
          province: province,
          district: district,
        );
        // Persistir cambio en almacenamiento local.
        AuthLocalStorage.getAccessToken().then((at) async {
          final rt = await AuthLocalStorage.getRefreshToken();
          if (at != null && rt != null && _user != null) {
            await AuthLocalStorage.saveSession(
              accessToken: at,
              refreshToken: rt,
              user: _user!,
            );
          }
        });
      },
      failure: (e) => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  void completeOnboarding({required String role}) async {
    _needsOnboarding = false;
    final userRole = 'USUARIO';

    if (role == 'OFICIO' || role == 'NEGOCIO') {
      _providerProfiles.add(role);
      _verificationStatusByType[role] = 'PENDIENTE';
      _activeProfileType = role;
    }

    _user = _user?.copyWith(role: userRole);

    // PERSISTENCIA INMEDIATA
    final at = await AuthLocalStorage.getAccessToken();
    final rt = await AuthLocalStorage.getRefreshToken();
    if (at != null && rt != null && _user != null) {
      await AuthLocalStorage.saveSession(
        accessToken: at,
        refreshToken: rt,
        user: _user!,
      );
    }

    notifyListeners();
  }

  /// Agrega un perfil de proveedor adicional (mismo usuario, segundo perfil).
  void addProviderProfile({required String type}) {
    _providerProfiles.add(type);
    _verificationStatusByType[type] = 'PENDIENTE';
    _activeProfileType = type;
    // El rol permanece el que ya tenía (no elevarlo hasta la aprobación).
    notifyListeners();
  }

  /// Cambia el perfil activo entre OFICIO y NEGOCIO.
  void switchProfile(String type) {
    if (_providerProfiles.contains(type)) {
      _activeProfileType = type;
      notifyListeners();
    }
  }

  /// Actualiza nombre, apellido y/o teléfono del usuario.
  Future<bool> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.updateProfile(
      firstName: firstName,
      lastName: lastName,
      phone: phone,
    );

    result.when(
      success: (updated) {
        _user = _user?.copyWith(
          firstName: updated.firstName,
          lastName: updated.lastName,
          phone: updated.phone,
        );
        // Persistir cambios localmente.
        if (_user != null) {
          AuthLocalStorage.getAccessToken().then((at) async {
            final rt = await AuthLocalStorage.getRefreshToken();
            if (at != null && rt != null) {
              await AuthLocalStorage.saveSession(
                accessToken: at,
                refreshToken: rt,
                user: _user!,
              );
            }
          });
        }
      },
      failure: (e) => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  /// Sube una nueva foto de perfil y actualiza el modelo local.
  Future<bool> updateProfilePicture(File image) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.updateProfilePicture(image);

    result.when(
      success: (avatarUrl) {
        _user = _user?.copyWith(avatarUrl: avatarUrl);
        if (_user != null) {
          AuthLocalStorage.getAccessToken().then((at) async {
            final rt = await AuthLocalStorage.getRefreshToken();
            if (at != null && rt != null) {
              await AuthLocalStorage.saveSession(
                accessToken: at,
                refreshToken: rt,
                user: _user!,
              );
            }
          });
        }
      },
      failure: (e) => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  /// Cambia la contraseña del usuario autenticado.
  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.changePassword(
      currentPassword: currentPassword,
      newPassword: newPassword,
    );

    result.when(success: (_) {}, failure: (e) => _error = e.message);

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  /// Compat: delega al RegistrationProvider adjunto.
  void clearPendingRegistration() {
    _registration?.clearPendingRegistration();
  }

  Future<void> refreshUser() async {
    final result = await _repo.getCurrentUser();
    result.when(
      success: (u) {
        _user = u;
        notifyListeners();
      },
      // Notificar igual en fallo: si _user ya estaba seteado (login
      // previo), los listeners reciben el dato cacheado en lugar de
      // quedarse congelados.
      failure: (_) => notifyListeners(),
    );
  }
}
