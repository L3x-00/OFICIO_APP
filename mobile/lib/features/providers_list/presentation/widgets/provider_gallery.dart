import 'package:flutter/material.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';

/// Galería de imágenes del proveedor con PageView e indicadores.
/// Al tocar una imagen abre el visor a pantalla completa con zoom.
class ProviderGallery extends StatefulWidget {
  final List<String> images;
  final Color accent;
  /// Botón opcional para superponer en la esquina inferior-derecha de la
  /// galería (típicamente, "Compartir perfil"). Si es null no se renderiza.
  final Widget? trailingAction;

  const ProviderGallery({
    super.key,
    required this.images,
    required this.accent,
    this.trailingAction,
  });

  @override
  State<ProviderGallery> createState() => _ProviderGalleryState();
}

class _ProviderGalleryState extends State<ProviderGallery> {
  int _currentIndex = 0;
  late final PageController _pageController = PageController(keepPage: true);

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _openFullscreen(int initialIndex) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            iconTheme: const IconThemeData(color: Colors.white),
          ),
          body: PhotoViewGallery.builder(
            itemCount: widget.images.length,
            pageController: PageController(initialPage: initialIndex),
            builder: (context, index) => PhotoViewGalleryPageOptions(
              imageProvider: NetworkImage(widget.images[index]),
              minScale: PhotoViewComputedScale.contained,
              maxScale: PhotoViewComputedScale.covered * 2,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SizedBox(
      height: 240,
      child: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            itemCount: widget.images.length,
            onPageChanged: (i) => setState(() => _currentIndex = i),
            itemBuilder: (context, index) => RepaintBoundary(
              child: GestureDetector(
                onTap: () => _openFullscreen(index),
                child: Image.network(
                  widget.images[index],
                  fit: BoxFit.cover,
                  width: double.infinity,
                  errorBuilder: (_, _, _) => Container(
                    color: c.bgInput,
                    child: Icon(
                      Icons.image_not_supported,
                      color: c.textMuted,
                      size: 48,
                    ),
                  ),
                  loadingBuilder: (_, child, progress) => progress == null
                      ? child
                      : Container(
                          color: c.bgInput,
                          child: const Center(
                            child: CircularProgressIndicator(
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                ),
              ),
            ),
          ),

          if (widget.images.length > 1)
            Positioned(
              bottom: 12,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  widget.images.length,
                  (i) => AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: i == _currentIndex ? 20 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: i == _currentIndex
                          ? widget.accent
                          : Colors.white.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              ),
            ),

          Positioned(
            top: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${_currentIndex + 1}/${widget.images.length}',
                style: TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ),

          // Acción superpuesta en la esquina inferior-derecha (compartir
          // perfil). Lift levantado por encima del row de indicadores
          // para que no choquen.
          if (widget.trailingAction != null)
            Positioned(
              bottom: widget.images.length > 1 ? 32 : 12,
              right: 12,
              child: widget.trailingAction!,
            ),
        ],
      ),
    );
  }
}
