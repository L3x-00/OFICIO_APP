// Modelos/enums compartidos del flujo de auth.
//
// Vive en un archivo aparte para no inflar `auth_provider.dart` y
// porque otros módulos (router, main, UI) los consumen sin necesidad
// del estado interno del provider. `auth_provider.dart` re-exporta
// este archivo para no romper imports preexistentes.

/// Estado de navegación del usuario.
enum AppNavigationState {
  loading,                // Verificando sesión guardada
  unauthenticated,        // Sin sesión
  guest,                  // Navega como invitado (sin cuenta)
  needsEmailVerification, // Registrado pero email no verificado
  needsOnboarding,        // Email verificado pero sin elegir rol
  authenticated,          // Listo para usar la app
}

/// Payload del evento "TRUST rechazado" (validación de identidad).
class TrustRejectionPayload {
  final String reason;
  final String profileType;
  final String? rejectedAt;
  const TrustRejectionPayload({
    required this.reason,
    required this.profileType,
    this.rejectedAt,
  });
}

/// Payload del evento "plan activado" — el carrusel de bienvenida lo
/// consume para elegir el set de slides (ESTANDAR vs PREMIUM).
class PlanActivationPayload {
  final String plan;
  final String title;
  const PlanActivationPayload({
    required this.plan,
    required this.title,
  });
}

/// Payload del evento "perfil aprobado" cuando el admin acepta la
/// validación. La pantalla principal lo consume para abrir el modal
/// de bienvenida + plan ESTANDAR de cortesía sin esperar a que el
/// usuario entre al panel.
class ProviderApprovalPayload {
  /// id del Provider aprobado — clave para el flag "ya visto"
  /// persistido en SharedPreferences por `WelcomeProviderPlanModal`.
  final int providerId;
  /// businessName a saludar en la primera diapositiva del carrusel.
  final String displayName;
  /// 'OFICIO' o 'NEGOCIO' — solo para tracking; el carrusel actual
  /// es genérico.
  final String type;

  const ProviderApprovalPayload({
    required this.providerId,
    required this.displayName,
    required this.type,
  });
}
