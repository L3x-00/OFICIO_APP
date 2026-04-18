import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

/// Servicio centralizado de permisos de la app.
///
/// Uso:
///   final pos = await PermissionService.getCurrentLocation(context);
///   final ok  = await PermissionService.requestCamera(context);
class PermissionService {
  PermissionService._();

  // ── UBICACIÓN ────────────────────────────────────────────

  /// Solicita permiso de ubicación y devuelve la posición actual.
  /// Retorna null si el usuario deniega o si el GPS está desactivado.
  static Future<Position?> getCurrentLocation(BuildContext context) async {
    // 1. Verificar si el servicio de ubicación está habilitado
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (context.mounted) {
        await _showDialog(
          context,
          title: 'GPS desactivado',
          message: 'Activa la ubicación en los ajustes de tu dispositivo para continuar.',
          actionLabel: 'Abrir ajustes',
          onAction: () => Geolocator.openLocationSettings(),
        );
      }
      return null;
    }

    // 2. Verificar / solicitar permiso
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (context.mounted) {
          _showSnack(context, 'Permiso de ubicación denegado. No se puede verificar.');
        }
        return null;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (context.mounted) {
        await _showDialog(
          context,
          title: 'Permiso bloqueado',
          message: 'Habilitaste "No preguntar de nuevo". Ve a Ajustes > Aplicaciones > ConfiServ > Permisos.',
          actionLabel: 'Abrir ajustes',
          onAction: () => openAppSettings(),
        );
      }
      return null;
    }

    // 3. Obtener posición actual
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
    } catch (e) {
      if (context.mounted) {
        _showSnack(context, 'No se pudo obtener la ubicación. Intenta de nuevo.');
      }
      return null;
    }
  }

  // ── CÁMARA ────────────────────────────────────────────────

  /// Solicita permiso de cámara explícitamente.
  /// `image_picker` lo hace internamente, pero este método permite
  /// mostrarlo proactivamente con mensaje personalizado.
  static Future<bool> requestCamera(BuildContext context) async {
    final status = await Permission.camera.request();
    if (status.isGranted) return true;

    if (status.isPermanentlyDenied && context.mounted) {
      await _showDialog(
        context,
        title: 'Cámara bloqueada',
        message: 'Habilita el permiso de cámara en Ajustes > Aplicaciones > ConfiServ.',
        actionLabel: 'Abrir ajustes',
        onAction: openAppSettings,
      );
    } else if (context.mounted) {
      _showSnack(context, 'Permiso de cámara denegado.');
    }
    return false;
  }

  // ── GALERÍA ───────────────────────────────────────────────

  /// Solicita permiso de galería/almacenamiento según la versión de Android.
  static Future<bool> requestGallery(BuildContext context) async {
    // Android 13+: READ_MEDIA_IMAGES | Android ≤12: READ_EXTERNAL_STORAGE
    final permission = Permission.photos;
    final status = await permission.request();
    if (status.isGranted || status.isLimited) return true;

    if (status.isPermanentlyDenied && context.mounted) {
      await _showDialog(
        context,
        title: 'Galería bloqueada',
        message: 'Habilita el permiso de fotos en Ajustes > Aplicaciones > ConfiServ.',
        actionLabel: 'Abrir ajustes',
        onAction: openAppSettings,
      );
    }
    return false;
  }

  // ── SOLICITAR TODOS AL INICIO DE SESIÓN ──────────────────

  /// Solicita los permisos más críticos juntos (se llama desde la pantalla
  /// principal al iniciar sesión por primera vez).
  static Future<void> requestAllOnFirstLaunch(BuildContext context) async {
    await [
      Permission.camera,
      Permission.photos,
      Permission.location,
    ].request();
  }

  // ── HELPERS PRIVADOS ──────────────────────────────────────

  static void _showSnack(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 3)),
    );
  }

  static Future<void> _showDialog(
    BuildContext context, {
    required String title,
    required String message,
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    return showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              onAction();
            },
            child: Text(actionLabel),
          ),
        ],
      ),
    );
  }
}
