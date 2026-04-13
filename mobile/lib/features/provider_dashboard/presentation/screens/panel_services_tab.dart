import '../../../../features/auth/presentation/providers/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../providers/dashboard_provider.dart';
import '../../domain/models/service_item_model.dart';

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
    final c = context.colors;
    final dash = context.watch<DashboardProvider>();
    final services = dash.services;
    final label = widget.isNegocio ? 'productos/servicios' : 'servicios';
    final labelSingular = widget.isNegocio ? 'producto o servicio' : 'servicio';

    return Scaffold(
      backgroundColor: c.bg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: c.bgCard,
            pinned: true,
            title: Text(
              widget.isNegocio ? 'Mis Productos' : 'Mis Servicios',
              style: TextStyle(
                color: c.textPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
            actions: [
              if (_isSaving)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: AppColors.amber,
                      strokeWidth: 2,
                    ),
                  ),
                ),
            ],
          ),
          if (services.isEmpty)
            SliverFillRemaining(
              child: _EmptyServices(
                label: label,
                labelSingular: labelSingular,
                onAdd: () => _showServiceForm(context, dash),
              ),
            )
          else ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: Row(
                  children: [
                    Text(
                      '${services.length} ${services.length == 1 ? labelSingular : label}',
                      style: TextStyle(color: c.textSecondary, fontSize: 13),
                    ),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: () => _showServiceForm(context, dash),
                      icon: Icon(Icons.add_rounded, size: 18),
                      label: Text('Añadir'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.amber,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
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
                    service: services[i],
                    onEdit: () =>
                        _showServiceForm(context, dash, existing: services[i]),
                    onDelete: () => _deleteService(context, dash, services[i]),
                  ),
                  childCount: services.length,
                ),
              ),
            ),
          ],
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
      floatingActionButton: services.isNotEmpty
          ? FloatingActionButton(
              onPressed: () => _showServiceForm(context, dash),
              backgroundColor: AppColors.amber,
              child: Icon(Icons.add_rounded, color: Colors.black),
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
      builder: (_) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
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
                label: widget.isNegocio
                    ? 'Nombre del producto/servicio'
                    : 'Nombre del servicio',
                hint: widget.isNegocio
                    ? 'Ej: Corte de cabello'
                    : 'Ej: Instalación de cañería',
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
          ),
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
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _ServiceCard({
    required this.service,
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
              Icons.design_services_rounded,
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

class _EmptyServices extends StatelessWidget {
  final String label;
  final String labelSingular;
  final VoidCallback onAdd;

  const _EmptyServices({
    required this.label,
    required this.labelSingular,
    required this.onAdd,
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
                Icons.design_services_rounded,
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
