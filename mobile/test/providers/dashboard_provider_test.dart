/// Regresión: loadDashboard() y cancelPlan() deben preservar/enviar el tipo
/// activo cuando el usuario tiene 2 perfiles (individual + Negocio o
/// individual migrado a PROFESIONAL). Antes de este fix, cualquier llamada
/// sin `providerType` explícito (reintentar en Estadísticas, retorno de
/// MercadoPago, tras cancelar plan) borraba `_currentProviderType` y el
/// siguiente request al backend fallaba con 400 "Indica el tipo de perfil".
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/network/socket_service.dart';
import 'package:mobile/features/provider_dashboard/data/dashboard_repository.dart';
import 'package:mobile/features/provider_dashboard/presentation/providers/dashboard_provider.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

void main() {
  late MockDioAdapter adapter;

  setUp(() {
    adapter = installTestBackend();
  });

  tearDown(() => SocketService.instance.disconnect());

  void stubDashboardEndpoints() {
    // No necesitamos un DashboardProfileModel válido — loadDashboard()
    // asigna _currentProviderType ANTES del try/await, así que aunque el
    // parseo de la respuesta falle después, el valor ya quedó fijado.
    adapter.onGet('/provider-profile/me', body: {});
    adapter.onGet('/provider-profile/me/analytics', body: {});
  }

  Map<String, dynamic>? lastQueryFor(String path) {
    final matches = adapter.captured.where(
      (r) => r.method == 'GET' && r.path == path,
    );
    if (matches.isEmpty) return null;
    return matches.last.queryParameters;
  }

  test(
    'loadDashboard(providerType: X) fija el tipo y lo manda como query param',
    () async {
      stubDashboardEndpoints();
      final dp = DashboardProvider();

      await dp.loadDashboard(providerType: 'PROFESIONAL');

      expect(dp.currentProviderType, 'PROFESIONAL');
      expect(lastQueryFor('/provider-profile/me')?['type'], 'PROFESIONAL');
    },
  );

  test(
    'loadDashboard() SIN argumento preserva el tipo activo (no lo borra)',
    () async {
      stubDashboardEndpoints();
      final dp = DashboardProvider();

      await dp.loadDashboard(providerType: 'PROFESIONAL');
      expect(dp.currentProviderType, 'PROFESIONAL');

      // Callers reales sin tipo: reintentar en Estadísticas, tras cancelar
      // plan, retorno de MercadoPago (plan_selector_sheet.dart / panel_stats_tab.dart).
      await dp.loadDashboard();

      expect(dp.currentProviderType, 'PROFESIONAL'); // NO se resetea a null
      expect(lastQueryFor('/provider-profile/me')?['type'], 'PROFESIONAL');
    },
  );

  test('cancelPlan({type}) manda el tipo como query param', () async {
    adapter.onPatch('/payments/cancel-plan', body: {});

    await DashboardRepository().cancelPlan(type: 'PROFESIONAL');

    final req = adapter.captured.last;
    expect(req.method, 'PATCH');
    expect(req.path, '/payments/cancel-plan');
    expect(req.queryParameters['type'], 'PROFESIONAL');
  });

  test('cancelPlan() sin type no manda query params', () async {
    adapter.onPatch('/payments/cancel-plan', body: {});

    await DashboardRepository().cancelPlan();

    final req = adapter.captured.last;
    expect(req.queryParameters.containsKey('type'), false);
  });
}
