import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../data/providers_repository.dart';
import '../../widgets/parent_category_icons.dart';

/// Grid de macrocategorías + subcategorías expandibles del filter sheet.
class CategorySheetSection extends StatelessWidget {
  final List<CategoryModel> categories;
  final String? selectedParent;
  final String? selectedLeaf;
  final ValueChanged<String> onParentTap;
  final ValueChanged<String> onLeafTap;

  const CategorySheetSection({
    super.key,
    required this.categories,
    required this.selectedParent,
    required this.selectedLeaf,
    required this.onParentTap,
    required this.onLeafTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Grid de macrocategorías ──────────────────────
        GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          shrinkWrap: true,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 0.85,
          ),
          itemCount: categories.length,
          itemBuilder: (_, i) {
            final parent   = categories[i];
            final icon     = kParentCategoryIcons[parent.slug] ?? Icons.category_rounded;
            final isSel    = selectedParent == parent.slug;
            final hasLeaf  = isSel && selectedLeaf != null;

            return GestureDetector(
              onTap: () => onParentTap(parent.slug),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                decoration: BoxDecoration(
                  color: isSel
                      ? AppColors.primary.withValues(alpha: 0.12)
                      : c.bgCard,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isSel
                        ? AppColors.primary.withValues(alpha: 0.4)
                        : c.border,
                    width: isSel ? 1.5 : 1,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Icon(
                          icon,
                          size: 26,
                          color: isSel ? AppColors.primary : c.textMuted,
                        ),
                        if (hasLeaf)
                          Positioned(
                            top: -4, right: -6,
                            child: Container(
                              width: 10, height: 10,
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                                border: Border.all(color: c.bgCard, width: 1.5),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      parent.name,
                      style: TextStyle(
                        color: isSel ? AppColors.primary : c.textSecondary,
                        fontSize: 10,
                        fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                        height: 1.2,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          },
        ),

        // ── Subcategorías (se expanden al seleccionar padre) ─
        if (selectedParent != null) ...[
          const SizedBox(height: 12),
          AnimatedSize(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeInOut,
            child: Builder(builder: (context) {
              final parent = categories.where((p) => p.slug == selectedParent).firstOrNull;
              final subs   = parent?.children ?? [];
              if (subs.isEmpty) return const SizedBox.shrink();

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    parent!.name,
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 7,
                    runSpacing: 7,
                    children: subs.map((sub) {
                      final isSel = selectedLeaf == sub.slug;
                      return GestureDetector(
                        onTap: () => onLeafTap(sub.slug),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            color: isSel
                                ? AppColors.primary
                                : context.colors.bgCard,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSel
                                  ? AppColors.primary
                                  : context.colors.border,
                            ),
                          ),
                          child: Text(
                            sub.name,
                            style: TextStyle(
                              color: isSel
                                  ? Colors.white
                                  : context.colors.textSecondary,
                              fontSize: 12,
                              fontWeight: isSel
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              );
            }),
          ),
        ],
      ],
    );
  }
}
