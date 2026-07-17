/// Widget tests del `LoginScreen`.
///
/// Lo que validamos sin tocar la lógica del widget:
///   • Modo register dibuja los campos extras (Nombre, Apellido, Confirmar
///     contraseña, terms) que el modo login NO muestra.
///   • Botón principal cambia su label según el modo.
///   • El switch login → register cambia los textos correctamente.
///   • Cuando `auth.isLoading=true`, el botón muestra spinner y
///     `onPressed` es null (no se puede re-disparar el submit).
///   • Smoke: el widget se monta sin lanzar excepciones bajo MaterialApp
///     + theme + `ChangeNotifierProvider<AuthProvider>`.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/providers/registration_provider.dart';
import 'package:mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:provider/provider.dart';

import '../helpers/test_setup.dart';

/// Subclase de AuthProvider que NO toca repo/red/socket. Sustituye al
/// real bajo el `ChangeNotifierProvider` y deja al test controlar el
/// flag `isLoading`. Usar el AuthProvider real provocaba la conexión
/// del socket en login() — aquí no necesitamos llegar al submit.
class _FakeAuth extends ChangeNotifier implements AuthProvider {
  _FakeAuth({
    this.loginResult = true,
    this.registerResult = true,
    String? error,
  }) : _err = error;

  bool _loading = false;
  final String? _err;
  final bool loginResult;
  final bool registerResult;

  @override
  bool get isLoading => _loading;
  @override
  String? get error => _err;

  void setLoading(bool v) {
    _loading = v;
    notifyListeners();
  }

  @override
  Future<bool> login(
    String email,
    String password, {
    bool rememberSession = false,
  }) async => loginResult;

  @override
  Future<bool> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async => registerResult;

  // Resto: usamos noSuchMethod para responder valores nulos/false a
  // cualquier getter/método que el widget consulte y que no nos
  // interese en este test.
  @override
  // ignore: no_such_method
  dynamic noSuchMethod(Invocation invocation) => null;
}

Widget _harness({required AuthProvider auth, AuthMode mode = AuthMode.login}) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<AuthProvider>.value(value: auth),
      ChangeNotifierProvider<RegistrationProvider>(
        create: (_) => RegistrationProvider(),
      ),
      ChangeNotifierProvider<ThemeProvider>(create: (_) => ThemeProvider()),
    ],
    child: MaterialApp(
      theme: AppThemeColors.buildLight(),
      home: LoginScreen(initialMode: mode),
    ),
  );
}

void main() {
  setUp(() {
    installTestBackend();
  });

  testWidgets('Modo LOGIN: muestra "Ingresar" y NO muestra el campo "Nombre"', (
    tester,
  ) async {
    final auth = _FakeAuth();
    await tester.pumpWidget(_harness(auth: auth, mode: AuthMode.login));
    await tester.pump();

    expect(find.text('Ingresar'), findsOneWidget);
    // Campos exclusivos del modo register no deben aparecer.
    expect(find.text('Nombre'), findsNothing);
    expect(find.text('Apellido'), findsNothing);
    expect(find.text('Confirmar contraseña'), findsNothing);
    // Login muestra "Olvidaste tu contraseña?".
    expect(find.text('¿Olvidaste tu contraseña?'), findsOneWidget);
    // Y muestra el switch a registro.
    expect(find.text('¿No tienes cuenta? '), findsOneWidget);
    expect(find.text('Regístrate gratis'), findsOneWidget);
  });

  testWidgets(
    'Modo REGISTER: muestra Nombre, Apellido, Confirmar contraseña + botón "Crear mi cuenta"',
    (tester) async {
      final auth = _FakeAuth();
      await tester.pumpWidget(_harness(auth: auth, mode: AuthMode.register));
      await tester.pump();

      expect(find.text('Crear mi cuenta'), findsOneWidget);
      expect(find.text('Nombre'), findsOneWidget);
      expect(find.text('Apellido'), findsOneWidget);
      expect(find.text('Confirmar contraseña'), findsOneWidget);
      // En register NO debe aparecer "¿Olvidaste tu contraseña?".
      expect(find.text('¿Olvidaste tu contraseña?'), findsNothing);
      // Y muestra el switch a login.
      expect(find.text('¿Ya tienes cuenta? '), findsOneWidget);
      expect(find.text('Inicia sesión'), findsOneWidget);
    },
  );

  testWidgets(
    'Cuando auth.isLoading=true, el botón principal muestra spinner y NO es tappable',
    (tester) async {
      final auth = _FakeAuth();
      auth.setLoading(true);

      await tester.pumpWidget(_harness(auth: auth, mode: AuthMode.login));
      await tester.pump();

      // Hay UN CircularProgressIndicator visible: el del botón principal.
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // El botón principal — el ElevatedButton que envuelve el spinner —
      // tiene onPressed=null cuando isLoading.
      final btn = tester.widget<ElevatedButton>(
        find.ancestor(
          of: find.byType(CircularProgressIndicator),
          matching: find.byType(ElevatedButton),
        ),
      );
      expect(btn.onPressed, isNull);
    },
  );

  testWidgets(
    'Cuando NO está loading, el botón principal SÍ es tappable (onPressed != null)',
    (tester) async {
      final auth = _FakeAuth();
      await tester.pumpWidget(_harness(auth: auth, mode: AuthMode.login));
      await tester.pump();

      // No hay spinner del botón principal.
      expect(find.byType(CircularProgressIndicator), findsNothing);

      // El botón "Ingresar" tiene onPressed != null.
      final btnFinder = find.ancestor(
        of: find.text('Ingresar'),
        matching: find.byType(ElevatedButton),
      );
      expect(btnFinder, findsOneWidget);
      final btn = tester.widget<ElevatedButton>(btnFinder);
      expect(btn.onPressed, isNotNull);
    },
  );

  testWidgets(
    'Switch login → register en runtime cambia el contenido visible',
    (tester) async {
      final auth = _FakeAuth();
      await tester.pumpWidget(_harness(auth: auth, mode: AuthMode.login));
      await tester.pump();

      expect(find.text('Ingresar'), findsOneWidget);

      // "Regístrate gratis" puede quedar debajo del fold del ScrollView —
      // hacemos scroll explícito para que sea hit-testable.
      await tester.ensureVisible(find.text('Regístrate gratis'));
      await tester.tap(find.text('Regístrate gratis'));
      // La animación de fade dura ~300ms; settle espera a que termine
      // y descarta cualquier otra micro-animación interna.
      await tester.pumpAndSettle(const Duration(seconds: 2));

      expect(find.text('Crear mi cuenta'), findsOneWidget);
    },
  );

  testWidgets(
    'login fallido muestra mensaje amigable y permanece en modo login',
    (tester) async {
      final auth = _FakeAuth(
        loginResult: false,
        error: 'Correo no registrado. ¿Quieres crear una cuenta?',
      );
      await tester.pumpWidget(_harness(auth: auth, mode: AuthMode.login));

      final fields = find.byType(TextField);
      await tester.enterText(fields.at(0), 'nadie@example.com');
      await tester.enterText(fields.at(1), 'incorrecta');
      await tester.ensureVisible(find.text('Ingresar'));
      await tester.tap(find.text('Ingresar'));
      await tester.pump();

      expect(
        find.text(
          'No encontramos una cuenta con este correo. Regístrate gratis para continuar.',
        ),
        findsOneWidget,
      );
      expect(find.text('Ingresar'), findsOneWidget);
      expect(find.text('Crear mi cuenta'), findsNothing);
    },
  );

  testWidgets(
    'registro duplicado muestra mensaje amigable y permanece en registro',
    (tester) async {
      final auth = _FakeAuth(
        registerResult: false,
        error: 'Ya tienes una cuenta con este correo. Inicia sesión.',
      );
      await tester.pumpWidget(_harness(auth: auth, mode: AuthMode.register));

      final fields = find.byType(TextField);
      await tester.enterText(fields.at(0), 'Ana');
      await tester.enterText(fields.at(1), 'Pérez');
      await tester.enterText(fields.at(2), 'ana@example.com');
      await tester.enterText(fields.at(3), 'Clave-2026!');
      await tester.enterText(fields.at(4), 'Clave-2026!');
      await tester.ensureVisible(find.byType(Checkbox));
      await tester.tap(find.byType(Checkbox));
      await tester.ensureVisible(find.text('Crear mi cuenta'));
      await tester.tap(find.text('Crear mi cuenta'));
      await tester.pump();

      expect(
        find.text(
          'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.',
        ),
        findsOneWidget,
      );
      expect(find.text('Crear mi cuenta'), findsOneWidget);
      expect(find.text('Ingresar'), findsNothing);
    },
  );
}
