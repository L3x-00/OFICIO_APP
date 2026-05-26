package com.oficioapp.mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    /**
     * El channel "servi_default_channel" (mismo id que el meta-data
     * `default_notification_channel_id` del AndroidManifest) tiene que
     * existir con importancia HIGH para que las notif push aparezcan
     * como heads-up en la parte superior estando la app en background.
     *
     * Sin esta creación explícita el sistema crea uno con importancia
     * DEFAULT (priority 3) y la notif queda silenciosa en el cajón.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ensureNotificationChannel()
    }

    private fun ensureNotificationChannel() {
        // NotificationChannel sólo existe en Android 8.0 (API 26) en adelante.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val existing = mgr.getNotificationChannel(CHANNEL_ID)
        if (existing != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Avisos de Servi",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Notificaciones del marketplace: ofertas, mensajes, novedades."
            enableLights(true)
            enableVibration(true)
        }
        mgr.createNotificationChannel(channel)
    }

    companion object {
        private const val CHANNEL_ID = "servi_default_channel"
    }
}
