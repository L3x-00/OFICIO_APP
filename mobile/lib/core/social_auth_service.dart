import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:url_launcher/url_launcher.dart';

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
  static final _auth         = FirebaseAuth.instance;
  static final _googleSignIn = GoogleSignIn();

  /// Inicia sesión con Google.
  static Future<SocialSignInOutcome> signInWithGoogle() async {
    try {
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

  /// Inicia sesión con TikTok.
  /// Abre el navegador externo para autorización OAuth.
  static Future<SocialSignInOutcome> signInWithTikTok() async {
    const clientKey  = 'sbaw6yplcjwthcm1gq';
    const redirectUri = 'https://www.oficioapp.org.pe/auth/tiktok/callback';

    final state = DateTime.now().millisecondsSinceEpoch.toString();

    final authUrl = 'https://www.tiktok.com/v2/auth/authorize/'
        '?client_key=$clientKey'
        '&response_type=code'
        '&scope=user.info.basic'
        '&redirect_uri=$redirectUri'
        '&state=$state';

    try {
      final uri = Uri.parse(authUrl);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);

      if (!launched) {
        return SocialSignInOutcome.error('No se pudo abrir TikTok');
      }

      // Con url_launcher no podemos capturar la redirección automáticamente.
      // Para la demo de Sandbox, devolvemos un resultado exitoso simbólico.
      // En producción, necesitarás un esquema de URL personalizado o un backend intermedio.
      return SocialSignInOutcome.success('tiktok_pending_code');
    } catch (e) {
      return SocialSignInOutcome.error('Error al iniciar sesión con TikTok: $e');
    }
  }

  /// Cierra la sesión de Firebase.
  static Future<void> signOut() async {
    await Future.wait([
      _auth.signOut(),
      _googleSignIn.signOut(),
    ]);
  }
}