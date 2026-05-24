/// Mock `HttpClientAdapter` para Dio — intercepta las requests HTTP de
/// toda la app sin tocar la lógica de los repositorios ni de los
/// providers.
///
/// Idea: cada repo del proyecto usa `DioClient.instance.dio`. Reemplazar
/// el `httpClientAdapter` de esa instancia con uno mock en el `setUp`
/// del test → todas las llamadas se canalizan por aquí.
///
/// Uso:
/// ```dart
/// final adapter = MockDioAdapter();
/// DioClient.instance.dio.httpClientAdapter = adapter;
///
/// adapter.on(method: 'GET',  path: '/users/me',
///            body: { 'id': 1, 'email': 'x@y' });
/// adapter.on(method: 'POST', path: '/auth/login', status: 401);
/// ```
library;

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';

class _Stub {
  final String method;
  final RegExp pathRegex;
  final int status;
  final dynamic body;
  _Stub(this.method, this.pathRegex, this.status, this.body);
}

/// Adapter mock que casa por método HTTP + regex de path.
///
/// `path` puede ser:
///   - String: matchea exacto.
///   - RegExp: matchea por patrón (útil para `/subastas/requests/123`).
class MockDioAdapter implements HttpClientAdapter {
  final List<_Stub> _stubs = [];
  /// Todas las requests vistas — útil para `expect(adapter.captured...)`.
  final List<RequestOptions> captured = [];

  /// Restaurar el comportamiento default tras un test si fuera necesario.
  HttpClientAdapter? _fallbackAdapter;

  void on({
    required String method,
    required Pattern path,
    int status = 200,
    dynamic body,
  }) {
    final regex = path is RegExp ? path : RegExp('^${RegExp.escape(path as String)}\$');
    _stubs.add(_Stub(method.toUpperCase(), regex, status, body));
  }

  /// Conveniencia: queue rápido por método.
  void onGet(String path, {int status = 200, dynamic body}) =>
      on(method: 'GET', path: path, status: status, body: body);
  void onPost(String path, {int status = 200, dynamic body}) =>
      on(method: 'POST', path: path, status: status, body: body);
  void onPatch(String path, {int status = 200, dynamic body}) =>
      on(method: 'PATCH', path: path, status: status, body: body);
  void onDelete(String path, {int status = 200, dynamic body}) =>
      on(method: 'DELETE', path: path, status: status, body: body);

  void reset() {
    _stubs.clear();
    captured.clear();
  }

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    captured.add(options);

    final method = options.method.toUpperCase();
    for (final stub in _stubs) {
      if (stub.method == method && stub.pathRegex.hasMatch(options.path)) {
        final encoded = utf8.encode(jsonEncode(stub.body ?? {}));
        return ResponseBody.fromBytes(
          encoded,
          stub.status,
          headers: const {
            'content-type': ['application/json; charset=utf-8'],
          },
        );
      }
    }

    // Sin match — devolvemos 404 con cuerpo descriptivo para que el
    // test falle ruidosamente con un mensaje útil.
    final msg = jsonEncode({
      'message': 'MockDioAdapter: sin stub para $method ${options.path}',
    });
    return ResponseBody.fromBytes(
      utf8.encode(msg),
      404,
      headers: const {
        'content-type': ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {
    _fallbackAdapter?.close(force: force);
  }
}

/// Helper para crear un adapter "real" cuando un test quiera restaurar
/// el adapter default. No usado por default; los tests reciclan el
/// MockDioAdapter en cada setUp.
HttpClientAdapter realAdapterForRestore() => IOHttpClientAdapter();
