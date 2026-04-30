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

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      return Image.network(
        url,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: errorWidget != null
            ? (_, _e, _s) => errorWidget!
            : null,
        loadingBuilder: placeholder != null
            ? (_, child, progress) =>
                progress == null ? child : placeholder!
            : null,
      );
    }
    return CachedNetworkImage(
      imageUrl: url,
      fit: fit,
      width: width,
      height: height,
      placeholder: placeholder != null ? (_, _u) => placeholder! : null,
      errorWidget: errorWidget != null ? (_, _u, _e) => errorWidget! : null,
    );
  }
}
