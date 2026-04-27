Implementa las notificaciones push con Firebase Cloud Messaging (FCM) en el proyecto, tanto en el backend NestJS como en la app Flutter. La API ya está habilitada en la consola de Firebase y el backend ya tiene configurado `firebase-admin` (usado para autenticación social). No es necesario añadir nuevas variables de entorno.

**Backend (NestJS):**
1. Crea un endpoint `PATCH /users/me/device-token` en `users.controller.ts` que reciba `{ token: string }` y lo guarde en un nuevo campo `fcmToken` del modelo `User` de Prisma.
2. Añade el campo `fcmToken String?` al modelo `User` en `prisma/schema.prisma`. Luego ejecuta `npx prisma db push` (sin borrar datos) para sincronizar la base de datos.
3. Crea un servicio `PushNotificationsService` que use `firebase-admin` para enviar notificaciones a un token. Debe tener un método `sendToUser(userId: number, title: string, body: string, data?: Record<string, string>)` que busque el token del usuario y llame a `admin.messaging().send(...)`.
4. Integra el envío de notificaciones push en los flujos que ya emiten notificaciones WebSocket: cuando un proveedor recibe una nueva reseña, cuando se aprueba/rechaza un plan, cuando llega una nueva oferta en una subasta, etc.

**Flutter:**
1. Añade la dependencia `firebase_messaging` en `pubspec.yaml` y ejecuta `flutter pub get`.
2. En `main.dart`, después de `Firebase.initializeApp()`, configura FCM:
   - Solicita permisos de notificación con `FirebaseMessaging.instance.requestPermission()`.
   - Obtiene el token con `FirebaseMessaging.instance.getToken()`.
   - Envía ese token al backend con `PATCH /users/me/device-token` después de iniciar sesión.
3. Maneja los tres escenarios de notificaciones:
   - **Primer plano**: muestra un `SnackBar` o un diálogo con el título y cuerpo.
   - **Segundo plano y toque**: navega a la pantalla correspondiente según los datos adjuntos (por ejemplo, si la notificación es de una nueva reseña, abre la pantalla de reseñas).
   - **App completamente cerrada**: al abrir desde una notificación, también navega según los datos.
4. Añade logs para depurar: imprime en consola el token FCM y cuando se recibe una notificación.