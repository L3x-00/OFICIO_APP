import 'package:flutter/material.dart';
import '../../../../provider_dashboard/presentation/screens/provider_panel.dart';
import '../../providers/auth_provider.dart';
import '../../screens/onboarding/provider_onboarding_form.dart';

/// Helpers de etiqueta y navegación del perfil — funciones estáticas
/// para no atar lógica al State del widget principal.
class ProfileNavigationHelper {
  const ProfileNavigationHelper._();

  /// Texto del tipo de cuenta visible en la UI.
  /// Solo muestra "Profesional"/"Negocio" cuando el proveedor está APROBADO;
  /// mientras siga pendiente, el tipo sigue siendo "Cliente".
  static String accountTypeLabel(AuthProvider auth) {
    if (auth.user?.role == 'ADMIN') return 'Administrador';
    if (!auth.hasApprovedProvider) return 'Cliente';

    final parts = <String>['Cliente'];
    if (auth.hasOficioProfile) parts.add('Profesional');
    if (auth.hasNegocioProfile) parts.add('Negocio');
    return parts.join(' + ');
  }

  /// Navega directamente al panel del tipo indicado ('OFICIO' o 'NEGOCIO').
  /// `rootNavigator: true` saca el panel del shell del cliente para no
  /// dejar visible la bottom nav del cliente debajo.
  static void openProviderPanel(BuildContext context, String type) {
    Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute(
        builder: (_) => ProviderPanel(providerType: type),
      ),
    );
  }

  /// Abre el formulario para añadir un perfil del tipo indicado.
  /// rootNavigator: true saca la pantalla del shell del cliente —
  /// sin esto, la bottom nav del shell quedaba visible debajo del
  /// formulario de registro y arruinaba la UX.
  static void openAddProfile(BuildContext context, String type) {
    Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute(
        builder: (_) =>
            ProviderOnboardingForm(providerType: type, isStandalone: true),
      ),
    );
  }
}
