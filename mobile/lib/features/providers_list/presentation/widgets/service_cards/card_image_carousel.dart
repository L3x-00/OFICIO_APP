import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/material.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';
import '../../../domain/models/provider_model.dart';

/// Carrusel automático de imágenes de portada, reutilizable por todas las
/// variantes de tarjeta (default, lista, contenido, mosaico).
///
/// Reglas:
///   • 0–1 imagen  → imagen única estática (igual que antes, sin timer).
///   • 2+ imágenes → autoPlay cada 3 s, loop infinito, curva suave, con dots
///     pequeños y semitransparentes en la esquina inferior derecha.
///
/// El alto/ancho se preservan exactamente (parámetros [width]/[height]) para
/// no deformar el layout. Si [height] es null, ocupa el alto disponible del
/// padre (ej. dentro de un `Expanded`) vía `LayoutBuilder`.
///
/// Sigue usando [AppNetworkImage] (CachedNetworkImage en nativo) por imagen
/// para conservar caché y rendimiento.
class ProviderImageCarousel extends StatefulWidget {
  final ProviderModel provider;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget placeholder;
  final Widget errorWidget;
  final double dotSize;

  const ProviderImageCarousel({
    super.key,
    required this.provider,
    required this.placeholder,
    required this.errorWidget,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.dotSize = 6,
  });

  @override
  State<ProviderImageCarousel> createState() => _ProviderImageCarouselState();
}

class _ProviderImageCarouselState extends State<ProviderImageCarousel> {
  int _current = 0;

  /// Lista de imágenes = portada + miniaturas (deduplicada, sin vacíos).
  /// El modelo no expone `images`, pero sí `coverImageUrl` + `thumbnailUrls`.
  List<String> get _images {
    final p = widget.provider;
    final raw = <String>[
      if (p.coverImageUrl != null && p.coverImageUrl!.isNotEmpty)
        p.coverImageUrl!,
      ...p.thumbnailUrls.where((u) => u.isNotEmpty),
    ];
    final seen = <String>{};
    return raw.where(seen.add).toList();
  }

  @override
  Widget build(BuildContext context) {
    final images = _images;

    // 0 o 1 imagen → comportamiento original, sin carrusel ni timer.
    if (images.length <= 1) {
      return _singleImage(images.isEmpty ? null : images.first);
    }

    return SizedBox(
      width: widget.width,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final h =
              widget.height ??
              (constraints.maxHeight.isFinite ? constraints.maxHeight : null);
          // Sin alto finito el carrusel no puede montarse → imagen única.
          if (h == null) return _singleImage(images.first);
          final w =
              widget.width ??
              (constraints.maxWidth.isFinite
                  ? constraints.maxWidth
                  : double.infinity);

          return Stack(
            children: [
              CarouselSlider.builder(
                itemCount: images.length,
                options: CarouselOptions(
                  height: h,
                  viewportFraction: 1.0,
                  autoPlay: true,
                  autoPlayInterval: const Duration(seconds: 3),
                  autoPlayAnimationDuration: const Duration(milliseconds: 800),
                  autoPlayCurve: Curves.easeInOutCubic,
                  enableInfiniteScroll: true,
                  onPageChanged: (i, _) => setState(() => _current = i),
                ),
                itemBuilder: (context, index, _) => AppNetworkImage(
                  url: images[index],
                  width: w,
                  height: h,
                  fit: widget.fit,
                  placeholder: widget.placeholder,
                  errorWidget: widget.errorWidget,
                ),
              ),
              // Dots: pequeños, semitransparentes, esquina inferior derecha.
              // No tapan nombre/botones (van sobre la imagen).
              Positioned(
                right: 6,
                bottom: 6,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(images.length, (i) {
                    final active = i == _current;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.only(left: 3),
                      width: active ? widget.dotSize * 1.7 : widget.dotSize,
                      height: widget.dotSize,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(
                          alpha: active ? 0.9 : 0.45,
                        ),
                        borderRadius: BorderRadius.circular(widget.dotSize),
                        boxShadow: const [
                          BoxShadow(color: Color(0x33000000), blurRadius: 2),
                        ],
                      ),
                    );
                  }),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  /// Imagen estática única — preserva exactamente el render anterior.
  Widget _singleImage(String? url) {
    if (url == null) return widget.placeholder;
    return AppNetworkImage(
      url: url,
      width: widget.width ?? double.infinity,
      height: widget.height ?? double.infinity,
      fit: widget.fit,
      placeholder: widget.placeholder,
      errorWidget: widget.errorWidget,
    );
  }
}
