import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../providers/providers_provider.dart';
import 'parent_category_icons.dart';

/// Barra de filtros jerárquica.
///
/// Filas:
///   - Fila 0 (opcional): chip "Mostrando en: `<zona>`" cuando hay filtro
///     de ubicación activo, con botón "Ver todos".
///   - Fila 1 (siempre): chips de tipo (Todos / Profesionales / Negocios).
///   - Fila 2 (toggleable): macrocategorías → al tocar, se expande a
///     subcategorías con un botón "← Volver".
class FilterBar extends StatelessWidget {
  const FilterBar({super.key});

  static const _typeChips = [
    _TypeChipData(
      label: 'Todos',
      icon: Icons.apps_rounded,
      value: null,
      activeColor: AppColors.amber,
      foreground: Color(
        0xFF2A2418,
      ), // texto oscuro: blanco-sobre-dorado es ilegible
    ),
    _TypeChipData(
      label: 'Profesionales',
      icon: Icons.handyman_rounded,
      value: 'PROFESSIONAL',
      activeColor: AppColors.primary,
      foreground: Colors.white,
    ),
    _TypeChipData(
      label: 'Negocios',
      icon: Icons.storefront_rounded,
      value: 'BUSINESS',
      // Malva apagado on-palette (reemplaza el azul periwinkle frío #7B8CDE,
      // fuera de la dirección cálida); profundo para texto blanco AA.
      activeColor: Color(0xFF7E6492),
      foreground: Colors.white,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<ProvidersProvider>();
    final expanded = prov.expandedParentSlug;

    return AnimatedSize(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeInOut,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Fila 0: chip de ubicación activa ─────────
          //-- if (prov.hasLocationFilter) se repite el chip de ubicaion debajo de la barra de búsqueda, así que lo quitamos de aquí para evitar redundancia visual. Si el usuario activa un filtro de ubicación, lo verá reflejado en el texto del header ("Mostrando en: ...") y podrá quitarlo desde ahí también.
          // --  _LocationChip(prov: prov),

          // ── Fila 1: tipo chips (siempre visible) ──────
          SizedBox(
            height: 46,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: _typeChips.length,
              itemBuilder: (_, i) {
                final t = _typeChips[i];
                final isSel = prov.selectedType == t.value;
                return _TypeChip(
                  data: t,
                  isSelected: isSel,
                  onTap: () =>
                      prov.setType(isSel && t.value != null ? null : t.value),
                );
              },
            ),
          ),

          // ── Fila 2: macrocategorías o subcategorías ───
          if (prov.showCategoryFilter && prov.categories.isNotEmpty)
            SizedBox(
              height: 42,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                transitionBuilder: (child, anim) => FadeTransition(
                  opacity: anim,
                  child: SlideTransition(
                    position:
                        Tween<Offset>(
                          begin: const Offset(0.06, 0),
                          end: Offset.zero,
                        ).animate(
                          CurvedAnimation(parent: anim, curve: Curves.easeOut),
                        ),
                    child: child,
                  ),
                ),
                child: expanded == null
                    ? _ParentChipRow(key: const ValueKey('parents'), prov: prov)
                    : _SubChipRow(key: ValueKey('sub_$expanded'), prov: prov),
              ),
            ),
        ],
      ),
    );
  }
}
// ── Fila de macrocategorías ────────────────────────────────

class _ParentChipRow extends StatelessWidget {
  final ProvidersProvider prov;
  const _ParentChipRow({super.key, required this.prov});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ListView.builder(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      itemCount: prov.categories.length,
      itemBuilder: (_, i) {
        final parent = prov.categories[i];
        final icon =
            kParentCategoryIcons[parent.slug] ?? Icons.category_rounded;
        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: GestureDetector(
            onTap: () => prov.setParentCategory(parent.slug),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: c.bgCard,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: c.border, width: 0.5),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 13, color: c.textSecondary),
                  const SizedBox(width: 5),
                  Text(
                    parent.name,
                    style: TextStyle(
                      color: c.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(width: 3),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 14,
                    color: c.textMuted,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

// ── Fila de subcategorías (con botón atrás) ───────────────

class _SubChipRow extends StatelessWidget {
  final ProvidersProvider prov;
  const _SubChipRow({super.key, required this.prov});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final parent = prov.expandedParent;
    final subs = prov.expandedChildren;
    final icon =
        kParentCategoryIcons[prov.expandedParentSlug] ?? Icons.category_rounded;

    return ListView.builder(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      itemCount: 1 + 1 + subs.length, // back + separator + subcats
      itemBuilder: (_, i) {
        // Botón "← Nombre"
        if (i == 0) {
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: prov.collapseParent,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    width: 0.5,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      size: 11,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 5),
                    Icon(icon, size: 13, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Text(
                      parent?.name ?? '',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }
        // Separador
        if (i == 1) {
          return Padding(
            padding: const EdgeInsets.only(right: 12, left: 4),
            child: Center(
              child: Container(width: 1.5, height: 18, color: c.border),
            ),
          );
        }
        // Subcategorías
        final sub = subs[i - 2];
        final isSel = prov.selectedCategory == sub.slug;
        return _CategoryChip(
          label: sub.name,
          isSelected: isSel,
          onTap: () => prov.setCategory(isSel ? null : sub.slug),
        );
      },
    );
  }
}

// ── Chip de tipo (Todos / Profesionales / Negocios) ────────

class _TypeChipData {
  final String label;
  final IconData icon;
  final String? value;
  final Color activeColor;

  /// Color de texto/ícono cuando el chip está seleccionado (sobre activeColor).
  /// Se declara por chip para garantizar contraste AA (ej. dorado → texto oscuro).
  final Color foreground;
  const _TypeChipData({
    required this.label,
    required this.icon,
    required this.value,
    required this.activeColor,
    required this.foreground,
  });
}

class _TypeChip extends StatelessWidget {
  final _TypeChipData data;
  final bool isSelected;
  final VoidCallback onTap;
  const _TypeChip({
    required this.data,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Seleccionado → foreground declarado (AA). Inactivo → la marca, pero el
    // dorado va en su versión -Dark para que se lea sobre fondos claros.
    final Color fg = isSelected
        ? data.foreground
        : (data.activeColor == AppColors.amber
              ? AppColors.amberDark
              : data.activeColor);
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? data.activeColor
                : data.activeColor.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected
                  ? data.activeColor
                  : data.activeColor.withValues(alpha: 0.25),
              width: isSelected ? 0 : 0.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(data.icon, size: 13, color: fg),
              const SizedBox(width: 5),
              Text(
                data.label,
                style: TextStyle(
                  color: fg,
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Chip de categoría ──────────────────────────────────────

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  const _CategoryChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : c.bgCard,
            borderRadius: BorderRadius.circular(20),
            border: isSelected ? null : Border.all(color: c.border, width: 0.5),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : c.textSecondary,
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }
}
