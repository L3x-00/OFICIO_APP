import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

/// Helper para descargar/compartir el QR estático de Yape de Servi.
///
/// La imagen está empaquetada como asset en `assets/images/yape/qr.jpeg`,
/// así que no hace falta red. Usamos `share_plus` (ya instalado) con
/// `XFile.fromData` — la OS share sheet expone "Guardar imagen"
/// (Android) o "Guardar en Fotos" (iOS), y también permite pasarla
/// directo a la app Yape sin tocar disco intermedio.
///
/// Se aísla en este file por mantenibilidad: si más adelante migramos
/// a `gal` o `saver_gallery` para auto-guardar sin share sheet, solo
/// cambia este archivo.
class YapeQrDownloader {
  YapeQrDownloader._();

  static const _assetPath = 'assets/images/yape/qr.jpeg';
  static const _fileName = 'yape-qr-servi.jpeg';
  static const _mimeType = 'image/jpeg';

  /// Abre la hoja de compartir del sistema con el QR. El usuario elige
  /// "Guardar imagen" para tenerlo en su galería y subirlo luego a la
  /// app de Yape como comprobante / referencia.
  ///
  /// Devuelve `true` si el sistema procesó el share (no garantiza que
  /// el usuario haya guardado realmente). `false` si falló la carga
  /// del asset.
  static Future<bool> share({String? text}) async {
    try {
      final data = await rootBundle.load(_assetPath);
      final bytes = data.buffer.asUint8List();
      final file = XFile.fromData(bytes, name: _fileName, mimeType: _mimeType);
      // share_plus 10.x → API estática `Share.shareXFiles`. La sheet
      // del sistema ofrece "Guardar imagen" como destino.
      await Share.shareXFiles([
        file,
      ], text: text ?? 'Escanea este QR en Yape para pagar tu plan Servi.');
      return true;
    } catch (_) {
      // Falla silenciosa del asset / sheet — el caller muestra el
      // feedback visible al user.
      return false;
    }
  }
}
