import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/network/socket_service.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/providers/registration_provider.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

void main() {
  late MockDioAdapter adapter;

  setUp(() {
    adapter = installTestBackend();
  });

  tearDown(() {
    SocketService.instance.disconnect();
  });

  test('login fallido conserva la navegación de invitado', () async {
    adapter.onPost(
      '/auth/login',
      status: 401,
      body: {'message': 'Contraseña incorrecta'},
    );
    final auth = AuthProvider()..browseAsGuest();

    final ok = await auth.login('cliente@example.com', 'incorrecta');

    expect(ok, false);
    expect(auth.isGuest, true);
    expect(auth.user, isNull);
    expect(auth.error, isNotNull);
  });

  test('registro duplicado conserva la navegación de invitado', () async {
    adapter.onPost(
      '/auth/register',
      status: 409,
      body: {'message': 'Ya tienes una cuenta con este correo.'},
    );
    final auth = AuthProvider()
      ..attachRegistration(RegistrationProvider())
      ..browseAsGuest();

    final ok = await auth.register(
      email: 'cliente@example.com',
      password: 'Clave-2026!',
      firstName: 'Cliente',
      lastName: 'Prueba',
    );

    expect(ok, false);
    expect(auth.isGuest, true);
    expect(auth.needsEmailVerification, false);
    expect(auth.error, isNotNull);
  });
}
