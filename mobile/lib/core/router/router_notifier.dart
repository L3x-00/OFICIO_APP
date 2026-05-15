import 'package:flutter/foundation.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';

/// Puente entre [AuthProvider] y `GoRouter.refreshListenable`.
///
/// GoRouter no puede escuchar al `AuthProvider` directamente (vive en el
/// árbol de widgets); este notifier reenvía sus cambios para que el
/// router recalcule la redirección global cuando el estado cambia
/// (login, logout, verificación de email, onboarding).
class RouterNotifier extends ChangeNotifier {
  final AuthProvider auth;

  RouterNotifier(this.auth) {
    auth.addListener(_onAuthChanged);
  }

  void _onAuthChanged() => notifyListeners();

  @override
  void dispose() {
    auth.removeListener(_onAuthChanged);
    super.dispose();
  }
}
