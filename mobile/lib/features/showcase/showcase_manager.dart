import 'package:shared_preferences/shared_preferences.dart';

/// Persistencia "primera vez" del tutorial de la pantalla principal.
///
/// Convención de keys:
///   - Registrado: `has_seen_onboarding_{userId}`
///   - Invitado:   `has_seen_onboarding_guest`
///
/// Si el usuario cierra la app a mitad del tutorial el flag no se
/// graba — al volver verá el tutorial completo de nuevo. Solo se
/// marca al "Omitir" o al completar el último paso.
class ShowcaseManager {
  ShowcaseManager._();

  static String _keyForUser(int? userId, {required bool isGuest}) {
    if (isGuest || userId == null) return 'has_seen_onboarding_guest';
    return 'has_seen_onboarding_$userId';
  }

  /// True si el usuario YA vio el tutorial. False = mostrarlo.
  static Future<bool> hasSeen({
    required int? userId,
    required bool isGuest,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyForUser(userId, isGuest: isGuest)) ?? false;
  }

  /// Persiste que el tutorial ya se mostró (al finalizar o al omitir).
  static Future<void> markSeen({
    required int? userId,
    required bool isGuest,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyForUser(userId, isGuest: isGuest), true);
  }

  /// Resetea el flag — útil para QA / testing. No se expone en UI.
  static Future<void> reset({
    required int? userId,
    required bool isGuest,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyForUser(userId, isGuest: isGuest));
  }
}
