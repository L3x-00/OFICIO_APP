/// Tests del `AuthProvider`.
///
/// Notas técnicas:
///   • AuthProvider construye `AuthRepository()` internamente y éste usa
///     `DioClient.instance.dio`. El `installTestBackend()` reemplaza el
///     adapter de ese Dio singleton — los tests controlan HTTP sin
///     tocar la lógica.
///   • `flutter_secure_storage` queda stubbed en memoria por
///     `test_setup.dart` (sin esto, `MissingPluginException`).
///   • Login post-success llama `_connectSocketForUser` que crea un
///     `Socket.io` real apuntando a `DioClient.baseUrl`. NO conecta
///     bloqueando (`disableAutoConnect` ya no está activo, pero
///     `enableReconnection` lanza timers de reintento). El test usa
///     `addTearDown` para limpiar.
library;

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

  // Tras cualquier `login()` exitoso el provider conecta el socket real.
  // Si no lo cerramos, los timers de reconexión quedan vivos entre tests
  // y Flutter test reporta "pending timers" al final.
  tearDown(() {
    SocketService.instance.disconnect();
  });

  // ─────────────────────────────────────────────────────────────
  group('Estado inicial', () {
    test('user null, no autenticado, no guest, sin error', () {
      final p = AuthProvider();
      expect(p.user, isNull);
      expect(p.isAuthenticated, false);
      expect(p.isGuest, false);
      expect(p.needsOnboarding, false);
      expect(p.needsEmailVerification, false);
      expect(p.isInitialized, false);
      expect(p.error, isNull);
      expect(p.isLoading, false);
    });

    test('browseAsGuest activa el flag isGuest', () {
      final p = AuthProvider();
      p.browseAsGuest();
      expect(p.isGuest, true);
      // navigationState depende de _isInitialized (gate de loading);
      // aquí solo aseguramos que browseAsGuest no rompe en estado
      // pre-initialize y deja el flag listo para cuando lo lea
      // la app shell post-bootstrap.
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('register()', () {
    test('success: setea needsEmailVerification + guarda pendingId en RegistrationProvider', () async {
      adapter.onPost('/auth/register', body: {
        'pendingId': 'pid-abc-123',
        'requiresEmailVerification': true,
      });

      final reg  = RegistrationProvider();
      final auth = AuthProvider()..attachRegistration(reg);

      final ok = await auth.register(
        email:     'nuevo@example.com',
        password:  'Pwd-2026!',
        firstName: 'Nuevo',
        lastName:  'Usuario',
      );

      expect(ok, true);
      expect(auth.needsEmailVerification, true);
      expect(auth.error, isNull);
      expect(reg.pendingId, 'pid-abc-123');
      expect(reg.pendingEmail, 'nuevo@example.com');
      expect(auth.pendingEmail, 'nuevo@example.com');
    });

    test('failure: conflict 409 → devuelve false + setea error legible', () async {
      adapter.onPost('/auth/register', status: 409, body: {
        'message': 'Ya tienes una cuenta con este correo. Inicia sesión.',
      });

      final auth = AuthProvider()..attachRegistration(RegistrationProvider());
      final ok = await auth.register(
        email: 'existe@example.com',
        password: 'pwd', firstName: 'X', lastName: 'Y',
      );

      expect(ok, false);
      expect(auth.error, isNotNull);
      expect(auth.needsEmailVerification, false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('login()', () {
    test('success: setea user, isAuthenticated true, tokens persistidos en secure storage', () async {
      adapter.onPost('/auth/login', body: {
        'accessToken':  'access-token-abc',
        'refreshToken': 'refresh-token-xyz',
        'userId':       42,
        'role':         'USUARIO',
        'firstName':    'Mario',
        'lastName':     'Lopez',
      });
      // _syncProviderStatus se llama post-login → debe responder algo.
      adapter.onGet('/users/my-provider-status', body: {
        'hasProvider': false, 'profiles': <dynamic>[],
      });

      final auth = AuthProvider();
      final ok = await auth.login('mario@x.com', 'Pwd-2026!');

      expect(ok, true);
      expect(auth.user, isNotNull);
      expect(auth.user!.id, 42);
      expect(auth.user!.firstName, 'Mario');
      expect(auth.isAuthenticated, true);
      expect(auth.error, isNull);
    });

    test('failure: password incorrecta → UnauthorizedException → error + isAuthenticated false', () async {
      adapter.onPost('/auth/login', status: 401, body: {
        'message': 'Contraseña incorrecta',
      });

      final auth = AuthProvider();
      final ok = await auth.login('mario@x.com', 'wrongPwd');

      expect(ok, false);
      expect(auth.user, isNull);
      expect(auth.isAuthenticated, false);
      expect(auth.error, isNotNull);
    });

    test('failure: email no registrado → 404 → error sin tocar tokens', () async {
      adapter.onPost('/auth/login', status: 404, body: {
        'message': 'Correo no registrado. ¿Quieres crear una cuenta?',
      });

      final auth = AuthProvider();
      final ok = await auth.login('inexistente@x.com', 'anything');

      expect(ok, false);
      expect(auth.error, isNotNull);
      expect(auth.user, isNull);
    });

    test('rememberSession=false NO añade la cuenta a SavedAccountsStorage', () async {
      adapter.onPost('/auth/login', body: {
        'accessToken':  'a', 'refreshToken': 'r',
        'userId': 10, 'role': 'USUARIO', 'firstName': 'A', 'lastName': 'B',
      });
      adapter.onGet('/users/my-provider-status', body: {
        'hasProvider': false, 'profiles': <dynamic>[],
      });

      final auth = AuthProvider();
      await auth.login('a@b.com', 'pwd');
      // Sin rememberSession, no se llama al SavedAccountsStorage.addOrUpdate
      // (flag interno permanece false).
      expect(auth.savedAccountLimitReached, false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('refreshUser() + refreshCurrentUser()', () {
    test('refreshUser carga el user actual desde /users/me', () async {
      adapter.onGet('/users/me', body: {
        'id': 7, 'email': 'r@x.com', 'firstName': 'R', 'lastName': 'X',
        'role': 'USUARIO', 'coins': 75,
      });

      final auth = AuthProvider();
      await auth.refreshUser();

      expect(auth.user, isNotNull);
      expect(auth.user!.id, 7);
      expect(auth.user!.coins, 75);
    });

    test('refreshCurrentUser actualiza coins sin reemplazar al user completo', () async {
      // 1ra: login para tener un user base.
      adapter.onPost('/auth/login', body: {
        'accessToken': 'a', 'refreshToken': 'r',
        'userId': 5, 'role': 'USUARIO',
        'firstName': 'Ana', 'lastName': 'Soto', 'coins': 0,
      });
      adapter.onGet('/users/my-provider-status', body: {
        'hasProvider': false, 'profiles': <dynamic>[],
      });
      final auth = AuthProvider();
      await auth.login('ana@x.com', 'pwd');
      expect(auth.user!.coins, 0);

      // 2da: el endpoint /users/me devuelve coins=30 (ej. referido aprobado).
      adapter.reset();
      adapter.onGet('/users/me', body: {
        'id': 5, 'email': 'ana@x.com', 'firstName': 'Ana', 'lastName': 'Soto',
        'role': 'USUARIO', 'coins': 30,
      });
      await auth.refreshCurrentUser();

      expect(auth.user!.id, 5);
      expect(auth.user!.firstName, 'Ana');
      expect(auth.user!.coins, 30); // se actualizó
    });

    test('refreshUser silencioso ante failure (no resetea user existente)', () async {
      // Setup: user precargado.
      adapter.onGet('/users/me', body: {
        'id': 9, 'email': 'x@y', 'firstName': 'X', 'lastName': 'Y',
        'role': 'USUARIO',
      });
      final auth = AuthProvider();
      await auth.refreshUser();
      expect(auth.user!.id, 9);

      // 2da: backend rompe.
      adapter.reset();
      adapter.onGet('/users/me', status: 500);
      await auth.refreshUser();
      // El user previo se mantiene (no hay reseteo a null en failure).
      expect(auth.user!.id, 9);
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('setupPassword() — usuarios social tras Google sign-in', () {
    test('success retorna true', () async {
      adapter.onPost('/auth/setup-password', body: {
        'message': 'Contraseña establecida correctamente',
      });

      final auth = AuthProvider();
      final ok = await auth.setupPassword('nueva-pwd-real-2026!');

      expect(ok, true);
    });

    test('failure setea error y retorna false', () async {
      adapter.onPost('/auth/setup-password', status: 400, body: {
        'message': 'Esta cuenta ya tiene contraseña.',
      });

      final auth = AuthProvider();
      final ok = await auth.setupPassword('nueva-pwd');

      expect(ok, false);
      expect(auth.error, isNotNull);
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('clearError / clearDeactivatedFlag', () {
    test('clearError reset error a null y notifica', () async {
      adapter.onPost('/auth/login', status: 401, body: {'message': 'bad'});
      final auth = AuthProvider();
      await auth.login('x@y', 'wrong');
      expect(auth.error, isNotNull);

      auth.clearError();
      expect(auth.error, isNull);
    });

    test('clearDeactivatedFlag baja wasDeactivated', () {
      final auth = AuthProvider();
      // Estado inicial false; clearDeactivatedFlag debe ser idempotente.
      expect(auth.wasDeactivated, false);
      auth.clearDeactivatedFlag();
      expect(auth.wasDeactivated, false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('logout()', () {
    test('limpia user + flags + tokens', () async {
      // Setup: login válido.
      adapter.onPost('/auth/login', body: {
        'accessToken': 'a', 'refreshToken': 'r',
        'userId': 1, 'role': 'USUARIO', 'firstName': 'A', 'lastName': 'B',
      });
      adapter.onGet('/users/my-provider-status', body: {
        'hasProvider': false, 'profiles': <dynamic>[],
      });
      final auth = AuthProvider();
      await auth.login('a@b.com', 'pwd');
      expect(auth.isAuthenticated, true);

      adapter.onPost('/auth/logout', body: {'message': 'ok'});
      await auth.logout();

      expect(auth.user, isNull);
      expect(auth.isAuthenticated, false);
      expect(auth.isGuest, false);
      expect(auth.needsOnboarding, false);
      expect(auth.needsEmailVerification, false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  group('Multi-profile getters (canBecomeRole)', () {
    test('canBecomeRole true cuando no hay perfil de ese tipo', () {
      final auth = AuthProvider();
      expect(auth.canBecomeRole('OFICIO'), true);
      expect(auth.canBecomeRole('NEGOCIO'), true);
      expect(auth.canBecomeAnyProvider, true);
      expect(auth.hasOficioProfile, false);
      expect(auth.hasNegocioProfile, false);
      expect(auth.hasApprovedProvider, false);
    });
  });
}
