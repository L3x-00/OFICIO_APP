# Registro de Errores — OficioApp

Documentación de bugs graves ya resueltos para evitar regresiones.

---

## E-001 — Congelamiento post-registro OTP (Navigator stack)

**Síntoma**: Completar el OTP mostraba el modal "¡Cuenta Verificada!", el usuario tocaba "Continuar", la app se congelaba en la pantalla de selección de rol sin poder avanzar.

**Causa raíz**: `_showSuccessDialog` ejecutaba:
```dart
Navigator.of(context, rootNavigator: true).pop();
Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const OnboardingScreen()));
```
Esto apilaba una *segunda* `OnboardingScreen` encima de la que ya existía. Cuando `_AppRoot` reaccionaba a `navigationState = authenticated`, la segunda copia bloqueaba la UI.

**Fix** (`otp_verification_screen.dart`):
```dart
Navigator.of(ctx, rootNavigator: true).popUntil((route) => route.isFirst);
```

**Regla**: Nunca `pushReplacement(OnboardingScreen)` desde un diálogo. Usar `popUntil(isFirst)` y dejar que `_AppRoot` maneje las transiciones reactivamente.

---

## E-002 — Botón atrás en pantalla de rol sale de la app sin cancelar registro

**Síntoma**: En `OnboardingScreen` ("¿Cómo te ayudamos hoy?"), el botón de retroceso cerraba la pantalla y salía de la app sin cancelar el registro pendiente.

**Causa raíz**: Sin `PopScope` ni AppBar con cancelar. El sistema manejaba el pop directamente.

**Fix** (`onboarding_screen.dart`):
- `PopScope(canPop: false, onPopInvokedWithResult: ...)` envuelve el Scaffold.
- AppBar con flecha llama `_confirmCancel()`.
- Confirmación → `AuthProvider.logout()` → `_AppRoot` retorna a `unauthenticated`.

**Regla**: Toda pantalla con estado de registro pendiente debe interceptar el back button con `PopScope(canPop: false)`.

---

## E-003 — Fotos no se cargan (presigned URLs expiradas + CORS en Flutter Web)

**Síntoma**: Fotos de Google funcionaban. Fotos subidas manualmente mostraban placeholder/iniciales.

**Causa raíz (A)**: `uploadFile` guardaba URL pre-firmada en BD. `SignImagesInterceptor` saltaba URLs que ya tenían `X-Amz-Signature`. Al expirar los 7 días → inválidas, nadie las re-firmaba.

**Causa raíz (B)**: `CachedNetworkImage` en Flutter Web compila a XHR/fetch → CORS bloqueado por R2 (sin headers CORS). Google Photos tiene `Access-Control-Allow-Origin: *`, por eso funcionaban.

**Fix**:
1. `minio.service.ts` → siempre guarda URL canónica (sin firma) en BD.
2. `sign-images.interceptor.ts` → firma CUALQUIER URL de R2, sin excepción.
3. `app_network_image.dart` → en web usa `Image.network()` (`<img>` HTML, sin CORS); en nativo usa `CachedNetworkImage`.

**Regla**: Nunca guardar URLs pre-firmadas en BD. En Flutter Web, usar `AppNetworkImage` en vez de `CachedNetworkImage` directamente.

---

## E-004 — Google Sign-In no muestra pantalla de consentimiento

**Nota**: No es un bug de código.

**Comportamiento**: Solo aparece selector de cuenta, luego salta a selección de rol sin pantalla de consentimiento de Google.

**Explicación**: Google OAuth omite consentimiento para cuentas que ya autorizaron la app. Solo se muestra en la primera autorización. Comportamiento estándar de Firebase Auth.

**Acción**: Ninguna — documentado para evitar confusión futura.
