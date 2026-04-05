import 'dart:io';
import 'package:flutter/material.dart';
import '../../data/auth_repository.dart';
import '../../data/auth_local_storage.dart';
import '../../data/saved_accounts_storage.dart';
import '../../domain/models/user_model.dart';
import '../../../../core/errors/failures.dart';

/// Estado de navegación del usuario
enum AppNavigationState {
  loading,         // Verificando sesión guardada
  unauthenticated, // Sin sesión
  guest,           // Navega como invitado (sin cuenta)
  needsOnboarding, // Registrado pero sin elegir rol
  authenticated,   // Listo para usar la app
}

class AuthProvider extends ChangeNotifier {
  final _repo = AuthRepository();

  UserModel? _user;
  bool _isInitialized = false;
  bool _needsOnboarding = false;
  bool _isGuest = false;
  String? _error;
  bool _isLoading = false;

  // ── Multi-perfil de proveedor ─────────────────────────────
  // Almacena los tipos de perfil que tiene el usuario: 'OFICIO', 'NEGOCIO'
  final Set<String> _providerProfiles = {};
  String? _activeProfileType;
  // Estado de verificación sincronizado con el backend
  String? _providerVerificationStatus; // 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null && !_needsOnboarding;
  bool get isGuest => _isGuest;
  bool get needsOnboarding => _needsOnboarding;
  bool get isInitialized => _isInitialized;
  String? get error => _error;

  Set<String> get providerProfiles          => Set.unmodifiable(_providerProfiles);
  String?     get activeProfileType         => _activeProfileType;
  String?     get providerVerificationStatus => _providerVerificationStatus;
  bool get hasOficioProfile  => _providerProfiles.contains('OFICIO');
  bool get hasNegocioProfile => _providerProfiles.contains('NEGOCIO');
  /// true cuando el usuario tiene al menos un perfil de proveedor APROBADO
  bool get hasApprovedProvider => _providerVerificationStatus == 'APROBADO';

  /// Estado calculado para la navegación
  AppNavigationState get navigationState {
    if (!_isInitialized) return AppNavigationState.loading;
    if (_user == null && _isGuest) return AppNavigationState.guest;
    if (_user == null) return AppNavigationState.unauthenticated;
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
    // Si hay sesión activa, sincronizar el estado del proveedor con el backend
    if (_user != null) {
      await _syncProviderStatus();
    }
    _isInitialized = true;
    notifyListeners();
  }

  /// Sincroniza el estado del proveedor con el backend.
  /// Silencioso en caso de error (no crítico para el flujo principal).
  Future<void> _syncProviderStatus() async {
    final result = await _repo.getMyProviderStatus();
    result.when(
      success: (data) {
        if (data['hasProvider'] == true) {
          final profiles = data['profiles'] as List<dynamic>? ?? [];
          _providerProfiles.clear();
          _providerVerificationStatus = null;

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

            // Priorizar estado APROBADO; si ninguno aprobado, mostrar el último
            final status = profile['verificationStatus'] as String?;
            if (_providerVerificationStatus == null || status == 'APROBADO') {
              _providerVerificationStatus = status;
            }
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

    // Sincronizar perfiles de proveedor tras un login exitoso
    if (result.isSuccess && _user != null) {
      await _syncProviderStatus();
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

  /// true cuando el último intento de guardar cuenta falló por límite (máx. 3)
  bool _savedAccountLimitReached = false;
  bool get savedAccountLimitReached => _savedAccountLimitReached;
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
      success: (user) {
        _user = user;
        _needsOnboarding = true; // Nuevo registro siempre pasa por onboarding
      },
      failure: (e) => _error = e.message,
    );

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
    String? dni,
    String? description,
    String? address,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.registerProvider(
      businessName: businessName,
      phone:        phone,
      type:         type,
      dni:          dni,
      description:  description,
      address:      address,
    );

    result.when(
      success: (_) {
        // Actualizar rol localmente; el onboarding finaliza en completeOnboarding()
        _user = _user?.copyWith(role: 'PROVEEDOR');
      },
      failure: (e) => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();
    return result.isSuccess;
  }

  /// Llamado desde OnboardingScreen cuando el usuario elige su rol
  void completeOnboarding({required String role}) {
    _needsOnboarding = false;
    final userRole = (role == 'OFICIO' || role == 'NEGOCIO') ? 'PROVEEDOR' : 'USUARIO';
    if (role == 'OFICIO' || role == 'NEGOCIO') {
      _providerProfiles.add(role);
      _activeProfileType = role;
    }
    _user = _user?.copyWith(role: userRole);
    // Persistir rol actualizado para que sobreviva reinicios de la app
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
    notifyListeners();
  }

  /// Agrega un perfil de proveedor adicional (mismo usuario, segundo perfil)
  void addProviderProfile({required String type}) {
    _providerProfiles.add(type);
    _activeProfileType = type;
    _user = _user?.copyWith(role: 'PROVEEDOR');
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
    await _repo.logout();
    _user = null;
    _isGuest = false;
    _needsOnboarding = false;
    _error = null;
    _providerProfiles.clear();
    _activeProfileType = null;
    _providerVerificationStatus = null;
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
}
