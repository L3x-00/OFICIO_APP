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

// Widgets extraídos a part files (comparten esta librería: imports + privados).
part 'offers_screen.filters.dart';
part 'offers_screen.cards.dart';

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

class _OffersScreenState extends State<OffersScreen>
    with AutomaticKeepAliveClientMixin {
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
        province: auth.user?.province,
        district: auth.user?.district,
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
                  const Icon(
                    Icons.local_offer_rounded,
                    color: AppColors.amber,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Ofertas 💸',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ],
              ),
              actions: [
                if (isProvider) ...[
                  // Toggle "Mis Ofertas".
                  IconButton(
                    tooltip: 'Mis ofertas',
                    onPressed: () => setState(
                      () => _view = view == _OffersView.mias
                          ? _OffersView.ofertas
                          : _OffersView.mias,
                    ),
                    icon: Icon(
                      Icons.sell_outlined,
                      color: view == _OffersView.mias
                          ? AppColors.amber
                          : c.textPrimary,
                    ),
                  ),
                  // Toggle "Necesidades de clientes".
                  IconButton(
                    tooltip: 'Necesidades de clientes',
                    onPressed: () {
                      setState(
                        () => _view = view == _OffersView.necesidades
                            ? _OffersView.ofertas
                            : _OffersView.necesidades,
                      );
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
          child: Center(
            child: CircularProgressIndicator(color: AppColors.amber),
          ),
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
                    fontWeight: FontWeight.bold,
                  ),
                ),
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
            delegate: SliverChildBuilderDelegate((ctx, i) {
              if (i == listOffers.length) {
                return (!showMine && prov.hasMore)
                    ? const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(
                          child: CircularProgressIndicator(
                            color: AppColors.amber,
                            strokeWidth: 2,
                          ),
                        ),
                      )
                    : const SizedBox(height: 16);
              }
              return _OfferCard(offer: listOffers[i]);
            }, childCount: listOffers.length + 1),
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
          child: Center(
            child: CircularProgressIndicator(color: AppColors.amber),
          ),
        )
      else if (needs.isEmpty)
        SliverFillRemaining(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.assignment_outlined, size: 64, color: c.textMuted),
                const SizedBox(height: 16),
                Text(
                  'Sin necesidades por ahora',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
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
