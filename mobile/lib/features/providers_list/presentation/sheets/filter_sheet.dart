import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../features/localities/data/dynamic_locations.dart';
import 'package:provider/provider.dart';
import '../../data/providers_repository.dart';
import '../providers/providers_provider.dart';
import '../widgets/parent_category_icons.dart';

/// Hoja de filtros avanzados — categorías, disponibilidad, verificación,
/// orden y ubicación estructurada (jerarquía peruana).
class FilterSheet extends StatefulWidget {
  final ProvidersProvider prov;
  const FilterSheet({super.key, required this.prov});

  @override
  State<FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<FilterSheet> {
  late String? _availability;
  late bool    _verifiedOnly;
  late String? _sortBy;
  late final TextEditingController _locationCtrl;
  // Categoría (estado local del sheet)
  String? _sheetParentSlug;   // macrocategoría expandida en el sheet
  String? _sheetCategory;     // subcategoría hoja seleccionada

  // Ubicación estructurada (jerarquía Perú). Preload desde AuthProvider.user
  // en initState — si el usuario tiene un department/province/district en su
  // perfil, los dropdowns arrancan ya rellenados.
  String? _dept;
  String? _prov;
  String? _dist;
  bool _gpsLoading = false;

  // Opciones de ordenamiento
  static const _sortOptions = [
    _SortOption(
      value: null,
      label: 'Relevancia',
      subtitle: 'Resultados más relevantes primero',
      icon: Icons.auto_awesome_rounded,
    ),
    _SortOption(
      value: 'reviews',
      label: 'Más reseñas',
      subtitle: 'Mayor número de opiniones de clientes',
      icon: Icons.chat_bubble_outline_rounded,
    ),
    _SortOption(
      value: 'availability',
      label: 'Mayor disponibilidad',
      subtitle: 'Disponibles primero, con demora después',
      icon: Icons.schedule_rounded,
    ),
    _SortOption(
      value: 'rating',
      label: 'Mejor calificación',
      subtitle: 'Ordenar por puntuación promedio',
      icon: Icons.star_outline_rounded,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _availability      = widget.prov.selectedAvailability;
    _verifiedOnly      = widget.prov.verifiedOnly;
    _sortBy            = widget.prov.sortBy;
    _locationCtrl      = TextEditingController(text: widget.prov.location);
    _sheetParentSlug   = widget.prov.expandedParentSlug;
    _sheetCategory     = widget.prov.selectedCategory;

    // Preload de la ubicación del usuario: si ya tiene filtro estructurado
    // en el provider, usamos ese. Si no, caemos al perfil registrado.
    final auth = context.read<AuthProvider>();
    _dept = widget.prov.department ?? auth.user?.department;
    _prov = widget.prov.province   ?? auth.user?.province;
    _dist = widget.prov.district   ?? auth.user?.district;
    // Sanea: si el dept del usuario no está en el catálogo local, lo
    // descartamos para no mostrar opciones inválidas.
    _dept = _sanitizeDept(_dept);
    _prov = _sanitizeProv(_dept, _prov);
    _dist = _sanitizeDist(_prov, _dist);
  }

  // Sanitización accent-insensitive contra el catálogo combinado
  // (estático + extras runtime). Devuelve la forma canónica que matchea
  // la BD del backend.
  String? _sanitizeDept(String? d) =>
      DynamicLocations.instance.findDepartmentCanonical(d);
  String? _sanitizeProv(String? d, String? p) =>
      DynamicLocations.instance.findProvinceCanonical(d, p);
  String? _sanitizeDist(String? p, String? di) =>
      DynamicLocations.instance.findDistrictCanonical(p, di);

  @override
  void dispose() {
    _locationCtrl.dispose();
    super.dispose();
  }

  void _apply() {
    widget.prov.applyFilters(
      availability:   _availability,
      verifiedOnly:   _verifiedOnly,
      sortBy:         _sortBy,
      location:       _locationCtrl.text.trim(),
      category:       _sheetCategory,
      parentCategory: _sheetCategory == null ? _sheetParentSlug : null,
      department:     _dept,
      province:       _prov,
      district:       _dist,
    );
    Navigator.pop(context);
  }

  void _clear() {
    setState(() {
      _availability    = null;
      _verifiedOnly    = true;
      _sortBy          = null;
      _sheetParentSlug = null;
      _sheetCategory   = null;
      _locationCtrl.clear();
      _dept = null;
      _prov = null;
      _dist = null;
    });
  }

  bool get _hasLocalChanges =>
      _availability    != widget.prov.selectedAvailability ||
      _verifiedOnly    != widget.prov.verifiedOnly ||
      _sortBy          != widget.prov.sortBy ||
      _sheetCategory   != widget.prov.selectedCategory ||
      _sheetParentSlug != widget.prov.expandedParentSlug ||
      _locationCtrl.text.trim() != widget.prov.location ||
      _dept != widget.prov.department ||
      _prov != widget.prov.province ||
      _dist != widget.prov.district;

  // ── GPS: usar mi ubicación actual ──────────────────────────
  //
  // Delegado al Provider: el método [detectAndSetGpsLocation] encapsula
  // permisos, geocoding, sanitización y SnackBar de "Añadir al catálogo".
  // Cuando retorna true (filtro aplicado), cerramos el sheet automáticamente.
  Future<void> _useMyGps() async {
    if (_gpsLoading) return;
    setState(() => _gpsLoading = true);
    final applied = await widget.prov.detectAndSetGpsLocation(context);
    if (!mounted) return;
    setState(() => _gpsLoading = false);
    if (applied) {
      // El provider ya recargó proveedores y actualizó el filtro.
      // Cerramos el sheet — los dropdowns locales quedan desactualizados pero
      // ya no importan.
      Navigator.pop(context);
    }
  }

  // ── MÉTODO BUILD PRINCIPAL (REFACTORIZADO) ──────────────────
  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Container(
      decoration: _buildSheetDecoration(c),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildHeader(c),
          const Divider(height: 1),
          _buildScrollableContent(c),
          _buildBottomButtons(c),
        ],
      ),
    );
  }

  // ── SECCIONES DEL BUILD DESGLOSADAS ─────────────────────────

  BoxDecoration _buildSheetDecoration(AppThemeColors c) {
    return BoxDecoration(
      color: c.bg,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
    );
  }

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
                  Icon(Icons.tune_rounded, color: AppColors.primary, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Filtros avanzados',
                    style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              TextButton.icon(
                onPressed: _clear,
                icon: const Icon(Icons.refresh_rounded,
                    size: 16, color: AppColors.primary),
                label: const Text('Limpiar',
                    style: TextStyle(color: AppColors.primary, fontSize: 13)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScrollableContent(AppThemeColors c) {
    return Flexible(
      child: SingleChildScrollView(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildCategorySection(),
            _buildAvailabilitySection(c),
            _buildVerificationSection(c),
            _buildSortBySection(c),
            _buildLocationSection(c),
          ],
        ),
      ),
    );
  }

  Widget _buildCategorySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionLabel(label: 'CATEGORÍA'),
        const SizedBox(height: 10),
        _CategorySheetSection(
          categories:      widget.prov.categories,
          selectedParent:  _sheetParentSlug,
          selectedLeaf:    _sheetCategory,
          onParentTap:     (slug) => setState(() {
            _sheetParentSlug = _sheetParentSlug == slug ? null : slug;
            _sheetCategory   = null;
          }),
          onLeafTap:       (slug) => setState(() {
            _sheetCategory = _sheetCategory == slug ? null : slug;
          }),
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildAvailabilitySection(AppThemeColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionLabel(label: 'DISPONIBILIDAD'),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          children: [
            _FilterChip(
              label: '🟢  Disponible ahora',
              isSelected: _availability == 'DISPONIBLE',
              color: AppColors.available,
              onTap: () => setState(() => _availability =
                  _availability == 'DISPONIBLE' ? null : 'DISPONIBLE'),
            ),
            _FilterChip(
              label: '🟠  Con demora',
              isSelected: _availability == 'CON_DEMORA',
              color: AppColors.delayed,
              onTap: () => setState(() => _availability =
                  _availability == 'CON_DEMORA' ? null : 'CON_DEMORA'),
            ),
          ],
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildVerificationSection(AppThemeColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionLabel(label: 'VERIFICACIÓN'),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: () => setState(() => _verifiedOnly = !_verifiedOnly),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(
                horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: _verifiedOnly
                  ? AppColors.verified.withValues(alpha: 0.08)
                  : c.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _verifiedOnly
                    ? AppColors.verified.withValues(alpha: 0.4)
                    : c.border,
                width: _verifiedOnly ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.verified_rounded,
                  color: _verifiedOnly
                      ? AppColors.verified
                      : c.textMuted,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Solo proveedores verificados',
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        'Con el check azul de confianza',
                        style: TextStyle(
                            color: c.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _verifiedOnly,
                  onChanged: (v) =>
                      setState(() => _verifiedOnly = v),
                  activeThumbColor: AppColors.verified,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildSortBySection(AppThemeColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionLabel(label: 'ORDENAR POR'),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: c.border),
          ),
          child: Column(
            children: List.generate(_sortOptions.length, (i) {
              final opt = _sortOptions[i];
              final isSelected = _sortBy == opt.value;
              final isLast = i == _sortOptions.length - 1;
              return Column(
                children: [
                  _buildSortOptionItem(opt, isSelected, isLast, i, c),
                  if (!isLast)
                    Divider(
                      height: 1,
                      indent: 14,
                      endIndent: 14,
                      color: c.border,
                    ),
                ],
              );
            }),
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildSortOptionItem(_SortOption opt, bool isSelected, bool isLast, int index, AppThemeColors c) {
    return GestureDetector(
      onTap: () => setState(() => _sortBy = opt.value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(
            horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.06)
              : Colors.transparent,
          borderRadius: BorderRadius.vertical(
            top: index == 0
                ? const Radius.circular(14)
                : Radius.zero,
            bottom: isLast
                ? const Radius.circular(14)
                : Radius.zero,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withValues(alpha: 0.15)
                    : c.bgInput,
                shape: BoxShape.circle,
              ),
              child: Icon(
                opt.icon,
                size: 18,
                color: isSelected ? AppColors.primary : c.textMuted,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    opt.label,
                    style: TextStyle(
                      color: isSelected ? AppColors.primary : c.textPrimary,
                      fontSize: 14,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    ),
                  ),
                  Text(
                    opt.subtitle,
                    style: TextStyle(color: c.textMuted, fontSize: 11),
                  ),
                ],
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppColors.primary : c.border,
                  width: isSelected ? 0 : 1.5,
                ),
                color: isSelected ? AppColors.primary : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check, color: Colors.white, size: 13)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationSection(AppThemeColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionLabel(label: 'UBICACIÓN'),
        const SizedBox(height: 10),
        _buildGpsButton(),
        const SizedBox(height: 12),
        ListenableBuilder(
          listenable: DynamicLocations.instance,
          builder: (_, _) {
            final dyn = DynamicLocations.instance;
            final provList = _dept == null
                ? const <String>[]
                : dyn.provincesOf(_dept!);
            final distList = _prov == null
                ? const <String>[]
                : dyn.districtsOf(_prov!);
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
        const SizedBox(height: 14),
        _buildAddressTextField(c),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildGpsButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _gpsLoading ? null : _useMyGps,
        icon: _gpsLoading
            ? const SizedBox(
                width: 14, height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primary,
                ),
              )
            : const Icon(Icons.my_location_rounded,
                size: 16, color: AppColors.primary),
        label: Text(
          _gpsLoading ? 'Detectando…' : 'Usar mi ubicación actual',
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 12),
          side: BorderSide(color: AppColors.primary.withValues(alpha: 0.4)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  Widget _buildAddressTextField(AppThemeColors c) {
    return TextField(
      controller: _locationCtrl,
      style: TextStyle(color: c.textPrimary),
      decoration: InputDecoration(
        hintText: 'Dirección (opcional): Jr. Lima, Av…',
        hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
        prefixIcon: const Icon(
            Icons.location_on_outlined,
            color: AppColors.amber, size: 20),
        filled: true,
        fillColor: c.bgCard,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(
              color: AppColors.primary, width: 1.5),
        ),
      ),
      onChanged: (_) => setState(() {}),
    );
  }

  Widget _buildBottomButtons(AppThemeColors c) {
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
          // Botón Limpiar
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
              child: Text(
                'Limpiar',
                style: TextStyle(
                    color: c.textSecondary,
                    fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Botón Aplicar
          Expanded(
            flex: 4,
            child: ElevatedButton(
              onPressed: _apply,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
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
                  const Text(
                    'Aplicar filtros',
                    style: TextStyle(
                        fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  if (_hasLocalChanges) ...[
                    const SizedBox(width: 6),
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.amber,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Datos de opción de ordenamiento (const) ───────────────

class _SortOption {
  final String? value;
  final String label;
  final String subtitle;
  final IconData icon;
  const _SortOption({
    required this.value,
    required this.label,
    required this.subtitle,
    required this.icon,
  });
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

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color color;
  final VoidCallback onTap;
  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.15) : c.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color.withValues(alpha: 0.4) : c.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? color : c.textSecondary,
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// SECCIÓN DE CATEGORÍAS JERÁRQUICA PARA EL FILTER SHEET
// ═══════════════════════════════════════════════════════════

class _CategorySheetSection extends StatelessWidget {
  final List<CategoryModel> categories;
  final String? selectedParent;
  final String? selectedLeaf;
  final ValueChanged<String> onParentTap;
  final ValueChanged<String> onLeafTap;

  const _CategorySheetSection({
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

// ─── Dropdown reutilizable para Dept/Prov/Dist ─────────────
//
// Estilo coherente con el resto del sheet (bg c.bgCard, border, icon de
// pin ámbar). Cuando `enabled` es false (ej. provincia sin departamento
// seleccionado), se atenúa y no abre el menú.
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
    // Garantía: el value debe estar en `items` para que el Dropdown lo
    // acepte. Si por sanitización quedó fuera, lo mostramos como null.
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