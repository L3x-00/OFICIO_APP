import '../../../../features/auth/presentation/providers/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/utils/plan_limits.dart';
import '../providers/dashboard_provider.dart';
import '../../domain/models/service_item_model.dart';
import '../../../../features/payments/presentation/screens/plan_selector_sheet.dart';

class PanelServicesTab extends StatefulWidget {
  final bool isNegocio;

  const PanelServicesTab({super.key, required this.isNegocio});

  @override
  State<PanelServicesTab> createState() => _PanelServicesTabState();
}

class _PanelServicesTabState extends State<PanelServicesTab> {
  bool _isSaving = false;

  @override
  Widget build(BuildContext context) {
    final c    = context.colors;
    final dash = context.watch<DashboardProvider>();
    final services       = dash.services;
    final plan           = dash.profile?.subscription?.plan ?? 'GRATIS';
    final limit          = PlanLimits.items(plan, isNegocio: widget.isNegocio);
    final atLimit        = !PlanLimits.canAddItem(plan, services.length, isNegocio: widget.isNegocio);
    final label          = widget.isNegocio ? 'productos' : 'servicios';
    final labelSingular  = widget.isNegocio ? 'producto' : 'servicio';
    final limitLabel     = PlanLimits.itemsLabel(plan, isNegocio: widget.isNegocio);

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.amber,
          backgroundColor: c.bgCard,
          onRefresh: () async {
            final type = widget.isNegocio ? 'NEGOCIO' : 'OFICIO';
            await dash.loadDashboard(providerType: type);
          },
          child: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: c.bgCard,
            pinned: true,
            title: Text(
              widget.isNegocio ? 'Mis Productos' : 'Mis Servicios',
              style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
            ),
            actions: [
              if (_isSaving)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(
                    width: 20, height: 20,
                    child: CircularProgressIndicator(color: AppColors.amber, strokeWidth: 2),
                  ),
                ),
            ],
          ),

          // ── Banner de límite de plan ────────────────────────
          SliverToBoxAdapter(
            child: _PlanLimitBanner(
              plan:        plan,
              current:     services.length,
              limit:       limit,
              isNegocio:   widget.isNegocio,
              limitLabel:  limitLabel,
            ),
          ),

          if (services.isEmpty)
            SliverFillRemaining(
              child: _EmptyServices(
                label: label,
                labelSingular: labelSingular,
                isNegocio: widget.isNegocio,
                onAdd: atLimit ? null : () => _showServiceForm(context, dash),
              ),
            )
          else ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: Row(
                  children: [
                    Text(
                      '${services.length}${limit < 999 ? '/$limit' : ''} ${services.length == 1 ? labelSingular : label}',
                      style: TextStyle(color: c.textSecondary, fontSize: 13),
                    ),
                    const Spacer(),
                    if (!atLimit)
                      TextButton.icon(
                        onPressed: () => _showServiceForm(context, dash),
                        icon: const Icon(Icons.add_rounded, size: 18),
                        label: const Text('Añadir'),
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.amber,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) => _ServiceCard(
                    service:    services[i],
                    isNegocio:  widget.isNegocio,
                    onEdit:     () => _showServiceForm(context, dash, existing: services[i]),
                    onDelete:   () => _deleteService(context, dash, services[i]),
                  ),
                  childCount: services.length,
                ),
              ),
            ),
          ],
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
          ),  // CustomScrollView
        ),    // RefreshIndicator
      ),      // SafeArea
      floatingActionButton: (services.isNotEmpty && !atLimit)
          ? FloatingActionButton(
              onPressed: () => _showServiceForm(context, dash),
              backgroundColor: AppColors.amber,
              child: const Icon(Icons.add_rounded, color: Colors.black),
            )
          : null,
    );
  }

  // ── DIALOGO DE SERVICIO ───────────────────────────────────

  // ── DIALOGO DE SERVICIO ───────────────────────────────────

  void _showServiceForm(
    BuildContext context,
    DashboardProvider dash, {
    ServiceItem? existing,
  }) {
    final c = context.colors;
    final isEdit = existing != null;

    // Teléfono inicial: si es edición usa el del servicio; si no, el del perfil del proveedor.
    // Prioridad: provider.phone > user.phone > vacío.
    final providerPhone = dash.profile?.phone
        ?? context.read<AuthProvider>().user?.phone
        ?? '';
    final initialPhone = isEdit ? (existing.phone ?? providerPhone) : providerPhone;

    // Todos los controladores se crean FUERA del builder para que no se
    // reinicien cuando Flutter reconstruye el sheet (p.ej. al abrir el teclado).
    final nameCtrl  = TextEditingController(text: existing?.name ?? '');
    final descCtrl  = TextEditingController(text: existing?.description ?? '');
    final priceCtrl = TextEditingController(
      text: existing?.price != null ? existing!.price.toString() : '',
    );
    final phoneCtrl = TextEditingController(text: initialPhone);
    final unitCtrl  = TextEditingController(text: existing?.unit ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(sheetCtx).viewInsets.bottom,
          ),
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                isEdit
                    ? (widget.isNegocio ? 'Editar producto' : 'Editar servicio')
                    : (widget.isNegocio ? 'Nuevo producto' : 'Nuevo servicio'),
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              _FormField(
                controller: nameCtrl,
                label: widget.isNegocio ? 'Nombre del producto' : 'Nombre del servicio',
                hint: widget.isNegocio ? 'Ej: Corte de cabello' : 'Ej: Instalación de cañería',
              ),
              const SizedBox(height: 12),
              _FormField(
                controller: descCtrl,
                label: 'Descripción (opcional)',
                hint: 'Breve descripción de lo que incluye',
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              _FormField(
                controller:
                    phoneCtrl, // <-- Usamos el controlador que creamos aquí
                label: 'Teléfono de Contacto',
                hint: 'Ej: +51 987 654 321',
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: _FormField(
                      controller: priceCtrl,
                      label: 'Precio (opcional)',
                      hint: 'Ej: 5000',
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 3,
                    child: _FormField(
                      controller:
                          unitCtrl, // <-- Y el controlador de unidad aquí
                      label: 'Unidad',
                      hint: 'por hora, por trabajo…',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    if (nameCtrl.text.trim().isEmpty) return;
                    Navigator.pop(context);
                    setState(() => _isSaving = true);

                    final updated = List<ServiceItem>.from(dash.services);
                    final newItem = ServiceItem(
                      id:
                          existing?.id ??
                          DateTime.now().millisecondsSinceEpoch.toString(),
                      name: nameCtrl.text.trim(),
                      description: descCtrl.text.trim().isEmpty
                          ? null
                          : descCtrl.text.trim(),
                      price: double.tryParse(priceCtrl.text.trim()),
                      unit: unitCtrl.text.trim().isEmpty
                          ? null
                          : unitCtrl.text.trim(),
                      phone: phoneCtrl.text.trim().isEmpty
                          ? null
                          : phoneCtrl.text.trim(),
                    );

                    if (isEdit) {
                      final idx = updated.indexWhere(
                        (s) => s.id == existing.id,
                      );
                      if (idx >= 0) updated[idx] = newItem;
                    } else {
                      updated.add(newItem);
                    }

                    await dash.saveServices(updated);
                    if (mounted) setState(() => _isSaving = false);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.amber,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Text(
                    isEdit ? 'Actualizar' : 'Guardar',
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
                ],
              ),      // Column
            ),        // inner Padding
          ),          // SingleChildScrollView
        );
      },
    );
  }

  void _deleteService(
    BuildContext context,
    DashboardProvider dash,
    ServiceItem service,
  ) {
    final c = context.colors;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Eliminar servicio',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
        ),
        content: Text(
          '¿Eliminar "${service.name}"? Esta acción no se puede deshacer.',
          style: TextStyle(color: c.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              setState(() => _isSaving = true);
              final updated = dash.services
                  .where((s) => s.id != service.id)
                  .toList();
              await dash.saveServices(updated);
              if (mounted) setState(() => _isSaving = false);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.busy),
            child: Text('Eliminar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// ─── WIDGETS LOCALES ──────────────────────────────────────────

class _ServiceCard extends StatelessWidget {
  final ServiceItem service;
  final bool isNegocio;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _ServiceCard({
    required this.service,
    this.isNegocio = false,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: c.warmDeep,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
              color: AppColors.amber,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  service.name,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (service.description != null &&
                    service.description!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    service.description!,
                    style: TextStyle(color: c.textMuted, fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.amber.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    service.priceLabel,
                    style: TextStyle(
                      color: AppColors.amber,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Column(
            children: [
              IconButton(
                onPressed: onEdit,
                icon: Icon(Icons.edit_rounded, size: 18, color: c.textMuted),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                splashRadius: 20,
              ),
              const SizedBox(height: 4),
              IconButton(
                onPressed: onDelete,
                icon: Icon(
                  Icons.delete_rounded,
                  size: 18,
                  color: AppColors.busy,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                splashRadius: 20,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Banner de límite de plan ─────────────────────────────────

class _PlanLimitBanner extends StatelessWidget {
  final String plan;
  final int current;
  final int limit;
  final bool isNegocio;
  final String limitLabel;

  const _PlanLimitBanner({
    required this.plan,
    required this.current,
    required this.limit,
    required this.isNegocio,
    required this.limitLabel,
  });

  @override
  Widget build(BuildContext context) {
    final atLimit  = limit < 999 && current >= limit;
    final nearLimit = !atLimit && limit < 999 && current >= limit - 1 && limit > 1;
    final isPremium = plan.toUpperCase() == 'PREMIUM';
    final noun = isNegocio ? 'productos' : 'servicios';
    final c    = context.colors;

    final Color accent = atLimit
        ? AppColors.busy
        : nearLimit
            ? AppColors.amber
            : AppColors.available;

    final String title = atLimit
        ? 'Límite alcanzado — $current / $limitLabel'
        : '$current / $limitLabel $noun usados';

    final String subtitle = atLimit
        ? 'Sube al plan ${PlanLimits.nextPlan(plan)} para añadir más.'
        : nearLimit
            ? 'Casi en el límite. Considera subir de plan.'
            : 'Plan ${plan.toLowerCase()} activo.';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: accent.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(
            atLimit ? Icons.lock_rounded : Icons.inventory_2_outlined,
            color: accent,
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: accent,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(color: c.textSecondary, fontSize: 11, height: 1.4),
                ),
              ],
            ),
          ),
          if (!isPremium) ...[
            const SizedBox(width: 8),
            TextButton(
              onPressed: () => PlanSelectorSheet.show(context),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.amber,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
              ),
              child: const Text('Subir de plan'),
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Estado vacío ─────────────────────────────────────────────

class _EmptyServices extends StatelessWidget {
  final String label;
  final String labelSingular;
  final bool isNegocio;
  final VoidCallback? onAdd;

  const _EmptyServices({
    required this.label,
    required this.labelSingular,
    this.onAdd,
    this.isNegocio = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.amber.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                color: AppColors.amber,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Sin $label aún',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Añade tus $label para que los clientes\nsepan qué ofreces y a qué precio.',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 13,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onAdd,
              icon: Icon(Icons.add_rounded),
              label: Text('Añadir $labelSingular'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.amber,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FormField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final int maxLines;
  final TextInputType keyboardType;

  const _FormField({
    required this.controller,
    required this.label,
    required this.hint,
    this.maxLines = 1,
    this.keyboardType = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: c.textSecondary, fontSize: 12)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: TextStyle(color: c.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
            filled: true,
            fillColor: c.bgInput,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.amber, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
