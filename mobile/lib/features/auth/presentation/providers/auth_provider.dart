import 'package:flutter/material.dart';
import '../../data/auth_repository.dart';
import '../../domain/models/user_model.dart';
import '../../../../core/errors/failures.dart';

/// Estado de navegación del usuario
enum AppNavigationState {
  loading, // Verificando sesión guardada
  unauthenticated, // Sin sesión
  needsOnboarding, // Registrado pero sin elegir rol
  authenticated, // Listo para usar la app
}

class AuthProvider extends ChangeNotifier {
  final _repo = AuthRepository();

  UserModel? _user;
  bool _isInitialized = false;
  bool _needsOnboarding = false;
  String? _error;
  bool _isLoading = false;

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null && !_needsOnboarding;
  bool get needsOnboarding => _needsOnboarding;
  bool get isInitialized => _isInitialized;
  String? get error => _error;

  /// Estado calculado para la navegación
  AppNavigationState get navigationState {
    if (!_isInitialized) return AppNavigationState.loading;
    if (_user == null) return AppNavigationState.unauthenticated;
    if (_needsOnboarding) return AppNavigationState.needsOnboarding;
    return AppNavigationState.authenticated;
  }

  Future<void> initialize() async {
    _user = await _repo.restoreSession();
    _isInitialized = true;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
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

  /// Llamado desde OnboardingScreen cuando el usuario elige su rol
  void completeOnboarding({required String role}) {
    _needsOnboarding = false;
    // Actualizar el rol local del usuario
    if (_user != null) {
      _user = UserModel(
        id: _user!.id,
        email: _user!.email,
        firstName: _user!.firstName,
        lastName: _user!.lastName,
        role: role == 'USUARIO' ? 'USUARIO' : 'PROVEEDOR',
        phone: _user!.phone,
        avatarUrl: _user!.avatarUrl,
      );
    }
    notifyListeners();
  }

  Future<void> logout() async {
    await _repo.logout();
    _user = null;
    _needsOnboarding = false;
    _error = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
