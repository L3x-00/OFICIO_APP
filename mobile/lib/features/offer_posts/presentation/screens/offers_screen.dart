import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../shared/widgets/app_network_image.dart';
import '../../../subastas/domain/models/service_request_model.dart';
import '../../../subastas/presentation/providers/subastas_provider.dart';
import '../../domain/models/public_offer_model.dart';
import '../providers/offers_provider.dart';
import '../sheets/offer_detail_sheet.dart';
import '../sheets/offers_filter_sheet.dart';

/// Vista activa de la pantalla de Ofertas.
///   - ofertas     → listado público de ofertas (todos los usuarios).
///   - mias        → ofertas del propio provider (solo proveedores).
///   - necesidades → necesidades publicadas por los clientes
///                   (solo proveedores).
enum _OffersView { ofertas, mias, necesidades }

/// Pantalla de ofertas públicas — listado paginado con dos pastillas de
/// tipo (Profesionales / Negocios) y un sheet de filtros avanzados
/// (ubicación + categorías acumulables).
class OffersScreen extends StatefulWidget {
  const OffersScreen({super.key});

  @override
  State<OffersScreen> createState() => _OffersScreenState();
}

class _OffersScreenState extends State<OffersScreen> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  final _scroll = ScrollController();
  /// Vista activa. Por defecto el listado público de ofertas.
  _OffersView _view = _OffersView.ofertas;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      context.read<PublicOffersProvider>().load(
        department: auth.user?.department,
        province:   auth.user?.province,
        district:   auth.user?.district,
      );
    });
    _scroll.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 200) {
      context.read<PublicOffersProvider>().loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    // SubastasProvider local — alimenta la sub-sección "Necesidades de
    // clientes". El Builder coloca el context POR DEBAJO del provider.
    return ChangeNotifierProvider<SubastasProvider>(
      create: (_) => SubastasProvider(),
      child: Builder(builder: _buildScaffold),
    );
  }

  Widget _buildScaffold(BuildContext context) {
    final c = context.colors;
    final prov = context.watch<PublicOffersProvider>();
    final auth = context.watch<AuthProvider>();

    // IDs de los perfiles de proveedor del user — para "Mis Ofertas"
    // y "Necesidades de clientes" (exclusivas para proveedores).
    final myProviderIds = <int>{
      if (auth.providerDataFor('OFICIO')?['id'] is int)
        auth.providerDataFor('OFICIO')!['id'] as int,
      if (auth.providerDataFor('NEGOCIO')?['id'] is int)
        auth.providerDataFor('NEGOCIO')!['id'] as int,
    };
    final isProvider = myProviderIds.isNotEmpty;
    // Si dejó de ser provider, forzar la vista pública.
    final view = isProvider ? _view : _OffersView.ofertas;

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: CustomScrollView(
          controller: _scroll,
          slivers: [
            // ── App Bar ─────────────────────────────────────
            SliverAppBar(
              backgroundColor: c.bgCard,
              pinned: true,
              title: Row(
                children: [
                  const Icon(Icons.local_offer_rounded, color: AppColors.amber, size: 20),
                  const SizedBox(width: 8),
                  Text('Ofertas 💸',
                      style: TextStyle(
                          color: c.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 18)),
                ],
              ),
              actions: [
                if (isProvider) ...[
                  // Toggle "Mis Ofertas".
                  IconButton(
                    tooltip: 'Mis ofertas',
                    onPressed: () => setState(() => _view =
                        view == _OffersView.mias ? _OffersView.ofertas : _OffersView.mias),
                    icon: Icon(
                      Icons.sell_outlined,
                      color: view == _OffersView.mias ? AppColors.amber : c.textPrimary,
                    ),
                  ),
                  // Toggle "Necesidades de clientes".
                  IconButton(
                    tooltip: 'Necesidades de clientes',
                    onPressed: () {
                      setState(() => _view = view == _OffersView.necesidades
                          ? _OffersView.ofertas
                          : _OffersView.necesidades);
                      if (_view == _OffersView.necesidades) {
                        context.read<SubastasProvider>().loadOpportunities();
                      }
                    },
                    icon: Icon(
                      Icons.assignment_outlined,
                      color: view == _OffersView.necesidades
                          ? AppColors.amber
                          : c.textPrimary,
                    ),
                  ),
                ],
                // Filtros avanzados — solo aplican al listado público.
                if (view == _OffersView.ofertas)
                  IconButton(
                    tooltip: 'Filtros avanzados',
                    onPressed: () => OffersFilterSheet.show(context),
                    icon: Badge(
                      isLabelVisible: prov.hasAdvancedFilters,
                      backgroundColor: AppColors.amber,
                      child: Icon(Icons.tune_rounded, color: c.textPrimary),
                    ),
                  ),
              ],
              // Las pastillas de tipo solo en el listado público.
              bottom: view == _OffersView.ofertas
                  ? PreferredSize(
                      preferredSize: const Size.fromHeight(58),
                      child: _TypePillBar(
                        selected: prov.providerType,
                        onSelect: (type) => prov.setProviderType(type),
                      ),
                    )
                  : null,
            ),

            // ── Contenido según la vista activa ──────────────
            if (view == _OffersView.necesidades)
              ..._buildNeedsSlivers(context)
            else
              ..._buildOffersSlivers(context, prov, view, myProviderIds),
          ],
        ),
      ),
    );
  }

  // ── Slivers del listado de ofertas (público / mis ofertas) ──
  List<Widget> _buildOffersSlivers(
    BuildContext context,
    PublicOffersProvider prov,
    _OffersView view,
    Set<int> myProviderIds,
  ) {
    final c = context.colors;
    final showMine = view == _OffersView.mias;
    final listOffers = showMine
        ? prov.ownOffers(myProviderIds)
        : prov.visibleOffers;

    return [
      if (prov.hasAdvancedFilters && !showMine)
        SliverToBoxAdapter(child: _ActiveFiltersStrip(prov: prov)),
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
          child: Text(
            showMine
                ? 'Tus ofertas publicadas. Tócalas para editar, eliminar u ocultar.'
                : 'Promociones y precios especiales de proveedores cercanos',
            style: TextStyle(color: c.textMuted, fontSize: 12),
          ),
        ),
      ),
      if (prov.isLoading && listOffers.isEmpty)
        const SliverFillRemaining(
          child: Center(child: CircularProgressIndicator(color: AppColors.amber)),
        )
      else if (listOffers.isEmpty)
        SliverFillRemaining(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.local_offer_outlined, size: 64, color: c.textMuted),
                const SizedBox(height: 16),
                Text(
                    showMine
                        ? 'Aún no has publicado ofertas'
                        : 'Sin ofertas disponibles',
                    style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text(
                  showMine
                      ? 'Publica ofertas desde tu Panel → Servicios.'
                      : (prov.hasAdvancedFilters || prov.providerType != null
                          ? 'Prueba con menos filtros.'
                          : 'Vuelve más tarde para ver promociones.'),
                  style: TextStyle(color: c.textMuted, fontSize: 13),
                ),
              ],
            ),
          ),
        )
      else
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (ctx, i) {
                if (i == listOffers.length) {
                  return (!showMine && prov.hasMore)
                      ? const Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(
                              child: CircularProgressIndicator(
                                  color: AppColors.amber, strokeWidth: 2)))
                      : const SizedBox(height: 16);
                }
                return _OfferCard(offer: listOffers[i]);
              },
              childCount: listOffers.length + 1,
            ),
          ),
        ),
    ];
  }

  // ── Slivers de "Necesidades de clientes" ────────────────────
  List<Widget> _buildNeedsSlivers(BuildContext context) {
    final c = context.colors;
    final sub = context.watch<SubastasProvider>();
    final auth = context.watch<AuthProvider>();
    final myUserId = auth.user?.id;
    final needs = sub.opportunities;

    return [
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
          child: Text(
            'Necesidades publicadas por clientes en tu zona y categoría. '
            'Ofértales desde tu Panel → Oportunidades.',
            style: TextStyle(color: c.textMuted, fontSize: 12),
          ),
        ),
      ),
      if (sub.state == SubastasState.loading && needs.isEmpty)
        const SliverFillRemaining(
          child: Center(child: CircularProgressIndicator(color: AppColors.amber)),
        )
      else if (needs.isEmpty)
        SliverFillRemaining(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.assignment_outlined, size: 64, color: c.textMuted),
                const SizedBox(height: 16),
                Text('Sin necesidades por ahora',
                    style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text(
                  'Cuando un cliente publique una necesidad en tu categoría '
                  'aparecerá aquí.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: c.textMuted, fontSize: 13),
                ),
              ],
            ),
          ),
        )
      else
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (ctx, i) => _NeedCard(
                need: needs[i],
                isOwn: myUserId != null && needs[i].userId == myUserId,
              ),
              childCount: needs.length,
            ),
          ),
        ),
    ];
  }
}

// ── Pastillas de tipo (Profesionales / Negocios) ──────────────

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
            color: selected ? AppColors.amber : Colors.white.withValues(alpha: 0.06),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon,
                size: 16,
                color: selected ? Colors.black : c.textMuted),
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
          onRemove: () => prov.applyAdvanced(
            categorySlugs: prov.categorySlugs,
          ),
        ),
      for (final slug in prov.categorySlugs)
        _ActiveChip(
          icon: Icons.category_rounded,
          label: slug,
          onRemove: () => prov.applyAdvanced(
            categorySlugs: prov.categorySlugs.where((s) => s != slug).toList(),
            department:    prov.department,
            province:      prov.province,
            district:      prov.district,
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
            child: Text('Limpiar',
                style: TextStyle(color: c.textMuted, fontSize: 12)),
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
          Text(label,
              style: TextStyle(
                  color: c.textPrimary, fontSize: 11, fontWeight: FontWeight.w500)),
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

// ── Tarjeta de oferta ─────────────────────────────────────────

class _OfferCard extends StatelessWidget {
  final PublicOfferModel offer;
  const _OfferCard({required this.offer});

  @override
  Widget build(BuildContext context) {
    final c   = context.colors;
    final prov = offer.provider;

    return GestureDetector(
      onTap: () => OfferDetailSheet.show(context, offer),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (offer.photoUrl != null)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: AppNetworkImage(
                  url: offer.photoUrl!,
                  width: double.infinity,
                  height: 160,
                  fit: BoxFit.cover,
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Badge de tipo + chips de categoría
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: prov.isBusiness
                              ? const Color(0xFF8E2DE2).withValues(alpha: 0.15)
                              : AppColors.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              prov.isBusiness
                                  ? Icons.storefront_rounded
                                  : Icons.engineering_rounded,
                              size: 10,
                              color: prov.isBusiness
                                  ? const Color(0xFF8E2DE2)
                                  : AppColors.primary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              prov.isBusiness ? 'Negocio' : 'Profesional',
                              style: TextStyle(
                                color: prov.isBusiness
                                    ? const Color(0xFF8E2DE2)
                                    : AppColors.primary,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Wrap(
                          spacing: 4,
                          children: offer.categories.take(2).map((cat) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                                color: AppColors.amber.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6)),
                            child: Text(cat.name,
                                style: const TextStyle(
                                    color: AppColors.amber,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600)),
                          )).toList(),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Título + expiración
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(offer.title,
                            style: TextStyle(
                                color: c.textPrimary,
                                fontSize: 15,
                                fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                            color: c.bgInput,
                            borderRadius: BorderRadius.circular(6)),
                        child: Text(offer.timeLeftLabel,
                            style: TextStyle(color: c.textMuted, fontSize: 10)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),

                  Text(offer.description,
                      style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 10),

                  // Precio + proveedor
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                            color: AppColors.amber.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8)),
                        child: Text(offer.priceLabel,
                            style: const TextStyle(
                                color: AppColors.amber,
                                fontSize: 13,
                                fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(width: 8),
                      if (prov.isVerified)
                        const Icon(Icons.verified_rounded, color: AppColors.amber, size: 14),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(prov.businessName,
                            style: TextStyle(color: c.textSecondary, fontSize: 12),
                            overflow: TextOverflow.ellipsis),
                      ),
                      if (prov.localityName != null)
                        Text(prov.localityName!,
                            style: TextStyle(color: c.textMuted, fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Botones de contacto
                  Row(
                    children: [
                      if (prov.whatsapp != null)
                        Expanded(
                          child: _ContactButton(
                            svgAsset: 'assets/icons/whatsapp.svg',
                            label: 'WhatsApp',
                            color: const Color(0xFF25D366),
                            onTap: () => launchUrl(Uri.parse(
                                'https://wa.me/${prov.whatsapp!.replaceAll(RegExp(r'[^\d]'), '')}?text=Hola, vi tu oferta "${offer.title}" en Servi')),
                          ),
                        ),
                      if (prov.whatsapp != null && prov.phone != null)
                        const SizedBox(width: 8),
                      if (prov.phone != null)
                        Expanded(
                          child: _ContactButton(
                            icon: Icons.phone_rounded,
                            label: 'Llamar',
                            color: AppColors.primary,
                            onTap: () => launchUrl(Uri.parse('tel:${prov.phone}')),
                          ),
                        ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: () => _showReportSheet(context, offer.id),
                        icon: Icon(Icons.flag_outlined, size: 18, color: c.textMuted),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        splashRadius: 18,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showReportSheet(BuildContext context, int offerId) {
    final c = context.colors;
    final reasons = ['SPAM', 'PRECIO_FALSO', 'CONTENIDO_INAPROPIADO', 'OTRO'];
    final labels  = ['Spam / publicidad falsa', 'Precio engañoso', 'Contenido inapropiado', 'Otro'];

    showModalBottomSheet(
      context: context,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36, height: 4,
                decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 14),
            Text('Reportar oferta',
                style: TextStyle(color: c.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...List.generate(reasons.length, (i) => ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(labels[i], style: TextStyle(color: c.textPrimary, fontSize: 14)),
              onTap: () async {
                Navigator.pop(context);
                await context.read<PublicOffersProvider>().reportOffer(offerId, reasons[i]);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Reporte enviado. Gracias.'), behavior: SnackBarBehavior.floating),
                  );
                }
              },
            )),
          ],
        ),
      ),
    );
  }
}

// ── Tarjeta de necesidad de cliente ───────────────────────────

class _NeedCard extends StatelessWidget {
  final OpportunityModel need;
  /// true cuando la necesidad la publicó el usuario actual → puede
  /// eliminarla.
  final bool isOwn;

  const _NeedCard({required this.need, required this.isOwn});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final left = need.timeLeft;
    final hours = left.inHours;
    final mins = left.inMinutes.remainder(60);
    final expired = left.isNegative;
    final timeLabel = expired
        ? 'Expirada'
        : (hours > 0 ? 'Expira en ${hours}h ${mins}m' : 'Expira en ${mins}m');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.amber.withValues(alpha: 0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Categoría + countdown
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.amber.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(need.categoryName,
                      style: const TextStyle(
                          color: AppColors.amber,
                          fontSize: 11,
                          fontWeight: FontWeight.w700)),
                ),
                const Spacer(),
                Icon(Icons.timer_outlined,
                    size: 13,
                    color: expired ? AppColors.busy : c.textMuted),
                const SizedBox(width: 3),
                Text(timeLabel,
                    style: TextStyle(
                        color: expired ? AppColors.busy : c.textMuted,
                        fontSize: 11)),
              ],
            ),
          ),
          // Foto + descripción
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: need.photoUrl != null
                      ? Image.network(need.photoUrl!,
                          width: 64, height: 64, fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => _photoFallback())
                      : _photoFallback(),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(need.description,
                          style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w500),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          if (need.district != null)
                            _needMeta(Icons.location_city_rounded,
                                need.district!, c.textMuted),
                          if (need.distanceKm != null)
                            _needMeta(Icons.place_rounded,
                                'A ${need.distanceKm!.toStringAsFixed(1)} km',
                                AppColors.primary),
                          if (need.budgetMin != null || need.budgetMax != null)
                            _needMeta(Icons.payments_rounded,
                                _budget(need.budgetMin, need.budgetMax),
                                AppColors.available),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Footer: progreso de ofertas + (si es propia) eliminar
          Container(
            decoration: BoxDecoration(
              color: c.bg.withValues(alpha: 0.4),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(15)),
            ),
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${need.offersCount}/${need.maxOffers} profesionales ofertaron',
                    style: TextStyle(color: c.textMuted, fontSize: 11),
                  ),
                ),
                if (isOwn) ...[
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: () => _confirmDelete(context),
                    icon: const Icon(Icons.delete_outline_rounded, size: 15),
                    label: const Text('Eliminar necesidad'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.busy,
                      side: BorderSide(color: AppColors.busy.withValues(alpha: 0.45)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      textStyle: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _photoFallback() => Container(
        width: 64, height: 64,
        decoration: BoxDecoration(
          color: AppColors.amber.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Icon(Icons.handyman_rounded, color: AppColors.amber, size: 28),
      );

  Widget _needMeta(IconData icon, String label, Color color) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 3),
          Text(label, style: TextStyle(color: color, fontSize: 11)),
        ],
      );

  String _budget(double? min, double? max) {
    if (min != null && max != null) {
      return 'S/ ${min.toStringAsFixed(0)}–${max.toStringAsFixed(0)}';
    }
    if (min != null) return 'S/ ${min.toStringAsFixed(0)}+';
    if (max != null) return 'Hasta S/ ${max.toStringAsFixed(0)}';
    return '';
  }

  /// Flujo de eliminación con la regla de reputación: si hay
  /// profesionales que ya ofertaron, se advierte que la reputación
  /// bajará antes de confirmar.
  Future<void> _confirmDelete(BuildContext context) async {
    final c = context.colors;
    final hasOffers = need.offersCount > 0;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        icon: Icon(
          hasOffers ? Icons.warning_amber_rounded : Icons.delete_outline_rounded,
          color: AppColors.busy,
          size: 40,
        ),
        title: Text(
          hasOffers ? 'Tu reputación bajará' : 'Eliminar necesidad',
          textAlign: TextAlign.center,
          style: TextStyle(color: c.textPrimary, fontSize: 17, fontWeight: FontWeight.bold),
        ),
        content: Text(
          hasOffers
              ? 'Eliminar sin aceptar a un profesional hará que tu '
                'reputación baje. ${need.offersCount} profesional(es) ya '
                'enviaron su propuesta. ¿Eliminar de todas formas?'
              : '¿Seguro que quieres eliminar esta necesidad? '
                'No se puede deshacer.',
          textAlign: TextAlign.center,
          style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    final messenger = ScaffoldMessenger.of(context);
    final result = await context.read<SubastasProvider>().deleteRequest(need.id);
    if (!context.mounted) return;
    if (result != null) {
      messenger.showSnackBar(SnackBar(
        content: Text(result['hadOffers'] == true
            ? 'Necesidad eliminada. Se avisó a los profesionales que ofertaron.'
            : 'Necesidad eliminada.'),
        behavior: SnackBarBehavior.floating,
      ));
    } else {
      messenger.showSnackBar(const SnackBar(
        content: Text('No se pudo eliminar la necesidad'),
        behavior: SnackBarBehavior.floating,
      ));
    }
  }
}

class _ContactButton extends StatelessWidget {
  final IconData? icon;
  final String? svgAsset;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ContactButton({
    this.icon,
    this.svgAsset,
    required this.label,
    required this.color,
    required this.onTap,
  }) : assert(icon != null || svgAsset != null);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withValues(alpha: 0.3))),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            svgAsset != null
                ? SvgPicture.asset(svgAsset!, width: 15, height: 15)
                : Icon(icon, size: 15, color: color),
            const SizedBox(width: 5),
            Text(label,
                style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
