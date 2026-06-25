import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../core/theme/app_theme_colors.dart';

/// Librería central de skeleton loaders (shimmer) para dar feedback visual
/// inmediato mientras las pantallas hacen fetch al backend — en vez de
/// `CircularProgressIndicator` a pantalla completa o pantallas en blanco.
///
/// Todos respetan el tema (claro/oscuro) vía `context.colors`.

/// Bloque base con animación shimmer. Reutilizable para componer cualquier
/// skeleton (líneas de texto, avatares, imágenes).
class SkeletonBox extends StatelessWidget {
  final double? width;
  final double height;
  final double radius;

  const SkeletonBox({super.key, this.width, this.height = 14, this.radius = 8});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // base ligeramente más claro que el fondo de tarjeta; highlight aún más.
    // Highlight sutil para acabado premium suave (no destello fuerte).
    final base = c.bgInput;
    final highlight = c.isDark
        ? Colors.white.withValues(alpha: 0.05)
        : Colors.white.withValues(alpha: 0.40);
    return Shimmer.fromColors(
      baseColor: base,
      highlightColor: highlight,
      child: Container(
        width: width ?? double.infinity,
        height: height,
        decoration: BoxDecoration(
          color: base,
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}

/// Repite [itemBuilder] [count] veces en una lista vertical con separación.
/// Útil para reemplazar el loader de un listado por N skeletons.
class SkeletonList extends StatelessWidget {
  final int count;
  final double gap;
  final EdgeInsetsGeometry padding;
  final WidgetBuilder itemBuilder;

  const SkeletonList({
    super.key,
    required this.itemBuilder,
    this.count = 6,
    this.gap = 12,
    this.padding = const EdgeInsets.fromLTRB(16, 8, 16, 16),
  });

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: padding,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      separatorBuilder: (_, _) => SizedBox(height: gap),
      itemBuilder: (ctx, _) => itemBuilder(ctx),
    );
  }
}

/// Skeleton de una tarjeta de proveedor (lista principal): franja de imagen
/// + nombre + rating + ubicación + fila de acciones.
class ProviderCardSkeleton extends StatelessWidget {
  const ProviderCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SkeletonBox(width: 84, height: 84, radius: 14),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                SkeletonBox(width: 150, height: 15),
                SizedBox(height: 10),
                SkeletonBox(width: 90, height: 12),
                SizedBox(height: 10),
                SkeletonBox(width: 120, height: 12),
                SizedBox(height: 14),
                SkeletonBox(height: 34, radius: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Skeleton de una tarjeta de oferta pública / necesidad de subasta.
class OfferCardSkeleton extends StatelessWidget {
  const OfferCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Row(
            children: [
              SkeletonBox(width: 40, height: 40, radius: 20),
              SizedBox(width: 10),
              Expanded(child: SkeletonBox(width: 140, height: 14)),
              SizedBox(width: 10),
              SkeletonBox(width: 60, height: 22, radius: 8),
            ],
          ),
          SizedBox(height: 14),
          SkeletonBox(height: 13),
          SizedBox(height: 8),
          SkeletonBox(width: 220, height: 13),
          SizedBox(height: 14),
          SkeletonBox(height: 36, radius: 12),
        ],
      ),
    );
  }
}
