import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';

/// Obtiene un Firebase idToken usando Google o Facebook.
/// El idToken se envía al backend para crear/verificar la sesión.
class SocialAuthService {
  static final _auth = FirebaseAuth.instance;
  static final _googleSignIn = GoogleSignIn();

  /// Inicia sesión con Google. Retorna el idToken de Firebase, o null si el
  /// usuario canceló o ocurrió un error.
  static Future<String?> signInWithGoogle() async {
    try {
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) return null; // cancelado por el usuario

      final googleAuth = await googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final userCredential = await _auth.signInWithCredential(credential);
      return await userCredential.user?.getIdToken();
    } catch (_) {
      return null;
    }
  }

  /// Inicia sesión con Facebook. Retorna el idToken de Firebase, o null si
  /// el usuario canceló o ocurrió un error.
  static Future<String?> signInWithFacebook() async {
    try {
      final loginResult = await FacebookAuth.instance.login(
        permissions: ['email', 'public_profile'],
      );

      if (loginResult.status != LoginStatus.success) return null;

      final accessToken = loginResult.accessToken;
      if (accessToken == null) return null;

      final credential = FacebookAuthProvider.credential(accessToken.tokenString);
      final userCredential = await _auth.signInWithCredential(credential);
      return await userCredential.user?.getIdToken();
    } catch (_) {
      return null;
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
