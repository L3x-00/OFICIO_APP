import 'package:flutter/material.dart';

/// Visor de imagen a pantalla completa con zoom y pan.
class ReviewImageFullscreen extends StatelessWidget {
  final String imageUrl;
  final String heroTag;

  const ReviewImageFullscreen({
    super.key,
    required this.imageUrl,
    required this.heroTag,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12, top: 8),
            child: GestureDetector(
              onTap: () => Navigator.of(context).pop(),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.55),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.close_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ),
        ],
      ),
      body: Center(
        child: Hero(
          tag: heroTag,
          child: InteractiveViewer(
            minScale: 0.5,
            maxScale: 5.0,
            clipBehavior: Clip.none,
            child: Image.network(
              imageUrl,
              fit: BoxFit.contain,
              loadingBuilder: (_, child, progress) {
                if (progress == null) return child;
                return Center(
                  child: CircularProgressIndicator(
                    value: progress.expectedTotalBytes != null
                        ? progress.cumulativeBytesLoaded /
                            progress.expectedTotalBytes!
                        : null,
                    color: Colors.white54,
                    strokeWidth: 2,
                  ),
                );
              },
              errorBuilder: (_, _, _) => const Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.broken_image_rounded,
                      color: Colors.white24, size: 64),
                  SizedBox(height: 12),
                  Text(
                    'No se pudo cargar la imagen',
                    style: TextStyle(color: Colors.white38, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
