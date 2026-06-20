/// Tests de regresión (Plan D) para `AuthRepository.socialLogin`.
///
/// Blindan el bug que tumbaba la persistencia de sesión social: el backend
/// no enviaba `userId` y el móvil hacía `data['userId'] as int` → `TypeError`
/// → `saveSession` nunca corría → al reabrir la app aparecía "no has iniciado
/// sesión". El cast defensivo `(data['userId'] as num?)?.toInt() ?? 0` evita
/// el crash; estos tests verifican que NO se rompa en el futuro.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/errors/failures.dart';
import 'package:mobile/features/auth/data/auth_repository.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

void main() {
  late MockDioAdapter adapter;
  late AuthRepository repo;

  setUp(() {
    // Instala el Dio mock + el canal de secure_storage en memoria. Debe ir
    // ANTES de construir el repo (que captura DioClient.instance.dio).
    adapter = installTestBackend();
    repo = AuthRepository();
  });

  group('AuthRepository.socialLogin', () {
    test(
      'NO crashea si la respuesta NO trae userId — devuelve UserModel con id 0',
      () async {
        // Respuesta del backend SIN `userId` (el bug real). El cast defensivo
        // debe degradar a id=0 en vez de lanzar TypeError.
        adapter.onPost(
          '/auth/social-login',
          body: {
            'accessToken': 'access-token',
            'refreshToken': 'refresh-token',
            'email': 'social@example.com',
            'firstName': 'Ana',
            'lastName': 'Soto',
            'isNewUser': false,
            // userId AUSENTE a propósito.
          },
        );

        final result = await repo.socialLogin('any-firebase-token');

        expect(result.isSuccess, isTrue);
        final data = result.data;
        expect(data.user.id, 0); // degradación segura, NO TypeError
        expect(data.user.email, 'social@example.com');
        expect(data.isNewUser, isFalse);
      },
    );

    test('con userId presente arma el UserModel correctamente', () async {
      adapter.onPost(
        '/auth/social-login',
        body: {
          'accessToken': 'access-token',
          'refreshToken': 'refresh-token',
          'userId': 42,
          'role': 'USUARIO',
          'email': 'ok@example.com',
          'firstName': 'Ok',
          'lastName': 'User',
          'isNewUser': true,
        },
      );

      final result = await repo.socialLogin('any-firebase-token');

      expect(result.isSuccess, isTrue);
      expect(result.data.user.id, 42);
      expect(result.data.user.email, 'ok@example.com');
      expect(result.data.isNewUser, isTrue);
    });
  });
}
