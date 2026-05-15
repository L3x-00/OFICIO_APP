import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../localities/data/dynamic_locations.dart';
import '../../../providers_list/data/providers_repository.dart';
import '../../../providers_list/presentation/providers/providers_provider.dart';
import '../providers/offers_provider.dart';

/// Sheet de filtros avanzados para la pantalla de Ofertas.
///
/// Replica el lenguaje visual del filtro del home (header, secciones,
/// chips, botones inferiores) pero con dos diferencias:
///   - Categorías son MULTI-SELECT (OR lógico — el backend devuelve la
///     oferta si pertenece a cualquiera de las categorías marcadas).
///   - El selector de ubicación reusa el catálogo dinámico de
///     [DynamicLocations] y devuelve dept/prov/dist al provider.
///
/// El sheet trabaja con estado local; al pulsar "Aplicar" hace flush
/// hacia [PublicOffersProvider] mediante `applyAdvanced(...)`.
class OffersFilterSheet extends StatefulWidget {
  const OffersFilterSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const OffersFilterSheet(),
    );
  }

  @override
  State<OffersFilterSheet> createState() => _OffersFilterSheetState();
}

class _OffersFilterSheetState extends State<OffersFilterSheet> {
  // Snapshot local: el sheet sólo aplica al hacer "Aplicar".
  late Set<String> _selectedSlugs;
  String? _dept;
  String? _prov;
  String? _dist;

  @override
  void initState() {
    super.initState();
    final offers = context.read<PublicOffersProvider>();
    _selectedSlugs = offers.categorySlugs.toSet();
    _dept = offers.department;
    _prov = offers.province;
    _dist = offers.district;
  }

  void _apply() {
    context.read<PublicOffersProvider>().applyAdvanced(
      categorySlugs: _selectedSlugs.toList(),
      department:    _dept,
      province:      _prov,
      district:      _dist,
    );
    Navigator.of(context).pop();
  }

  void _clear() {
    setState(() {
      _selectedSlugs.clear();
      _dept = null;
      _prov = null;
      _dist = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final categories = context.watch<ProvidersProvider>().categories;

    return Container(
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildHeader(c),
          const Divider(height: 1),
          Flexible(
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                left: 20, right: 20, top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildLocationSection(c),
                  const SizedBox(height: 24),
                  _buildCategoriesSection(c, categories),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
          _buildBottomButtons(c),
        ],
      ),
    );
  }

  // ── Header ───────────────────────────────────────────────
  Widget _buildHeader(AppThemeColors c) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Column(
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: c.textMuted.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.tune_rounded, color: AppColors.amber, size: 20),
                  const SizedBox(width: 8),
                  Text('Filtrar ofertas',
                      style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.bold)),
                ],
              ),
              TextButton.icon(
                onPressed: _clear,
                icon: const Icon(Icons.refresh_rounded,
                    size: 16, color: AppColors.amber),
                label: const Text('Limpiar',
                    style: TextStyle(color: AppColors.amber, fontSize: 13)),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  // ── Sección ubicación ────────────────────────────────────
  Widget _buildLocationSection(AppThemeColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionLabel(label: 'UBICACIÓN'),
        const SizedBox(height: 10),
        ListenableBuilder(
          listenable: DynamicLocations.instance,
          builder: (_, _) {
            final dyn = DynamicLocations.instance;
            final provList = _dept == null ? const <String>[] : dyn.provincesOf(_dept!);
            final distList = _prov == null ? const <String>[] : dyn.districtsOf(_prov!);
            return Column(
              children: [
                _LocationDropdown(
                  label: 'Departamento',
                  value: _dept,
                  items: dyn.departments,
                  onChanged: (v) => setState(() {
                    _dept = v;
                    _prov = null;
                    _dist = null;
                  }),
                ),
                const SizedBox(height: 10),
                _LocationDropdown(
                  label: 'Provincia',
                  value: _prov,
                  items: provList,
                  enabled: _dept != null,
                  onChanged: (v) => setState(() {
                    _prov = v;
                    _dist = null;
                  }),
                ),
                const SizedBox(height: 10),
                _LocationDropdown(
                  label: 'Distrito',
                  value: _dist,
                  items: distList,
                  enabled: _prov != null && distList.isNotEmpty,
                  onChanged: (v) => setState(() => _dist = v),
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  // ── Sección categorías multi-select ──────────────────────
  Widget _buildCategoriesSection(AppThemeColors c, List<CategoryModel> roots) {
    if (roots.isEmpty) {
      return const SizedBox.shrink();
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const _SectionLabel(label: 'CATEGORÍAS'),
            const SizedBox(width: 8),
            Text(
              '(elige una o varias)',
              style: TextStyle(color: c.textMuted, fontSize: 11),
            ),
          ],
        ),
        const SizedBox(height: 10),
        for (final parent in roots) ...[
          Text(
            parent.name,
            style: TextStyle(
              color: AppColors.amber,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 7,
            runSpacing: 7,
            children: [
              // Chip del propio padre — útil para "Hogar" como categoría general.
              _CategoryChip(
                label: parent.name,
                selected: _selectedSlugs.contains(parent.slug),
                onTap: () => setState(() {
                  if (!_selectedSlugs.add(parent.slug)) {
                    _selectedSlugs.remove(parent.slug);
                  }
                }),
              ),
              for (final child in parent.children)
                _CategoryChip(
                  label: child.name,
                  selected: _selectedSlugs.contains(child.slug),
                  onTap: () => setState(() {
                    if (!_selectedSlugs.add(child.slug)) {
                      _selectedSlugs.remove(child.slug);
                    }
                  }),
                ),
            ],
          ),
          const SizedBox(height: 14),
        ],
      ],
    );
  }

  // ── Footer ───────────────────────────────────────────────
  Widget _buildBottomButtons(AppThemeColors c) {
    final selectedCount = _selectedSlugs.length;
    return Container(
      padding: EdgeInsets.fromLTRB(
        20, 12, 20,
        MediaQuery.of(context).padding.bottom + 16,
      ),
      decoration: BoxDecoration(
        color: c.bg,
        border: Border(top: BorderSide(color: c.border)),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: OutlinedButton(
              onPressed: _clear,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                side: BorderSide(color: c.border),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: Text('Limpiar',
                  style: TextStyle(
                      color: c.textSecondary,
                      fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 4,
            child: ElevatedButton(
              onPressed: _apply,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.amber,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.check_rounded, size: 18),
                  const SizedBox(width: 6),
                  Text(
                    selectedCount > 0
                        ? 'Aplicar ($selectedCount)'
                        : 'Aplicar filtros',
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Widgets auxiliares ───────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: TextStyle(
        color: context.colors.textMuted,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _CategoryChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? AppColors.amber : c.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.amber : c.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.black : c.textSecondary,
            fontSize: 12,
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

class _LocationDropdown extends StatelessWidget {
  final String label;
  final String? value;
  final List<String> items;
  final bool enabled;
  final ValueChanged<String?> onChanged;

  const _LocationDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final effective = (value != null && items.contains(value)) ? value : null;

    return Opacity(
      opacity: enabled ? 1.0 : 0.45,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: c.border),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            value: effective,
            isExpanded: true,
            icon: Icon(Icons.expand_more_rounded, color: c.textMuted),
            dropdownColor: c.bgCard,
            hint: Row(
              children: [
                const Icon(Icons.location_on_outlined,
                    color: AppColors.amber, size: 18),
                const SizedBox(width: 8),
                Text(
                  enabled ? label : 'Selecciona el nivel anterior',
                  style: TextStyle(color: c.textMuted, fontSize: 13.5),
                ),
              ],
            ),
            selectedItemBuilder: (_) => items
                .map((it) => Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            color: AppColors.amber, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            it,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ))
                .toList(),
            items: items
                .map((it) => DropdownMenuItem<String>(
                      value: it,
                      child: Text(it, style: TextStyle(color: c.textPrimary)),
                    ))
                .toList(),
            onChanged: enabled ? onChanged : null,
          ),
        ),
      ),
    );
  }
}
