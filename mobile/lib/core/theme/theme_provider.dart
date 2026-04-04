import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _kThemeKey = 'app_theme_is_dark';

/// Gestiona el modo de tema (oscuro/claro) con persistencia.
class ThemeProvider extends ChangeNotifier {
  static const _storage = FlutterSecureStorage();

  ThemeMode _mode = ThemeMode.dark; // Por defecto: oscuro

  ThemeMode get mode    => _mode;
  bool      get isDark  => _mode == ThemeMode.dark;

  /// Carga la preferencia guardada al iniciar la app.
  Future<void> initialize() async {
    try {
      final saved = await _storage.read(key: _kThemeKey);
      // Si el usuario guardó explícitamente 'false' (tema claro), úsalo
      if (saved == 'false') {
        _mode = ThemeMode.light;
        notifyListeners();
      }
    } catch (_) {
      // Continúa con el valor por defecto si hay error de lectura
    }
  }

  /// Alterna entre claro y oscuro, persiste la preferencia.
  Future<void> toggle() async {
    _mode = isDark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
    try {
      await _storage.write(key: _kThemeKey, value: isDark ? 'true' : 'false');
    } catch (_) {}
  }

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
