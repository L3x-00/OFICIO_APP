Analiza a fondo el siguiente problema de compilación en un proyecto Flutter y proporciona una solución definitiva. El proyecto ya tiene el backend (NestJS) y el panel de administración (Next.js) desplegados y funcionando en Render y Vercel respectivamente. Todas las integraciones (Firebase Auth, Cloudflare R2, Resend, Supabase, Upstash) están operativas. Ahora se necesita generar el APK de release para distribución directa.

**Contexto técnico:**
- Flutter 3.41.6, JDK 17 (Eclipse Adoptium 17.0.18), Gradle 8.14, Kotlin configurado en 2.0.21 (según `gradle-wrapper.properties` y `settings.gradle.kts`).
- El APK se compila con el comando: `flutter build apk --release --dart-define=API_BASE_URL=https://oficio-backend.onrender.com`
- La firma del APK (keystore, key.properties, signingConfigs) ya está configurada correctamente.
- Las dependencias incluyen `sentry_flutter: ^8.14.2` y `firebase_auth`, entre otras.

**Problema actual:**
Al ejecutar la compilación, falla con el siguiente error:


Se ha intentado forzar la versión de Java a 17 en todos los módulos agreFAILURE: Build failed with an exception.

What went wrong:
Execution failed for task ':sentry_flutter:compileReleaseKotlin'.

Inconsistent JVM Target Compatibility Between Java and Kotlin Tasks
Inconsistent JVM-target compatibility detected for tasks 'compileReleaseJavaWithJavac' (1.8) and 'compileReleaseKotlin' (17).gando en `android/build.gradle.kts`:

```kotlin
tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
    compilerOptions {
        languageVersion.set(org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_2_0)
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}
tasks.withType<JavaCompile>().configureEach {
    sourceCompatibility = JavaVersion.VERSION_17.toString()
    targetCompatibility = JavaVersion.VERSION_17.toString()
}
Lo que se necesita:

Análisis de la causa raíz: Explica por qué ocurre esta inconsistencia específicamente con el módulo sentry_flutter (y posiblemente otros) a pesar de tener configuraciones globales. ¿Es un problema de orden de evaluación de Gradle? ¿De versiones de plugins? ¿De dependencias transitivas que fijan un target obsoleto?

Motivación y efectos: Describe cómo afecta este error al proceso de compilación y por qué es crítico resolverlo sin simplemente deshabilitar la dependencia.

Solución definitiva: Proporciona instrucciones paso a paso para modificar los archivos de configuración dentro de la carpeta mobile/ (especialmente android/build.gradle.kts, android/settings.gradle.kts, android/gradle.properties, y si es necesario android/app/build.gradle.kts) para eliminar la inconsistencia y garantizar una compilación exitosa. La solución debe:

Ser compatible con JDK 17 y Gradle 8.14.

No romper las integraciones existentes (Firebase, etc.).

Asegurar que todos los módulos (incluidos los de terceros como sentry_flutter) usen JVM target 17.

Si es necesario actualizar sentry_flutter u otra dependencia, indica la versión exacta y los cambios en pubspec.yaml.

Resumen final: Después de aplicar la solución, presenta un breve resumen de los cambios realizados y confirma que el APK puede compilarse sin errores.

