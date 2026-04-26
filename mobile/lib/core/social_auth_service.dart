import 'package:firebase_auth/firebase_auth.dart';
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

/// Obtiene un Firebase idToken usando Google o Facebook.
/// El idToken se envía al backend para crear/verificar la sesión.
class SocialAuthService {
  static final _auth       = FirebaseAuth.instance;
  static final _googleSignIn = GoogleSignIn();

  /// Inicia sesión con Google.
  /// Retorna [SocialSignInOutcome] con el idToken, o indicador de cancelación/error.
  static Future<SocialSignInOutcome> signInWithGoogle() async {
    try {
      // Forzar el selector de cuentas siempre (evita auto-login silencioso)
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

      final credential    = FacebookAuthProvider.credential(accessToken.tokenString);
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

  /// Cierra la sesión de Firebase (no afecta la sesión JWT del backend).
  static Future<void> signOut() async {
    await Future.wait([
      _auth.signOut(),
      _googleSignIn.signOut(),
    ]);
  }
}
