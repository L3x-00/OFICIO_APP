/// Regresión de filtros de la lista principal (bug 5): el tipo
/// (Profesionales/Negocios) y el orden (más reseñas) DEBEN viajar al backend
/// como query params. Si el provider deja de mandarlos, el filtro "no hace
/// nada".
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/network/socket_service.dart';
import 'package:mobile/features/providers_list/presentation/providers/providers_provider.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

void main() {
  late MockDioAdapter adapter;

  setUp(() {
    adapter = installTestBackend();
  });

  tearDown(() => SocketService.instance.disconnect());

  void stubProvidersList() {
    adapter.onGet(
      '/providers',
      body: {'data': <dynamic>[], 'total': 0, 'page': 1, 'lastPage': 1},
    );
  }

  Map<String, dynamic> lastProvidersQuery() {
    final req = adapter.captured.lastWhere(
      (r) => r.method == 'GET' && r.path == '/providers',
    );
    return req.queryParameters;
  }

  test('setType("BUSINESS") envía type=BUSINESS al backend', () async {
    stubProvidersList();
    final p = ProvidersProvider();
    await p.setType('BUSINESS');
    expect(lastProvidersQuery()['type'], 'BUSINESS');
  });

  test('setType("PROFESSIONAL") envía type=PROFESSIONAL', () async {
    stubProvidersList();
    final p = ProvidersProvider();
    await p.setType('PROFESSIONAL');
    expect(lastProvidersQuery()['type'], 'PROFESSIONAL');
  });

  test('setSortBy("reviews") envía sortBy=reviews', () async {
    stubProvidersList();
    final p = ProvidersProvider();
    await p.setSortBy('reviews');
    expect(lastProvidersQuery()['sortBy'], 'reviews');
  });
}
