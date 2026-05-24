/// Helpers de setup para los tests de providers.
///
/// Centraliza:
///   - Inicializar `TestWidgetsFlutterBinding` (necesario para que el
///     channel mock de `flutter_secure_storage` funcione).
///   - Stubbear el channel de `flutter_secure_storage` con una in-memory
///     Map — sin esto, cualquier llamada a `AuthLocalStorage` lanza
///     `MissingPluginException`.
///   - Instalar un `MockDioAdapter` fresh en `DioClient.instance.dio`
///     y limpiar los tokens estáticos del interceptor.
library;

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/network/api_interceptor.dart';
import 'package:mobile/core/network/dio_client.dart';

import 'mock_dio_adapter.dart';

const _secureStorageChannel = MethodChannel(
  'plugins.it_nomads.com/flutter_secure_storage',
);

/// Map in-memory que simula la persistencia de `flutter_secure_storage`.
final Map<String, String> _secureMem = {};

/// Llamar en `setUp(...)` de cada test que necesite Dio mockeado +
/// canal de secure_storage stubeado. Devuelve el adapter para
/// configurar respuestas.
MockDioAdapter installTestBackend() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // ── Stub del canal de flutter_secure_storage ──
  // El paquete usa un MethodChannel; en flutter_test no existe el
  // backend nativo. Lo reemplazamos por un Map para que las llamadas
  // de AuthLocalStorage no exploten.
  _secureMem.clear();
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_secureStorageChannel, (call) async {
    switch (call.method) {
      case 'write':
        final args = Map<String, dynamic>.from(call.arguments as Map);
        _secureMem[args['key'] as String] = args['value'] as String? ?? '';
        return null;
      case 'read':
        final args = Map<String, dynamic>.from(call.arguments as Map);
        return _secureMem[args['key'] as String];
      case 'readAll':
        return Map<String, String>.from(_secureMem);
      case 'delete':
        final args = Map<String, dynamic>.from(call.arguments as Map);
        _secureMem.remove(args['key'] as String);
        return null;
      case 'deleteAll':
        _secureMem.clear();
        return null;
      case 'containsKey':
        final args = Map<String, dynamic>.from(call.arguments as Map);
        return _secureMem.containsKey(args['key'] as String);
      default:
        return null;
    }
  });

  // ── Dio mockeado ──
  final adapter = MockDioAdapter();
  DioClient.instance.dio.httpClientAdapter = adapter;

  // Tokens del interceptor limpios — el flujo de tests no usa JWT real
  // a menos que el spec específico inyecte uno.
  ApiInterceptor.clearTokens();

  return adapter;
}
