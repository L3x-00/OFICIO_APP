import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Widget de imagen de red compatible con Flutter Web y nativo.
///
/// - Web: usa Image.network() → renderiza como <img> → sin restricción CORS.
/// - Nativo (Android/iOS): usa CachedNetworkImage → caché en disco.
class AppNetworkImage extends StatelessWidget {
  final String url;
  final BoxFit fit;
  final Widget? errorWidget;
  final Widget? placeholder;
  final double? width;
  final double? height;

  const AppNetworkImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.errorWidget,
    this.placeholder,
    this.width,
    this.height,
  });

  /// Clave de caché ESTABLE para R2: ignora los parámetros de presign
  /// (`X-Amz-*`, `Expires`) que el backend regenera en CADA respuesta. Sin
  /// esto, la misma imagen se re-descargaba cada vez que su firma cambiaba
  /// (típico al cerrar sesión y reentrar como invitado: el backend devuelve
  /// URLs con firma nueva → CachedNetworkImage indexaba por la URL completa →
  /// cache miss → carga lentísima). Con la clave estable, el archivo en disco
  /// se reutiliza aunque la firma cambie.
  static String stableCacheKey(String url) {
    try {
      final uri = Uri.parse(url);
      if (uri.queryParameters.isEmpty) return url;
      final kept = Map<String, String>.from(uri.queryParameters)
        ..removeWhere((k, _) {
          final lk = k.toLowerCase();
          return lk.startsWith('x-amz-') || lk == 'expires';
        });
      // OJO: `Uri.replace(queryParameters: null)` NO elimina el query (null
      // = "no cambiar"). Si tras quitar los presign no queda nada, cortamos
      // la URL en el '?' para devolverla SIN query (clave estable de verdad).
      if (kept.isEmpty) {
        final q = url.indexOf('?');
        return q >= 0 ? url.substring(0, q) : url;
      }
      return uri.replace(queryParameters: kept).toString();
    } catch (_) {
      return url;
    }
  }

  /// Pre-carga una imagen al caché (disco + memoria) con la MISMA cacheKey
  /// estable que usa el render, para que el primer paint sea instantáneo
  /// (ej. portadas del Home al entrar como invitado). Best-effort: ignora
  /// errores y se omite en web (allí se usa Image.network sin cache manager).
  static Future<void> precache(String url, BuildContext context) {
    if (url.isEmpty || kIsWeb) return Future<void>.value();
    return precacheImage(
      CachedNetworkImageProvider(url, cacheKey: stableCacheKey(url)),
      context,
    ).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      return Image.network(
        url,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: errorWidget != null ? (_, e, s) => errorWidget! : null,
        loadingBuilder: placeholder != null
            ? (_, child, progress) => progress == null ? child : placeholder!
            : null,
      );
    }
    // Decodificar a ~2x el tamaño de pantalla del widget (no a resolución
    // completa) recorta memoria y acelera el primer render. Solo cuando el
    // ancho es finito — un Expanded/infinito reventaría `.round()`.
    final memW = (width != null && width!.isFinite)
        ? (width! * 2).round()
        : null;
    return CachedNetworkImage(
      imageUrl: url,
      cacheKey: stableCacheKey(url),
      fit: fit,
      width: width,
      height: height,
      memCacheWidth: memW,
      fadeInDuration: const Duration(milliseconds: 200),
      placeholder: placeholder != null ? (_, u) => placeholder! : null,
      errorWidget: errorWidget != null ? (_, u, e) => errorWidget! : null,
    );
  }
}
