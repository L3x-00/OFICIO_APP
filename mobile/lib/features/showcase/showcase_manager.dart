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

  /// Gate de coordinación: `true` mientras un modal de bienvenida está
  /// visible (WelcomeOnboardingModal del cliente o WelcomeProviderPlanModal
  /// del proveedor). El auto-start del tutorial espera a que vuelva a
  /// `false` antes de disparar — si no, el spotlight quedaba DETRÁS del
  /// modal y el usuario nunca veía el tour (lo marcaba como visto a
  /// ciegas). Primero el welcome, luego el tutorial.
  static bool blockingModalActive = false;

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

  // ── Panel del proveedor ──────────────────────────────────
  //
  // Flag por (tab, userId, providerType). Cada perfil (OFICIO /
  // NEGOCIO) tiene su propio set de flags — un mismo usuario con
  // ambos perfiles ve el tutorial dos veces, una en cada panel.
  // Formato: `has_seen_admin_{tab}_{userId}_{providerType}`.

  static String _adminKey({
    required String tab,
    required int    userId,
    required String providerType,
  }) {
    return 'has_seen_admin_${tab}_${userId}_${providerType.toLowerCase()}';
  }

  static Future<bool> hasSeenAdminTab({
    required String tab,
    required int    userId,
    required String providerType,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_adminKey(
      tab:          tab,
      userId:       userId,
      providerType: providerType,
    )) ?? false;
  }

  static Future<void> markSeenAdminTab({
    required String tab,
    required int    userId,
    required String providerType,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(
      _adminKey(tab: tab, userId: userId, providerType: providerType),
      true,
    );
  }

  static Future<void> resetAdminTab({
    required String tab,
    required int    userId,
    required String providerType,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_adminKey(
      tab:          tab,
      userId:       userId,
      providerType: providerType,
    ));
  }
}
