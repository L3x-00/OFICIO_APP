import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/providers_list/data/providers_repository.dart';

/// Selección MÚLTIPLE de Especialidades (categorías hijas) — modelo
/// "Multi-Especialidad con Sectores". El proveedor navega por Sectores,
/// elige hasta [maxCategories] Especialidades y marca una como principal.
class OnboardingCategorySection extends StatelessWidget {
  final String? providerType;
  final List<CategoryModel> categories;
  final List<CategorySelectionResult> selected;
  final int? primaryCategoryId;
  final int maxCategories;

  /// Emite la lista actualizada de Especialidades + el id de la principal.
  final void Function(List<CategorySelectionResult> selected, int? primaryId)
  onChanged;

  const OnboardingCategorySection({
    super.key,
    required this.providerType,
    required this.categories,
    required this.selected,
    required this.primaryCategoryId,
    required this.onChanged,
    this.maxCategories = 3,
  });

  bool get _isNegocio => providerType == 'NEGOCIO';

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasCategories = categories.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Tile que abre el selector ────────────────────────
        GestureDetector(
          onTap: hasCategories ? () => _showPicker(context) : null,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected.isNotEmpty
                    ? AppColors.primary.withValues(alpha: 0.5)
                    : c.border,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  _isNegocio
                      ? Icons.storefront_outlined
                      : Icons.category_outlined,
                  color: selected.isNotEmpty ? AppColors.primary : c.textMuted,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _isNegocio ? 'Tipo de negocio *' : 'Especialidades *',
                        style: TextStyle(
                          color: c.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        selected.isEmpty
                            ? (_isNegocio
                                  ? 'Selecciona el tipo de negocio'
                                  : 'Selecciona hasta $maxCategories especialidades')
                            : '${selected.length} de $maxCategories seleccionada(s)',
                        style: TextStyle(
                          color: selected.isEmpty ? c.textMuted : c.textPrimary,
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
        ),

        // ── Chips de Especialidades elegidas ─────────────────
        // La estrella marca la Especialidad principal (isPrimary).
        if (selected.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: selected.map((sel) {
              final isPrimary = sel.id == primaryCategoryId;
              return Container(
                padding: const EdgeInsets.fromLTRB(8, 5, 6, 5),
                decoration: BoxDecoration(
                  color: isPrimary
                      ? AppColors.amber.withValues(alpha: 0.15)
                      : AppColors.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isPrimary
                        ? AppColors.amber.withValues(alpha: 0.5)
                        : AppColors.primary.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    GestureDetector(
                      onTap: () => onChanged(selected, sel.id),
                      child: Icon(
                        isPrimary
                            ? Icons.star_rounded
                            : Icons.star_border_rounded,
                        size: 16,
                        color: isPrimary
                            ? AppColors.tintOn(AppColors.amber, c.isDark)
                            : c.textMuted,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      sel.name,
                      style: TextStyle(
                        color: isPrimary
                            ? AppColors.tintOn(AppColors.amber, c.isDark)
                            : AppColors.tintOn(AppColors.primary, c.isDark),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 4),
                    GestureDetector(
                      onTap: () => _emitRemove(sel),
                      child: Icon(
                        Icons.close_rounded,
                        size: 14,
                        color: c.textMuted,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: Text(
              'Toca la estrella para definir tu especialidad principal.',
              style: TextStyle(color: c.textMuted, fontSize: 11),
            ),
          ),
        ],
      ],
    );
  }

  /// Quita una Especialidad desde los chips del tile. Si era la principal,
  /// reasigna la principal a la primera que quede.
  void _emitRemove(CategorySelectionResult sel) {
    final next = selected.where((s) => s.id != sel.id).toList();
    final newPrimary = primaryCategoryId == sel.id
        ? (next.isEmpty ? null : next.first.id)
        : primaryCategoryId;
    onChanged(next, newPrimary);
  }

  /// Selector de Especialidades. Mantiene una copia de trabajo local —
  /// el modal es una sesión independiente; el resultado se emite al cerrar.
  Future<void> _showPicker(BuildContext context) async {
    final c = context.colors;
    CategoryModel? pickerParent;
    final working = [...selected];
    int? workingPrimary = primaryCategoryId;

    void toggle(CategoryModel item, String parentName) {
      final idx = working.indexWhere((s) => s.id == item.id);
      if (idx != -1) {
        working.removeAt(idx);
        if (workingPrimary == item.id) {
          workingPrimary = working.isEmpty ? null : working.first.id;
        }
      } else {
        if (working.length >= maxCategories) return;
        working.add(
          CategorySelectionResult(
            id: item.id,
            name: item.name,
            parentName: parentName,
          ),
        );
        workingPrimary ??= item.id;
      }
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) {
          final atRoot = pickerParent == null;
          final items = atRoot ? categories : pickerParent!.children;
          final title = atRoot
              ? (_isNegocio
                    ? 'Sector de tu negocio'
                    : 'Elige tus especialidades')
              : pickerParent!.name;

          return DraggableScrollableSheet(
            initialChildSize: 0.65,
            minChildSize: 0.4,
            maxChildSize: 0.92,
            expand: false,
            builder: (_, scrollCtrl) => SafeArea(
              child: Column(
                children: [
                  const SizedBox(height: 8),
                  Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: c.textMuted.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 12, 12, 8),
                    child: Row(
                      children: [
                        if (!atRoot)
                          IconButton(
                            icon: Icon(
                              Icons.arrow_back_rounded,
                              color: c.textSecondary,
                            ),
                            onPressed: () =>
                                setModal(() => pickerParent = null),
                          )
                        else
                          const SizedBox(width: 48),
                        Expanded(
                          child: Column(
                            children: [
                              Text(
                                title,
                                style: TextStyle(
                                  color: c.textPrimary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              Text(
                                '${working.length}/$maxCategories seleccionadas',
                                style: TextStyle(
                                  color: c.textMuted,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Listo'),
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
                        final hasChildren = item.children.isNotEmpty;
                        final isSel = working.any((s) => s.id == item.id);
                        final capped =
                            !isSel && working.length >= maxCategories;
                        return ListTile(
                          enabled: hasChildren || !capped,
                          title: Text(
                            item.name,
                            style: TextStyle(
                              color: isSel
                                  ? AppColors.primary
                                  : capped
                                  ? c.textMuted
                                  : c.textPrimary,
                              fontWeight: isSel
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            ),
                          ),
                          trailing: hasChildren
                              ? Icon(Icons.chevron_right, color: c.textMuted)
                              : isSel
                              ? const Icon(
                                  Icons.check_circle,
                                  color: AppColors.primary,
                                )
                              : Icon(Icons.circle_outlined, color: c.textMuted),
                          onTap: () {
                            if (hasChildren) {
                              setModal(() => pickerParent = item);
                            } else {
                              setModal(
                                () => toggle(item, pickerParent?.name ?? ''),
                              );
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

    onChanged(working, workingPrimary);
  }
}

/// Modelo de datos para una Especialidad seleccionada en el onboarding.
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
