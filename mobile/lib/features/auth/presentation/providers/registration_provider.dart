import 'package:flutter/foundation.dart';

import '../../../../core/errors/failures.dart';
import '../../data/auth_repository.dart';

/// Maneja exclusivamente el estado de un registro de usuario que está
/// pendiente de verificación de OTP. Antes vivía dentro del God Object
/// `AuthProvider`; al separarlo evitamos acoplar la sesión activa con
/// el flujo transitorio de "esperando OTP".
///
/// La verificación final del OTP (`verifyOtp`) sigue ocurriendo en
/// `AuthProvider` porque crea una sesión y conecta el socket — pero
/// AuthProvider lee `pendingId` desde aquí.
class RegistrationProvider extends ChangeNotifier {
  final AuthRepository _repo = AuthRepository();

  String? _pendingId;
  String? _pendingEmail;
  bool _isLoading = false;
  String? _error;

  String?  get pendingId    => _pendingId;
  String?  get pendingEmail => _pendingEmail;
  bool     get hasPending   => _pendingId != null;
  bool     get isLoading    => _isLoading;
  String?  get error        => _error;

  /// Llamado por `AuthProvider` tras un `register()` exitoso para guardar
  /// el ID retornado por el backend que identifica el registro pendiente.
  void setPending({required String pendingId, required String email}) {
    _pendingId    = pendingId;
    _pendingEmail = email;
    _error        = null;
    notifyListeners();
  }

  /// Borra todo el estado pendiente. Llamar al cancelar el registro o al
  /// completar la verificación.
  void clearPendingRegistration() {
    _pendingId    = null;
    _pendingEmail = null;
    _error        = null;
    notifyListeners();
  }

  /// Pide al backend que reenvíe el OTP usando el `pendingId` actual.
  /// Devuelve `true` si el reenvío fue aceptado.
  Future<bool> resendOtp() async {
    if (_pendingId == null) {
      _error = 'No hay registro pendiente.';
      notifyListeners();
      return false;
    }
    _isLoading = true;
    _error     = null;
    notifyListeners();

    final result = await _repo.resendOtp(_pendingId!);
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
