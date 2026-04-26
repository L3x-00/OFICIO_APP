allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}

subprojects {
    project.evaluationDependsOn(":app")
}

// Fuerza JVM 17 en todas las tareas Kotlin de subproyectos (incluido sentry_flutter).
// No tocamos JavaCompile — el Android Gradle Plugin gestiona su classpath internamente
// y modificarlo post-evaluación rompe la resolución del Android SDK.
// kotlin.jvm.target.validation.mode=IGNORE en gradle.properties suprime el desajuste
// residual Java 1.8 / Kotlin 17 de plugins de terceros.
gradle.projectsEvaluated {
    subprojects.forEach { subproject ->
        subproject.tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinJvmCompile>().configureEach {
            compilerOptions {
                jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
                // Mínimo soportado por Kotlin 2.x — sobreescribe "1.6" de sentry_flutter
                languageVersion.set(org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_1_9)
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}