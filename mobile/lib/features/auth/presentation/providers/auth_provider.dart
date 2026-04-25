import 'dart:io';
import 'package:flutter/material.dart';
import '../../data/auth_repository.dart';
import '../../data/auth_local_storage.dart';
import '../../data/saved_accounts_storage.dart';
import '../../domain/models/user_model.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/network/socket_service.dart';

/// Estado de navegación del usuario
enum AppNavigationState {
  loading,                // Verificando sesión guardada
  unauthenticated,        // Sin sesión
  guest,                  // Navega como invitado (sin cuenta)
  needsEmailVerification, // Registrado pero email no verificado
  needsOnboarding,        // Email verificado pero sin elegir rol
  authenticated,          // Listo para usar la app
}

class TrustRejectionPayload {
  final String reason;
  final String profileType;
  final String? rejectedAt;
  const TrustRejectionPayload({required this.reason, required this.profileType, this.rejectedAt});
}

class AuthProvider extends ChangeNotifier {
  final _repo = AuthRepository();

  UserModel? _user;
  bool _isInitialized = false;
  bool _needsOnboarding = false;
  bool _needsEmailVerification = false;
  bool _isGuest = false;
  String? _error;
  bool _isLoading = false;

  // Registro pendiente: guardados hasta que el OTP sea verificado
  String? _pendingRegistrationId;
  String? _pendingEmail; // para mostrar en pantalla OTP

  String? get pendingEmail => _pendingEmail;

  /// true cuando el servidor notificó que esta cuenta fue desactivada.
  /// _AppRoot escucha este flag para mostrar el diálogo de desactivación.
  bool _wasDeactivated = false;
  bool get wasDeactivated => _wasDeactivated;

  void clearDeactivatedFlag() {
    _wasDeactivated = false;
    notifyListeners();
  }

  // ── Multi-perfil de proveedor ─────────────────────────────
  // Almacena los tipos de perfil que tiene el usuario: 'OFICIO', 'NEGOCIO'
  final Set<String> _providerProfiles = {};
  String? _activeProfileType;
  // Estado de verificación sincronizado con el backend
  String? _providerVerificationStatus; // 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  // Estado y motivo de rechazo por tipo de perfil
  final Map<String, String>              _verificationStatusByType = {}; // tipo → status
  final Map<String, String>              _rejectionReasonByType    = {}; // tipo → motivo
  final Map<String, Map<String, dynamic>> _providerDataByType      = {}; // tipo → datos completos

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null && !_needsOnboarding && !_needsEmailVerification;
  bool get isGuest => _isGuest;
  bool get needsOnboarding => _needsOnboarding;
  bool get needsEmailVerification => _needsEmailVerification;
  bool get isInitialized => _isInitialized;
  String? get error => _error;

  Set<String> get providerProfiles          => Set.unmodifiable(_providerProfiles);
  String?     get activeProfileType         => _activeProfileType;
  String?     get providerVerificationStatus => _providerVerificationStatus;
  bool get hasOficioProfile  => _providerProfiles.contains('OFICIO');
  bool get hasNegocioProfile => _providerProfiles.contains('NEGOCIO');
  /// true cuando el usuario tiene al menos un perfil de proveedor APROBADO
  bool get hasApprovedProvider =>
      _verificationStatusByType.values.any((s) => s == 'APROBADO');

  /// Devuelve el status de verificación para un tipo específico ('OFICIO'|'NEGOCIO')
  String? verificationStatusFor(String type) => _verificationStatusByType[type];

  /// Devuelve el motivo de rechazo para un tipo específico (null si no fue rechazado)
  String? rejectionReasonFor(String type) => _rejectionReasonByType[type];

  /// Devuelve los datos completos del perfil de proveedor para pre-llenar el formulario
  Map<String, dynamic>? providerDataFor(String type) => _providerDataByType[type];

  /// Devuelve true si el usuario autenticado puede registrar un nuevo perfil
  /// del tipo dado ('OFICIO' o 'NEGOCIO') — es decir, aún no lo tiene.
  bool canBecomeRole(String type) => !_providerProfiles.contains(type);

  /// true si al menos uno de los tipos de proveedor está disponible para registrar.
  bool get canBecomeAnyProvider =>
      canBecomeRole('OFICIO') || canBecomeRole('NEGOCIO');

  /// Estado calculado para la navegación
  AppNavigationState get navigationState {
    if (!_isInitialized) return AppNavigationState.loading;
    if (_user == null && _isGuest) return AppNavigationState.guest;
    if (_user == null) return AppNavigationState.unauthenticated;
    if (_needsEmailVerification) return AppNavigationState.needsEmailVerification;
    if (_needsOnboarding) return AppNavigationState.needsOnboarding;
    return AppNavigationState.authenticated;
  }

  /// Permite navegar la app sin registrarse
  void browseAsGuest() {
    _isGuest = true;
    notifyListeners();
  }

  Future<void> initialize() async {
    _user = await _repo.restoreSession();
    if (_user != null) {
      await _syncProviderStatus();
      _connectSocketForUser(_user!.id);
    }
    _isInitialized = true;
    notifyListeners();
  }

  // ── Socket ─────────────────────────────────────────────────

  void _connectSocketForUser(int userId) {
    final socket = SocketService.instance;
    // Siempre re-registrar listeners (pueden haber sido limpiados en logout anterior)
    socket.removeDeactivationListener(_handleRemoteDeactivation);
    socket.removeNotificationListener(_handleRemoteNotification);
    socket.addDeactivationListener(_handleRemoteDeactivation);
    socket.addNotificationListener(_handleRemoteNotification);
    // Forzar reconexión con la sala correcta cada vez que cambia el userId
    socket.reconnectForUser(DioClient.baseUrl, userId);
  }

  /// Callback que el SocketService invoca cuando el servidor emite
  /// `userDeactivated` con el userId de esta sesión.
  void _handleRemoteDeactivation(int userId) {
    if (_user?.id != userId) return;
    _wasDeactivated = true;
    // logout() es async pero no necesitamos await aquí;
    // la UI reacciona al cambio de navigationState.
    logout();
  }

  /// Callback que el SocketService invoca cuando el servidor emite
  /// el evento `notification` genérico.
  /// Filtra por targetUserId y reacciona a PROVIDER_APPROVED / PROVIDER_REJECTED.
  void _handleRemoteNotification(Map<String, dynamic> payload) {
    // Comparación type-safe: el socket puede enviar int o double para userId
    final rawTargetId = payload['targetUserId'];
    if (rawTargetId != null) {
      final targetId = rawTargetId is int
          ? rawTargetId
          : int.tryParse(rawTargetId.toString().replaceAll('.0', ''));
      if (targetId != _user?.id) return;
    }

    final type = payload['type'] as String?;

    if (type == 'PLAN_APROBADO' || type == 'PLAN_RECHAZADO') {
      final targetProfileType = payload['targetProfileType'] as String?;
      if (targetProfileType != null && targetProfileType != _activeProfileType) return;
      _syncProviderStatus().then((_) {
        if (type == 'PLAN_APROBADO') {
          _pendingPlanPromotion = payload['title'] as String? ?? '¡Has sido promovido!';
        }
        notifyListeners();
      });
      return;
    }

    if (type == 'PROVIDER_APPROVED') {
      // Sincronizar estado Y refrescar token para que el JWT tenga role:PROVEEDOR
      _syncProviderStatus().then((_) async {
        await _refreshUserToken();
        notifyListeners();
      });
      return;
    }

    if (type == 'PROVIDER_REJECTED') {
      _syncProviderStatus().then((_) => notifyListeners());
      return;
    }

    if (type == 'TRUST_APPROVED' || type == 'TRUST_REJECTED') {
      _syncProviderStatus().then((_) {
        if (type == 'TRUST_REJECTED') {
          _pendingTrustRejection = TrustRejectionPayload(
            reason: payload['body'] as String? ?? '',
            profileType: payload['targetProfileType'] as String? ?? 'OFICIO',
            rejectedAt: payload['rejectedAt'] as String?,
          );
        }
        notifyListeners();
      });
    }
  }

  /// Refresca el access token para que el JWT refleje el nuevo rol (PROVEEDOR).
  /// Silencioso en caso de error.
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

  // ── Trust rejection overlay ───────────────────────────────
  TrustRejectionPayload? _pendingTrustRejection;
  TrustRejectionPayload? get pendingTrustRejection => _pendingTrustRejection;

  void clearTrustRejection() {
    _pendingTrustRejection = null;
    notifyListeners();
  }

  // ── Plan promotion overlay ────────────────────────────────
  String? _pendingPlanPromotion;
  String? get pendingPlanPromotion => _pendingPlanPromotion;

  void clearPlanPromotion() {
    _pendingPlanPromotion = null;
    notifyListeners();
  }

  /// Sincroniza el estado del proveedor con el backend.
  /// También refresca el rol del usuario para reflejar aprobaciones/rechazos.
  /// Silencioso en caso de error (no crítico para el flujo principal).
  Future<void> _syncProviderStatus() async {
    final result = await _repo.getMyProviderStatus();
    result.when(
      success: (data) {
        if (data['hasProvider'] == true) {
          final profiles = data['profiles'] as List<dynamic>? ?? [];
          _providerProfiles.clear();
          _providerVerificationStatus = null;
          _verificationStatusByType.clear();
          _rejectionReasonByType.clear();
          _providerDataByType.clear();

          bool hasAnyApproved = false;

          for (final raw in profiles) {
            final profile = raw as Map<String, dynamic>;
            final rawType = profile['type'] as String? ?? 'OFICIO';
            // Mapear alias del backend a tipos canónicos internos
            final internalType = switch (rawType) {
              'PROFESSIONAL' => 'OFICIO',
              'BUSINESS'     => 'NEGOCIO',
              _              => rawType,
            };
            _providerProfiles.add(internalType);
            _activeProfileType ??= internalType;
            _providerDataByType[internalType] = profile;

            // Priorizar estado APROBADO; si ninguno aprobado, mostrar el último
            final status = profile['verificationStatus'] as String?;
            if (_providerVerificationStatus == null || status == 'APROBADO') {
              _providerVerificationStatus = status;
            }
            if (status == 'APROBADO') hasAnyApproved = true;

            // Guardar estado por tipo para que el banner muestre PENDIENTE vs RECHAZADO
            if (status != null) _verificationStatusByType[internalType] = status;

            // Si fue rechazado, extraer el motivo de la primera notificación RECHAZADO
            if (status == 'RECHAZADO') {
              final notifications = profile['pendingNotifications'] as List<dynamic>? ?? [];
              final rejectionNotif = notifications.firstWhere(
                (n) => (n as Map<String, dynamic>)['type'] == 'RECHAZADO',
                orElse: () => null,
              );
              if (rejectionNotif != null) {
                final msg = (rejectionNotif as Map<String, dynamic>)['message'] as String? ?? '';
                // Extraer el motivo después de "Motivo: "
                final idx = msg.indexOf('Motivo: ');
                _rejectionReasonByType[internalType] =
                    idx >= 0 ? msg.substring(idx + 8) : msg;
              }
            }
          }

          // Sincronizar el rol local del usuario con el que el backend asignó
          // (el admin lo eleva a PROVEEDOR al aprobar, o lo baja a USUARIO al rechazar)
          if (_user != null) {
            final expectedRole = hasAnyApproved ? 'PROVEEDOR' : 'USUARIO';
            if (_user!.role != expectedRole) {
              _user = _user!.copyWith(role: expectedRole);
            }
          }
        } else {
          // Sin perfiles — limpiar TODOS los mapas para evitar contaminación multicuentas
          _providerProfiles.clear();
          _activeProfileType = null;
          _providerVerificationStatus = null;
          _verificationStatusByType.clear();
          _rejectionReasonByType.clear();
          _providerDataByType.clear();
          if (_user != null && _user!.role == 'PROVEEDOR') {
            _user = _user!.copyWith(role: 'USUARIO');
          }
        }
      },
      failure: (_) {}, // Silencioso
      
    );
    
  }

  Future<bool> login(String email, String password, {bool rememberSession = false}) async {
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

    // Limpiar estado de cuenta anterior antes de sincronizar nueva
    if (result.isSuccess && _user != null) {
      _providerProfiles.clear();
      _activeProfileType = null;
      _providerVerificationStatus = null;
      _verificationStatusByType.clear();
      _rejectionReasonByType.clear();
      await _syncProviderStatus();
      _connectSocketForUser(_user!.id);
    }

    // Guardar cuenta si el usuario lo solicitó
    if (result.isSuccess && rememberSession && _user != null) {
      final accessToken  = await AuthLocalStorage.getAccessToken();
      final refreshToken = await AuthLocalStorage.getRefreshToken();
      if (accessToken != null && refreshToken != null) {
        final saveResult = await SavedAccountsStorage.addOrUpdate(SavedAccount(
          userId:       _user!.id,
          email:        email,
          firstName:    _user!.firstName,
          lastName:     _user!.lastName,
          accessToken:  accessToken,
          refreshToken: refreshToken,
        ));
        if (saveResult == SaveAccountResult.limitReached) {
          _savedAccountLimitReached = true;
        }
      }
    }

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  // ── LOGIN SOCIAL ────────────────────────────────────────
  Future<bool> loginWithSocial(String idToken) async {
    _isGuest = false;
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.socialLogin(idToken);

    result.when(
      success: (user) {
        _user = user;
        _needsOnboarding = (user.role == null || user.role.isEmpty);
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

  /// true cuando el último intento de guardar cuenta falló por límite (máx. 3)
  bool _savedAccountLimitReached = false;
  bool get savedAccountLimitReached => _savedAccountLimitReached;

  String? get userRole => null;
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
        _pendingRegistrationId = data['pendingId'] as String?;
        _pendingEmail = email;
        _needsEmailVerification = true;
      },
      failure: (e) => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  /// Envía (o reenvía) el código OTP al email del usuario actual.
  Future<bool> sendOtp() async {
    if (_user == null) return false;
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.sendOtp(_user!.id);

    result.when(
      success: (_) {},
      failure: (e) => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  /// Verifica el código OTP del registro pendiente. Crea sesión completa si es válido.
  Future<bool> verifyOtp(String code) async {
    if (_pendingRegistrationId == null) {
      _error = 'No hay registro pendiente. Vuelve a registrarte.';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _repo.verifyOtp(
        pendingId: _pendingRegistrationId!,
        code: code,
      );

      result.when(
        success: (user) {
          _user = user;
          _pendingRegistrationId = null;
          _pendingEmail = null;
          _needsEmailVerification = false;
          _needsOnboarding = true;
          _connectSocketForUser(user.id);
          notifyListeners();
        },
        failure: (e) => _error = e.message,
      );

      _isLoading = false;
      notifyListeners();
      return result.isSuccess;

    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Reenvía OTP para registro pendiente.
  Future<bool> resendOtp() async {
    if (_pendingRegistrationId == null) return false;
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.resendOtp(_pendingRegistrationId!);
    result.when(success: (_) {}, failure: (e) => _error = e.message);

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }
  

  /// Registra el perfil de proveedor en el backend y actualiza el estado local.
  /// Devuelve true si se creó con éxito, false si hubo error (ver [error]).
  Future<bool> registerProvider({
    required String businessName,
    required String phone,
    required String type,
    String? whatsapp,
    // OFICIO
    String? dni,
    // NEGOCIO
    String? ruc,
    String? nombreComercial,
    String? razonSocial,
    bool hasDelivery = false,
    bool plenaCoordinacion = false,
    // comunes
    String? description,
    String? address,
    int? categoryId,
    Map<String, dynamic>? scheduleJson,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.registerProvider(
      businessName:     businessName,
      phone:            phone,
      type:             type,
      whatsapp:         whatsapp,
      dni:              dni,
      ruc:              ruc,
      nombreComercial:  nombreComercial,
      razonSocial:      razonSocial,
      hasDelivery:      hasDelivery,
      plenaCoordinacion: plenaCoordinacion,
      description:      description,
      address:          address,
      categoryId:       categoryId,
      scheduleJson:     scheduleJson,
    );

    result.when(
      success: (_) {
        // El rol sigue siendo USUARIO hasta que el admin apruebe.
        // Solo actualizamos el estado de perfiles (pendiente).
      },
      failure: (e) => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  /// Guarda la ubicación del usuario en el backend y actualiza el estado local.
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
      province:   province,
      district:   district,
    );

    result.when(
      success: (userData) {
        _user = _user?.copyWith(
          department: department,
          province:   province,
          district:   district,
        );
        // Persistir cambio en almacenamiento local
        AuthLocalStorage.getAccessToken().then((at) async {
          final rt = await AuthLocalStorage.getRefreshToken();
          if (at != null && rt != null && _user != null) {
            await AuthLocalStorage.saveSession(
              accessToken: at, refreshToken: rt, user: _user!,
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
    
    notifyListeners(); // Ahora sí, el estado es sólido
  }

  /// Agrega un perfil de proveedor adicional (mismo usuario, segundo perfil)
  void addProviderProfile({required String type}) {
    _providerProfiles.add(type);
    _verificationStatusByType[type] = 'PENDIENTE';
    _activeProfileType = type;
    // El rol permanece el que ya tenía (no elevarlo hasta la aprobación)
    notifyListeners();
  }

  /// Cambia el perfil activo entre OFICIO y NEGOCIO
  void switchProfile(String type) {
    if (_providerProfiles.contains(type)) {
      _activeProfileType = type;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    // Desregistrar listeners antes de limpiar _user para evitar doble trigger
    SocketService.instance.removeDeactivationListener(_handleRemoteDeactivation);
    SocketService.instance.removeNotificationListener(_handleRemoteNotification);
    SocketService.instance.disconnect();

    await _repo.logout();
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
  }

  /// Actualiza nombre, apellido y/o teléfono del usuario.
  Future<bool> updateProfile({String? firstName, String? lastName, String? phone}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.updateProfile(
      firstName: firstName,
      lastName:  lastName,
      phone:     phone,
    );

    result.when(
      success: (updated) {
        _user = _user?.copyWith(
          firstName: updated.firstName,
          lastName:  updated.lastName,
          phone:     updated.phone,
        );
        // Persisitir cambios localmente
        if (_user != null) {
          AuthLocalStorage.getAccessToken().then((at) async {
            final rt = await AuthLocalStorage.getRefreshToken();
            if (at != null && rt != null) {
              await AuthLocalStorage.saveSession(
                accessToken: at, refreshToken: rt, user: _user!,
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
                accessToken: at, refreshToken: rt, user: _user!,
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
      newPassword:     newPassword,
    );

    result.when(
      success: (_) {},
      failure: (e) => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  /// Solicita el envío del código de recuperación. Devuelve el token de dev si disponible.
  Future<Map<String, dynamic>?> forgotPassword(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    Map<String, dynamic>? responseData;
    final result = await _repo.forgotPassword(email);

    result.when(
      success: (data) => responseData = data,
      failure: (e)    => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return responseData;
  }

  /// Restablece la contraseña usando el código de 6 dígitos recibido.
  Future<bool> resetPassword({
    required String email,
    required String token,
    required String newPassword,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.resetPassword(
      email:       email,
      token:       token,
      newPassword: newPassword,
    );

    result.when(
      success: (_) {},
      failure: (e) => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
  void clearPendingRegistration() {
    _pendingRegistrationId = null;
    _pendingEmail = null;
    notifyListeners();
  }
}

