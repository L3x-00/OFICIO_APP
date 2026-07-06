import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _kThemeKey = 'app_theme_is_dark';

/// Gestiona el modo de tema con persistencia.
///
/// Por defecto SIGUE AL DISPOSITIVO (`ThemeMode.system`): si el teléfono está
/// en claro, la app abre en claro. Solo cuando el usuario toca el toggle se
/// guarda una preferencia explícita (dark/light) que pisa al sistema.
class ThemeProvider extends ChangeNotifier with WidgetsBindingObserver {
  static const _storage = FlutterSecureStorage();

  ThemeMode _mode = ThemeMode.system;

  ThemeProvider() {
    WidgetsBinding.instance.addObserver(this);
  }

  ThemeMode get mode => _mode;

  /// Brillo EFECTIVO: en modo system resuelve contra el brillo del dispositivo
  /// (los toggles de la UI muestran el estado real, no el enum).
  bool get isDark => switch (_mode) {
    ThemeMode.dark => true,
    ThemeMode.light => false,
    ThemeMode.system =>
      WidgetsBinding.instance.platformDispatcher.platformBrightness ==
          Brightness.dark,
  };

  /// En modo system, un cambio de tema del dispositivo debe refrescar los
  /// widgets que leen [isDark] (MaterialApp ya se re-tematiza solo).
  @override
  void didChangePlatformBrightness() {
    if (_mode == ThemeMode.system) notifyListeners();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Carga la preferencia guardada al iniciar la app. Sin preferencia
  /// explícita se queda en system (sigue al dispositivo).
  Future<void> initialize() async {
    try {
      final saved = await _storage.read(key: _kThemeKey);
      if (saved == 'true') {
        _mode = ThemeMode.dark;
        notifyListeners();
      } else if (saved == 'false') {
        _mode = ThemeMode.light;
        notifyListeners();
      }
    } catch (_) {
      // Continúa con el valor por defecto si hay error de lectura
    }
  }

  /// Alterna entre claro y oscuro (a partir del brillo efectivo actual) y
  /// persiste la elección explícita del usuario.
  Future<void> toggle() => setMode(isDark ? ThemeMode.light : ThemeMode.dark);

  /// Establece un modo específico.
  Future<void> setMode(ThemeMode mode) async {
    if (_mode == mode) return;
    _mode = mode;
    notifyListeners();
    try {
      await _storage.write(key: _kThemeKey, value: isDark ? 'true' : 'false');
    } catch (_) {}
  }
}
