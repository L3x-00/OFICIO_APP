import 'package:flutter/material.dart';
import '../../data/auth_repository.dart';
import '../../domain/models/user_model.dart';
import '../../../../core/errors/failures.dart';

class AuthProvider extends ChangeNotifier {
  final _repo = AuthRepository();

  UserModel? _user;
  bool _isLoading = false;
  bool _isInitialized = false;
  String? _error;

  // Getters
  UserModel? get user       => _user;
  bool get isLoading        => _isLoading;
  bool get isAuthenticated  => _user != null;
  bool get isInitialized    => _isInitialized;
  String? get error         => _error;

  // ── Inicializar — llamar al arrancar la app ───────────────
  Future<void> initialize() async {
    _user = await _repo.restoreSession();
    _isInitialized = true;
    notifyListeners();
  }

  // ── Login ─────────────────────────────────────────────────
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _repo.login(email: email, password: password);

    result.when(
      success: (user) => _user = user,
      failure: (e)    => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();

    return result.isSuccess;
  }

  // ── Registro ──────────────────────────────────────────────
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
      email:     email,
      password:  password,
      firstName: firstName,
      lastName:  lastName,
      phone:     phone,
    );

    result.when(
      success: (user) => _user = user,
      failure: (e)    => _error = e.message,
    );

    _isLoading = false;
    notifyListeners();

    return result.isSuccess;
  }

  // ── Logout ────────────────────────────────────────────────
  Future<void> logout() async {
    await _repo.logout();
    _user = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}