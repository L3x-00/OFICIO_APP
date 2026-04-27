Realiza una **auditoría técnica exhaustiva** de todo el proyecto OficioApp (backend NestJS, frontend Flutter y panel administrativo Next.js). Ya se han completado las integraciones de notificaciones push (Firebase Cloud Messaging) y geolocalización precisa (Nominatim), por lo que debes analizar también esos nuevos módulos.

**IMPORTANTE: Solo debes documentar los hallazgos. No modifiques ningún archivo del proyecto. No apliques ninguna corrección. El único archivo nuevo que debes crear es `AUDITORÍA_TÉCNICA.md` en la raíz del proyecto.**

---

## 📋 Alcance de la auditoría

Analiza cada uno de los siguientes aspectos y documenta tus hallazgos de forma clara, clasificándolos por severidad (🔴 Crítica, 🟠 Alta, 🟡 Media, ⚪ Baja) y por área (Seguridad, Rendimiento, Mantenibilidad, Escalabilidad).

---

### 1. 🔐 Seguridad

#### 1.1 Vulnerabilidades en dependencias
- Ejecuta `npm audit` en `backend/` y `admin/`. Ejecuta `flutter pub outdated` en `mobile/`.
- Lista **todas** las vulnerabilidades encontradas con su severidad y el paquete afectado.
- Indica si `npm audit fix --force` rompería la compatibilidad (breaking changes).
- Para cada vulnerabilidad crítica o alta, sugiere la acción recomendada (actualizar a versión X, cambiar a otra librería, etc.).

#### 1.2 Exposición de secretos y configuración
- Revisa los archivos `.env`, `.env.example`, `key.properties`, `release-key.jks` y `firebase-service-account.json`.
- Verifica que todos estén en `.gitignore`.
- **Revisa el historial de Git** para detectar si alguno fue commiteado en el pasado. Si encuentras evidencia, anótalo como hallazgo crítico.
- Revisa las variables de entorno actuales en Render y Vercel (no tienes acceso, pero revisa `.env.example` y los archivos de configuración para detectar valores inseguros o expuestos).

#### 1.3 Configuración de seguridad HTTP
- Revisa `main.ts` del backend: ¿está instalado y configurado `helmet`?
- Revisa la configuración de CORS: ¿está restringido a orígenes específicos o usa `*`?
- Revisa si hay un `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`.
- Anota cualquier carencia encontrada.

#### 1.4 Rate limiting y protección contra abusos
- Revisa la configuración de `@nestjs/throttler` en `app.module.ts`.
- Identifica endpoints sensibles (`/auth/register`, `/auth/social-login`, endpoints de subida) que no tengan límites más estrictos.
- Anota las carencias y sugiere límites recomendados.

#### 1.5 Inyección SQL y consultas inseguras
- Busca en todo el backend cualquier uso de `$queryRaw` o `$executeRaw` de Prisma.
- Para cada ocurrencia, verifica si usa parámetros tipados (`Prisma.sql`) o concatenación manual de strings.
- Anota cualquier uso inseguro encontrado.

#### 1.6 JWT y autenticación
- Revisa la configuración de JWT: longitud de los secretos, tiempos de expiración, rotación de refresh tokens.
- Revisa si existe una lista negra de tokens revocados.
- Revisa `jwt.strategy.ts` y `jwt.guard.ts`.
- Anota cualquier debilidad encontrada.

#### 1.7 WebSocket seguro
- Revisa `events.gateway.ts`: ¿el WebSocket solo acepta conexiones autenticadas?
- ¿Los eventos de administrador están restringidos al rol `ADMIN`?
- Anota cualquier carencia.

---

### 2. ⚡ Rendimiento

#### 2.1 Consultas N+1 de Prisma
- Analiza todos los servicios del backend y busca patrones donde se haga un `findMany` y luego se itere para obtener relaciones relacionadas.
- Lista los archivos y métodos donde se detecte este patrón.

#### 2.2 Índices faltantes en PostgreSQL
- Revisa el `schema.prisma` y compara con las queries más frecuentes en los servicios.
- Sugiere índices compuestos que podrían mejorar el rendimiento (añadiendo la sintaxis `@@index` que debería usarse).

#### 2.3 Compresión y caché
- Revisa si el backend tiene `compression` middleware instalado.
- Revisa la configuración de `CacheModule` y `CacheInterceptor`. ¿Está aplicado a endpoints públicos?
- Anota las carencias.

#### 2.4 Tamaño del APK
- Revisa `build.gradle.kts` de la app Flutter: ¿está habilitado `minifyEnabled` y `shrinkResources`?
- Revisa la carpeta `assets/` en busca de imágenes innecesarias o no optimizadas.
- Anota el tamaño actual del APK (si puedes obtenerlo del último build) y sugiere mejoras.

#### 2.5 Lazy loading en el Admin
- Revisa si las páginas del panel administrativo usan `dynamic(() => import(...))` para cargarse solo cuando se visitan.
- Anota si esto no está implementado.

---

### 3. 🧹 Mantenibilidad

#### 3.1 Providers de Flutter demasiado grandes
- Mide el número de líneas de `auth_provider.dart` y `dashboard_provider.dart`.
- Identifica responsabilidades mezcladas dentro de cada provider.
- Sugiere cómo dividirlos en providers más pequeños y cohesivos.

#### 3.2 Código duplicado
- Busca lógica de validación de imágenes repetida en varios controladores del backend.
- Busca widgets similares en Flutter que podrían extraerse como widgets reutilizables.
- Lista los archivos y funciones duplicados.

#### 3.3 TypeScript estricto y errores TS
- Ejecuta `npx tsc --noEmit` en el backend y lista los errores encontrados (ignorando los de archivos `.spec.ts` que son tests viejos rotos).
- Revisa si `tsconfig.json` tiene `strict: true`.

#### 3.4 Tests automatizados
- Verifica la existencia de tests unitarios y de integración en backend y Flutter.
- Anota la cobertura actual (aproximada) y sugiere qué módulos deberían tener tests prioritarios.

---

### 4. 📈 Escalabilidad

#### 4.1 Límites actuales de servicios gratuitos
- Revisa la documentación existente (`ESTADO_ACTUAL.md`, `ARQUITECTURA_DESPLIEGUE.md`) y anota los límites de cada servicio gratuito (Supabase, Brevo, Upstash, Render, Cloudflare R2, Vercel).
- Indica cuál sería el primer servicio en fallar si la app crece.

#### 4.2 Preparación para microservicios
- Identifica qué módulos del backend son candidatos a separarse en el futuro.
- Sugiere cómo se comunicarían (Redis Pub/Sub, BullMQ, etc.).

---

### 5. 🔍 Revisión de los nuevos módulos integrados

#### 5.1 Notificaciones push (FCM)
- Revisa `push-notifications.service.ts` y `fcm_service.dart`.
- ¿Se está limpiando el token FCM si Firebase devuelve un error de token inválido?
- ¿Se está enviando el token al backend después de cada inicio de sesión?
- ¿Se manejan los tres escenarios de notificaciones (primer plano, segundo plano, app cerrada)?
- Anota cualquier carencia.

#### 5.2 Geocodificación (Nominatim)
- Revisa `geocoding_service.dart` y `location_picker_sheet.dart`.
- ¿Se está respetando el User-Agent recomendado por Nominatim?
- ¿Hay un timeout configurado?
- ¿Se maneja correctamente el fallo (sin GPS, sin internet)?
- Anota cualquier carencia.

---

## 📄 Formato del archivo de salida

Crea **exclusivamente** un archivo llamado `AUDITORÍA_TÉCNICA.md` en la raíz del proyecto (`c:\Users\Usuario\oficio_app\AUDITORÍA_TÉCNICA.md`) con la siguiente estructura:

```markdown
# Auditoría Técnica de OficioApp

**Fecha**: [fecha actual]
**Versión del sistema**: Hito 8.1+
**Propósito**: Documentar hallazgos de seguridad, rendimiento, mantenibilidad y escalabilidad.

---

## 🔴 Críticos

### [Área] Título del hallazgo
- **Archivo**: ruta del archivo
- **Descripción**: qué se encontró
- **Riesgo**: qué podría pasar si no se corrige
- **Sugerencia**: cómo solucionarlo

---

## 🟠 Alta

### [Área] Título del hallazgo
- ...

---

## 🟡 Media

### [Área] Título del hallazgo
- ...

---

## ⚪ Baja

### [Área] Título del hallazgo
- ...

---

## 📊 Resumen

| Severidad | Cantidad |
|-----------|----------|
| 🔴 Crítica | X |
| 🟠 Alta | X |
| 🟡 Media | X |
| ⚪ Baja | X |

---

## ✅ Conclusiones y recomendaciones

(Un párrafo resumiendo el estado general y los próximos pasos recomendados)