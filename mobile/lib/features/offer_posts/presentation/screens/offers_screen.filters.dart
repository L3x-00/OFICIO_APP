part of 'offers_screen.dart';

// Widgets de filtros de la pantalla de Ofertas, extraídos de offers_screen.dart
// por mantenibilidad (part file → comparten imports y privacidad de la
// librería). Cero cambios funcionales.

class _TypePillBar extends StatelessWidget {
  final String? selected;
  final void Function(String?) onSelect;

  const _TypePillBar({required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      color: c.bgCard,
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 10),
      child: Row(
        children: [
          Expanded(
            child: _TypePill(
              label: 'Ofertas de Negocios',
              icon: Icons.storefront_rounded,
              selected: selected == 'NEGOCIO',
              onTap: () => onSelect(selected == 'NEGOCIO' ? null : 'NEGOCIO'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _TypePill(
              label: 'Ofertas de Profesionales',
              icon: Icons.engineering_rounded,
              selected: selected == 'OFICIO',
              onTap: () => onSelect(selected == 'OFICIO' ? null : 'OFICIO'),
            ),
          ),
        ],
      ),
    );
  }
}

class _TypePill extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _TypePill({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.amber : c.bgInput,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: selected
                ? AppColors.amber
                : Colors.white.withValues(alpha: 0.06),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: selected ? Colors.black : c.textMuted),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  color: selected ? Colors.black : c.textSecondary,
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Strip de filtros activos (chips removibles) ───────────────

class _ActiveFiltersStrip extends StatelessWidget {
  final PublicOffersProvider prov;
  const _ActiveFiltersStrip({required this.prov});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final locParts = [
      if (prov.district != null) prov.district!,
      if (prov.province != null) prov.province!,
      if (prov.department != null) prov.department!,
    ];

    final chips = <Widget>[
      if (locParts.isNotEmpty)
        _ActiveChip(
          icon: Icons.place_rounded,
          label: locParts.join(' · '),
          onRemove: () => prov.applyAdvanced(categorySlugs: prov.categorySlugs),
        ),
      for (final slug in prov.categorySlugs)
        _ActiveChip(
          icon: Icons.category_rounded,
          label: slug,
          onRemove: () => prov.applyAdvanced(
            categorySlugs: prov.categorySlugs.where((s) => s != slug).toList(),
            department: prov.department,
            province: prov.province,
            district: prov.district,
          ),
        ),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: chips),
            ),
          ),
          TextButton(
            onPressed: prov.clearAdvanced,
            child: Text(
              'Limpiar',
              style: TextStyle(color: c.textMuted, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActiveChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onRemove;
  const _ActiveChip({
    required this.icon,
    required this.label,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.amber.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.amber.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.amber),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: onRemove,
            child: Icon(Icons.close_rounded, size: 13, color: c.textMuted),
          ),
        ],
      ),
    );
  }
}
