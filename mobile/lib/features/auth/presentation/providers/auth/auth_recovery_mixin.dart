part of '../auth_provider.dart';

/// Flujos temporales/transitorios: OTP de registro, forgot/reset
/// password. Comparte el library con AuthProvider via `part of` para
/// alcanzar el estado privado (_user, _registration, _isLoading, etc.).
mixin AuthRecoveryMixin on ChangeNotifier {
  // ── Hooks que la clase concreta provee ─────────────────────
  UserModel? get _user;
  set _user(UserModel? v);
  set _isLoading(bool v);
  set _error(String? v);
  set _needsEmailVerification(bool v);
  set _needsOnboarding(bool v);
  AuthRepository get _repo;
  RegistrationProvider? get _registration;
  String? get _pendingRegistrationId;

  Future<void> _connectSocketForUser(int userId);

  // ── OTP ────────────────────────────────────────────────────

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

  /// Verifica el código OTP del registro pendiente. Crea sesión
  /// completa si es válido.
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
          _registration?.clearPendingRegistration();
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

  /// Reenvía OTP para el registro pendiente. Delegado a
  /// RegistrationProvider.
  Future<bool> resendOtp() async {
    final reg = _registration;
    if (reg == null) return false;
    return reg.resendOtp();
  }

  // ── Forgot / Reset password ───────────────────────────────

  /// Solicita el envío del código de recuperación. Devuelve el token
  /// de dev si está disponible.
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
}
