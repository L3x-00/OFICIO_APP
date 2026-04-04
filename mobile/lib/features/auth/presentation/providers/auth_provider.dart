import 'package:flutter/material.dart';
import '../../data/auth_repository.dart';
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
  // TODO Hito 6: sincronizar con backend al iniciar sesión
  final Set<String> _providerProfiles = {};
  String? _activeProfileType;

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null && !_needsOnboarding;
  bool get isGuest => _isGuest;
  bool get needsOnboarding => _needsOnboarding;
  bool get isInitialized => _isInitialized;
  String? get error => _error;

  Set<String> get providerProfiles => Set.unmodifiable(_providerProfiles);
  String?     get activeProfileType => _activeProfileType;
  bool get hasOficioProfile  => _providerProfiles.contains('OFICIO');
  bool get hasNegocioProfile => _providerProfiles.contains('NEGOCIO');

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
    _isInitialized = true;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isGuest = false;
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.login(email: email, password: password);

    result.when(
      success: (user) {
        _user = user;
        // Si el usuario ya tiene un rol, no necesita onboarding
        _needsOnboarding = (user.role == null || user.role.isEmpty);
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
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
