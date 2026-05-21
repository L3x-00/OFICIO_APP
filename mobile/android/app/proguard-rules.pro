# ──────────────────────────────────────────────────────────────────────
# Servi · ProGuard / R8 rules
# Activado por isMinifyEnabled + isShrinkResources en build.gradle.kts.
# Mantén estas reglas pequeñas y específicas — cada `-keep` extra es
# tamaño que NO se elimina del APK.
# ──────────────────────────────────────────────────────────────────────

# ── Flutter framework ─────────────────────────────────────────────────
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.embedding.** { *; }
-keep class io.flutter.** { *; }
-dontwarn io.flutter.embedding.**

# ── Firebase (Auth, Messaging, Analytics, Core) ──────────────────────
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Firebase Messaging usa reflection para los handlers de mensajes.
-keep class com.google.firebase.messaging.** { *; }
-keep class * extends com.google.firebase.messaging.FirebaseMessagingService { *; }

# ── Java Serializable ────────────────────────────────────────────────
# Mantén constructores y campos estándar de cualquier clase Serializable
# (necesarios para deserializar correctamente datos persistidos).
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ── Parcelable (Android) ─────────────────────────────────────────────
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# ── Gson / JSON-via-reflection ───────────────────────────────────────
-keepattributes Signature, *Annotation*, EnclosingMethod, InnerClasses
-keep class com.google.gson.** { *; }
-dontwarn com.google.gson.**

# ── Plugins comunes en Servi ─────────────────────────────────────
# Dio (Flutter package) — usa reflection en algunos backends.
-dontwarn okhttp3.**
-dontwarn okio.**

# image_picker / camera — los plugins usan reflection en el bridge.
-keep class io.flutter.plugins.imagepicker.** { *; }
-keep class io.flutter.plugins.camera.** { *; }

# Geolocator
-keep class com.baseflow.geolocator.** { *; }

# ── Sentry ───────────────────────────────────────────────────────────
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# ── Suppress R8 warnings inofensivos ─────────────────────────────────
-dontwarn javax.annotation.**
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**
