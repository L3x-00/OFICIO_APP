import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/services.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';

/// Resultado del intento de login social.
enum SocialSignInResult { success, cancelled, error }

class SocialSignInOutcome {
  final SocialSignInResult result;
  final String? idToken;
  final String? errorMessage;

  const SocialSignInOutcome._({
    required this.result,
    this.idToken,
    this.errorMessage,
  });

  factory SocialSignInOutcome.success(String idToken) =>
      SocialSignInOutcome._(result: SocialSignInResult.success, idToken: idToken);

  factory SocialSignInOutcome.cancelled() =>
      const SocialSignInOutcome._(result: SocialSignInResult.cancelled);

  factory SocialSignInOutcome.error(String message) =>
      SocialSignInOutcome._(result: SocialSignInResult.error, errorMessage: message);

  bool get isSuccess   => result == SocialSignInResult.success;
  bool get isCancelled => result == SocialSignInResult.cancelled;
  bool get isError     => result == SocialSignInResult.error;
}

/// Proveedores de login social disponibles.
enum SocialProvider {
  google,
  facebook,
  tiktok,
}

/// Obtiene un Firebase idToken usando Google, Facebook o TikTok.
class SocialAuthService {
  static final _auth = FirebaseAuth.instance;
  // Scopes explícitos: al pedir 'email' y 'profile' el sistema muestra
  // la pantalla de consentimiento de Google la primera vez (nombre,
  // foto, correo) — no se conceden permisos en silencio.
  static final _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  /// Inicia sesión con Google.
  ///
  /// SIEMPRE fuerza el selector de cuentas: hacemos `signOut()` antes de
  /// `signIn()` para invalidar la sesión cacheada. Sin esto, google_sign_in
  /// reusa la última cuenta automáticamente y NO pregunta — el usuario no
  /// puede cambiar de cuenta ni ve la pantalla de permisos. El costo es
  /// ~1-2 s extra, aceptado a cambio de un login explícito y controlado.
  static Future<SocialSignInOutcome> signInWithGoogle() async {
    try {
      // Limpia la sesión cacheada → el próximo signIn() abre el selector
      // de cuentas del sistema (equivale a 'prompt=select_account').
      await _googleSignIn.signOut();

      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) return SocialSignInOutcome.cancelled();
      final googleAuth = await googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken:     googleAuth.idToken,
      );
      final userCredential = await _auth.signInWithCredential(credential);
      final token = await userCredential.user?.getIdToken();
      if (token == null) {
        return SocialSignInOutcome.error('No se pudo obtener el token de Firebase');
      }
      return SocialSignInOutcome.success(token);
    } on FirebaseAuthException catch (e) {
      return SocialSignInOutcome.error(e.message ?? 'Error de autenticación Firebase');
    } catch (e) {
      return SocialSignInOutcome.error(e.toString());
    }
  }

  /// Inicia sesión con Facebook.
  static Future<SocialSignInOutcome> signInWithFacebook() async {
    try {
      final loginResult = await FacebookAuth.instance.login(
        permissions: ['email', 'public_profile'],
      );
      if (loginResult.status == LoginStatus.cancelled) {
        return SocialSignInOutcome.cancelled();
      }
      if (loginResult.status != LoginStatus.success) {
        return SocialSignInOutcome.error(
          loginResult.message ?? 'Error en autenticación con Facebook',
        );
      }
      final accessToken = loginResult.accessToken;
      if (accessToken == null) {
        return SocialSignInOutcome.error('No se obtuvo token de Facebook');
      }
      final credential     = FacebookAuthProvider.credential(accessToken.tokenString);
      final userCredential = await _auth.signInWithCredential(credential);
      final token = await userCredential.user?.getIdToken();
      if (token == null) {
        return SocialSignInOutcome.error('No se pudo obtener el token de Firebase');
      }
      return SocialSignInOutcome.success(token);
    } on FirebaseAuthException catch (e) {
      return SocialSignInOutcome.error(e.message ?? 'Error de autenticación Firebase');
    } catch (e) {
      return SocialSignInOutcome.error(e.toString());
    }
  }

  /// Inicia sesión con TikTok via OAuth 2.0 + PKCE.
  ///
  /// Usa Chrome Custom Tabs (Android) / ASWebAuthenticationSession (iOS) para
  /// mostrar el flujo de autorización dentro de la app sin saltar a la app
  /// nativa de TikTok. El callback se captura con el scheme `oficioapp://`.
  ///
  /// IMPORTANTE — portal TikTok Sandbox:
  ///   redirect_uri registrado debe ser exactamente: oficioapp://callback
  static Future<SocialSignInOutcome> signInWithTikTok() async {
    const clientKey   = 'sbaw6yplcjwthcm1gq';
    // El redirect_uri debe coincidir exactamente con el registrado en TikTok.
    // Usa el custom scheme para que el OS devuelva el control a la app.
    const redirectUri = 'oficioapp://callback';
    const callbackScheme = 'oficioapp';

    // PKCE: code_verifier aleatorio + code_challenge = SHA-256(verifier) en base64url
    final verifier   = _generateCodeVerifier();
    final challenge  = _codeChallenge(verifier);
    final state      = _randomHex(16);

    final authUri = Uri.https('www.tiktok.com', '/v2/auth/authorize/', {
      'client_key':             clientKey,
      'response_type':          'code',
      'scope':                  'user.info.basic',
      'redirect_uri':           redirectUri,
      'state':                  state,
      'code_challenge':         challenge,
      'code_challenge_method':  'S256',
    });

    try {
      // flutter_web_auth_2 abre Chrome Custom Tab y espera hasta que la URL
      // comience con `callbackScheme://`. El AndroidManifest ya tiene el
      // intent-filter para `oficioapp://callback`.
      final result = await FlutterWebAuth2.authenticate(
        url:             authUri.toString(),
        callbackUrlScheme: callbackScheme,
        options: const FlutterWebAuth2Options(
          // iOS/macOS: sesión efímera, no reutiliza cookies de Safari.
          preferEphemeral: true,
          // Android: FLAG_ACTIVITY_NO_HISTORY evita que el Custom Tab quede
          // en el back-stack y fuerza sesión limpia sin cookies persistentes.
          intentFlags: ephemeralIntentFlags,
        ),
      );

      // Extraer el `code` y verificar que el `state` coincide (CSRF guard).
      final callbackUri = Uri.parse(result);
      final returnedState = callbackUri.queryParameters['state'];
      if (returnedState != state) {
        return SocialSignInOutcome.error('State mismatch — posible ataque CSRF');
      }

      final code = callbackUri.queryParameters['code'];
      if (code == null || code.isEmpty) {
        final error = callbackUri.queryParameters['error'] ?? 'Sin código de autorización';
        return SocialSignInOutcome.error('TikTok rechazó la autorización: $error');
      }

      // Devuelve el code + verifier al caller para que el backend intercambie
      // el code por un access_token (exchange seguro server-side).
      // Se codifica como JSON compacto en el campo idToken para no romper la API.
      final payload = jsonEncode({'code': code, 'code_verifier': verifier});
      return SocialSignInOutcome.success(payload);

    } on PlatformException catch (e) {
      // ACTIVITY_RESULT_CANCELED = usuario cerró el Custom Tab sin autorizar.
      if (e.code == 'ACTIVITY_RESULT_CANCELED' || e.code == 'UserCanceled') {
        return SocialSignInOutcome.cancelled();
      }
      return SocialSignInOutcome.error('TikTok OAuth cancelado: ${e.message}');
    } catch (e) {
      return SocialSignInOutcome.error('Error al iniciar sesión con TikTok: $e');
    }
  }

  // ── PKCE helpers ────────────────────────────────────────────

  static String _generateCodeVerifier() {
    final rng = Random.secure();
    final bytes = List<int>.generate(32, (_) => rng.nextInt(256));
    return base64UrlEncode(bytes).replaceAll('=', '');
  }

  static String _codeChallenge(String verifier) {
    final bytes = utf8.encode(verifier);
    final digest = sha256.convert(bytes);
    return base64UrlEncode(digest.bytes).replaceAll('=', '');
  }

  static String _randomHex(int length) {
    final rng = Random.secure();
    final bytes = List<int>.generate(length, (_) => rng.nextInt(256));
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  /// Cierra la sesión de Firebase.
  static Future<void> signOut() async {
    await Future.wait([
      _auth.signOut(),
      _googleSignIn.signOut(),
    ]);
  }
}