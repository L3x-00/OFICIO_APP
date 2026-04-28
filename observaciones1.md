He probado la aplicación con los últimos cambios implementados. Encontré varios errores y observaciones que no se corrigieron. Adjunto los logs de Render y una lista detallada. Realiza las correcciones necesarias, haz commit y push.

## 1. Errores críticos en el Backend (Render Logs)

### 1.1 Error 400 en registro de proveedor (Bad Request Exception)
El registro de proveedor falla con `Bad Request Exception`. El `ValidationPipe` rechaza la petición porque las propiedades `website`, `instagram` y las nuevas redes sociales no están definidas en los DTOs del backend.
**Causa:** El DTO `register-provider.dto.ts` no se actualizó con los campos de redes sociales (`website`, `instagram`, `tiktok`, `facebook`, `linkedin`, `twitter`, `telegram`, `whatsappBiz`).
**Solución:** Actualiza `backend/src/auth/dto/register-provider.dto.ts` y `backend/src/provider-profile/provider-profile.service.ts` (método `updateMyProfile`) para aceptar y guardar estos nuevos campos.

### 1.2 Error de clave foránea al eliminar (Foreign key constraint violated)
Al intentar eliminar un usuario (`DELETE /admin/users/9`) o un proveedor (`DELETE /admin/providers/6`), falla con `Foreign key constraint violated on the constraint: provider_reports_userId_fkey`.
**Causa:** El esquema de Prisma (`schema.prisma`) no tiene configurada la eliminación en cascada (`onDelete: Cascade`) en la relación de `ProviderReport` (y posiblemente otras tablas como `PlatformIssue`, etc.).
**Solución:** Revisa el `schema.prisma` y asegura que **todas** las relaciones que apuntan a `User` y a `Provider` tengan `onDelete: Cascade`. Ejecuta `npx prisma db push` para aplicar los cambios.

### 1.3 Dependencia de eliminación circular / pg (DeprecationWarning)
El log muestra: `Calling client.query() when the client is already executing a query is deprecated`.
**Causa:** El método de eliminación en `admin.service.ts` (o `auth.service.ts`) probablemente ejecuta múltiples operaciones de borrado sin usar `await` correctamente o dentro de una transacción `prisma.$transaction`.
**Solución:** Refactoriza las funciones de eliminación para usar `await` correctamente o envuélvelas en un bloque `try/catch` con `$transaction` para evitar conflictos de pool.

## 2. Observaciones de Frontend (Flutter) no corregidas

### 2.1 Bucle de ubicación
Al registrarme manualmente, poner mi ubicación y luego mi rol, me vuelve a pedir la ubicación entrando en un bucle.
**Solución:** Revisa la lógica en `onboarding_screen.dart` para que no re-solicite la ubicación si ya fue proporcionada.

### 2.2 Login con Google: perfil no carga
Al registrarme con Google, la sección "Mi perfil" no carga.
**Solución:** Forzar una recarga del estado del perfil en `AuthProvider` justo después del login social exitoso.

### 2.3 Fotos no se cargan
Las fotos no se cargan correctamente al registrar el proveedor/negocio. El campo `avatarUrl` o las imágenes de la galería quedan vacías.
**Solución:** Asegurar que en `onboarding_screen.dart` y `panel_profile_tab.dart` se use `MultipartFile` correctamente y que después de subir la imagen, la URL se guarde y se muestre refrescando el estado del proveedor.

### 2.4 Publicar solicitud no funciona
El botón "Publicar solicitud" no hace nada.
**Solución:** Verificar que el formulario `publish_request_sheet.dart` esté completo y que el botón llame a la API correcta.

### 2.5 Mensaje de plan vencido incorrecto
Al adquirir un plan Estándar o Premium, sigue mostrando "plan vencido". Debe actualizarse a un mensaje más preciso. Si el plan se vence, debe pasar a plan Gratis y restringir el acceso que tenía en el plan de pago, mostrando un aviso 3 días antes del vencimiento.
**Solución:** Corregir la lógica en el `DashboardProvider` y en los componentes visuales (`panel_home_tab`, `panel_settings_tab`) para reflejar el plan activo real.

### 2.6 Cantidad de servicios/productos
En "Productos/Servicios", indicar explícitamente "3 servicios/productos" si es plan Gratis, y añadir botón "Subir de plan".
**Solución:** Usar `PlanLimits` en `panel_services_tab.dart` para mostrar los límites y el botón de upgrade.

### 2.7 Error de redes sociales
Al añadir `www.prueba.com` y guardar, sale error "property website should not exist". Los iconos no son representativos.
**Solución:** Además de la solución del punto 1.1, en Flutter, implementar los iconos correctos usando la librería `thesvg` y `flutter_svg`. Deben aparecer en la tarjeta del proveedor y ser clicables.

### 2.8 Validación de confianza (Rechazo)
El flujo de rechazo no funciona. El campo "Confianza y validación" no cambia a rojo ni muestra los botones correctos ("Ver detalles..." etc.).
**Solución:** Implementar la lógica visual en `panel_profile_tab.dart` para escuchar el estado de confianza y mostrar los diálogos adecuados.

### 2.9 Redirección al cerrar sesión
Al cerrar sesión desde el panel, se queda en la misma ventana en lugar de ir a la pantalla principal.
**Solución:** Llamar a `Navigator.of(context).pushAndRemoveUntil` para limpiar el stack y volver a la pantalla de inicio.

### 2.10 Mensaje emergente al activar plan
Al aprobarse un pago, no se muestra el mensaje emergente con los beneficios.
**Solución:** Implementar un listener de WebSocket o estado en el `DashboardProvider` que detecte el cambio de plan y lance el diálogo.

## 3. Cambio global de iconos (SVG)
Cambia **todos** los iconos decorativos de la app (estrellas, checks, iconos de redes sociales, etc.) por SVG usando la librería `flutter_svg` y los iconos del repositorio `thesvg` (https://thesvg.org). La app ya tiene `flutter_svg: ^2.2.4` instalada. Usa los iconos de la librería para reemplazar los íconos de `Icons` de Material Design en botones y decoraciones.

Realiza los commits necesarios y reporta el estado final.