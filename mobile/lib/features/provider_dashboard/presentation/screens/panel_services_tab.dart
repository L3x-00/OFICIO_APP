import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/utils/plan_limits.dart';
import '../providers/dashboard_provider.dart';
import '../providers/offer_posts_provider.dart';
import '../../domain/models/service_item_model.dart';
import '../widgets/services/offer_form_sheet.dart';
import '../widgets/services/offers_section.dart';
import '../widgets/services/service_card.dart';
import '../widgets/services/service_components.dart';
import '../widgets/services/service_form_sheet.dart';

/// Tab "Servicios/Productos" del panel del proveedor.
///
/// Orquesta el [CustomScrollView] con el banner de límite, la sección de
/// ofertas y la lista de servicios. Los formularios y validaciones viven
/// en `widgets/services/`. La única lógica que permanece aquí es el estado
/// [_isSaving] del AppBar y el diálogo simple de eliminar servicio.
class PanelServicesTab extends StatefulWidget {
  final bool isNegocio;

  const PanelServicesTab({super.key, required this.isNegocio});

  @override
  State<PanelServicesTab> createState() => _PanelServicesTabState();
}

class _PanelServicesTabState extends State<PanelServicesTab> {
  bool _isSaving = false;

  void _setSaving(bool value) {
    if (mounted) setState(() => _isSaving = value);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final type = widget.isNegocio ? 'NEGOCIO' : 'OFICIO';
      context.read<OfferPostsProvider>().load(type: type);
    });
  }

  @override
  Widget build(BuildContext context) {
    final c      = context.colors;
    final dash   = context.watch<DashboardProvider>();
    final offers = context.watch<OfferPostsProvider>();
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
                child: PlanLimitBanner(
                  plan:        plan,
                  current:     services.length,
                  limit:       limit,
                  isNegocio:   widget.isNegocio,
                  limitLabel:  limitLabel,
                ),
              ),

              // ── Sección de Ofertas ──────────────────────────────
              SliverToBoxAdapter(
                child: OfferPostsSection(
                  plan:      plan,
                  offers:    offers.activeOffers,
                  isLoading: offers.status == OfferPostsStatus.loading,
                  onPublish: () => OfferFormSheet.show(context, offers, plan, widget.isNegocio),
                  onDelete:  (id) => offers.deleteOffer(id),
                ),
              ),

              if (services.isEmpty)
                SliverFillRemaining(
                  child: EmptyServices(
                    label: label,
                    labelSingular: labelSingular,
                    isNegocio: widget.isNegocio,
                    onAdd: atLimit
                        ? null
                        : () => ServiceFormSheet.show(context, dash, onSaving: _setSaving),
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
                            onPressed: () => ServiceFormSheet.show(context, dash, onSaving: _setSaving),
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
                      (ctx, i) => ServiceCard(
                        service:    services[i],
                        isNegocio:  widget.isNegocio,
                        onEdit:     () => ServiceFormSheet.show(context, dash,
                            existing: services[i], onSaving: _setSaving),
                        onDelete:   () => _deleteService(context, dash, services[i]),
                      ),
                      childCount: services.length,
                    ),
                  ),
                ),
              ],
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
        ),
      ),
      floatingActionButton: (services.isNotEmpty && !atLimit)
          ? FloatingActionButton(
              onPressed: () => ServiceFormSheet.show(context, dash, onSaving: _setSaving),
              backgroundColor: AppColors.amber,
              child: const Icon(Icons.add_rounded, color: Colors.black),
            )
          : null,
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
