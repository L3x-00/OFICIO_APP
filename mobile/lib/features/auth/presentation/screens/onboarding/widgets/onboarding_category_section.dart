import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/providers_list/data/providers_repository.dart';

/// Sección encargada de mostrar y seleccionar la categoría/negocio.
class OnboardingCategorySection extends StatefulWidget {
  final String? providerType;
  final int? selectedCategoryId;
  final String selectedCategoryName;
  final String selectedParentName;
  final List<CategoryModel> categories;
  final ValueChanged<CategorySelectionResult> onSelected;

  const OnboardingCategorySection({
    super.key,
    required this.providerType,
    required this.selectedCategoryId,
    required this.selectedCategoryName,
    required this.selectedParentName,
    required this.categories,
    required this.onSelected,
  });

  @override
  State<OnboardingCategorySection> createState() => _OnboardingCategorySectionState();
}

class _OnboardingCategorySectionState extends State<OnboardingCategorySection> {
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasCategories = widget.categories.isNotEmpty;
    final isSelected    = widget.selectedCategoryId != null;
    final isNegocio     = widget.providerType == 'NEGOCIO';
    final displayText   = isSelected && widget.selectedParentName.isNotEmpty
        ? '${widget.selectedParentName} › ${widget.selectedCategoryName}'
        : isNegocio
            ? 'Selecciona el tipo de negocio'
            : 'Selecciona una categoría';

    return GestureDetector(
      onTap: hasCategories ? _showCategoryPicker : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected
                ? AppColors.primary.withValues(alpha: 0.5)
                : c.border,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isNegocio ? Icons.storefront_outlined : Icons.category_outlined,
              color: isSelected ? AppColors.primary : c.textMuted,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    isNegocio ? 'Tipo de negocio *' : 'Categoría del servicio',
                    style: TextStyle(color: c.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    displayText,
                    style: TextStyle(
                      color: isSelected ? c.textPrimary : c.textMuted,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            if (!hasCategories)
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: c.textMuted,
                ),
              )
            else
              Icon(Icons.arrow_drop_down, color: c.textMuted),
          ],
        ),
      ),
    );
  }

  Future<void> _showCategoryPicker() async {
    if (widget.categories.isEmpty) return;
    final c = context.colors;
    final isNegocio = widget.providerType == 'NEGOCIO';

    CategoryModel? pickerParent;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) {
          final items = pickerParent == null ? widget.categories : pickerParent!.children;
          final title = pickerParent == null
              ? (isNegocio ? 'Sector de tu negocio' : 'Selecciona una categoría')
              : pickerParent!.name;

          return DraggableScrollableSheet(
            initialChildSize: 0.6,
            minChildSize: 0.4,
            maxChildSize: 0.92,
            expand: false,
            builder: (_, scrollCtrl) => SafeArea(
              child: Column(
                children: [
                  const SizedBox(height: 8),
                  Container(
                    width: 36, height: 4,
                    decoration: BoxDecoration(
                      color: c.textMuted.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 12, 20, 8),
                    child: Row(
                      children: [
                        if (pickerParent != null)
                          IconButton(
                            icon: Icon(Icons.arrow_back_rounded, color: c.textSecondary),
                            onPressed: () => setModal(() => pickerParent = null),
                          )
                        else
                          const SizedBox(width: 48),
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              color: c.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Divider(height: 1, color: c.border),
                  Expanded(
                    child: ListView.builder(
                      controller: scrollCtrl,
                      itemCount: items.length,
                      itemBuilder: (_, i) {
                        final item = items[i];
                        final isSelected = widget.selectedCategoryId == item.id;
                        final hasChildren = item.children.isNotEmpty;
                        return ListTile(
                          title: Text(
                            item.name,
                            style: TextStyle(
                              color: isSelected ? AppColors.primary : c.textPrimary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                          trailing: hasChildren
                              ? Icon(Icons.chevron_right, color: c.textMuted)
                              : isSelected
                                  ? const Icon(Icons.check_circle, color: AppColors.primary)
                                  : null,
                          onTap: () {
                            if (hasChildren) {
                              setModal(() => pickerParent = item);
                            } else {
                              widget.onSelected(CategorySelectionResult(
                                id: item.id,
                                name: item.name,
                                parentName: pickerParent?.name ?? '',
                              ));
                              Navigator.pop(ctx);
                            }
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Modelo de datos para emitir la selección de categoría.
class CategorySelectionResult {
  final int id;
  final String name;
  final String parentName;

  CategorySelectionResult({
    required this.id,
    required this.name,
    required this.parentName,
  });
}