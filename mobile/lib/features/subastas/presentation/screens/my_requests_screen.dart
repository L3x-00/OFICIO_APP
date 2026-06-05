import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/models/service_request_model.dart';
import '../providers/subastas_provider.dart';
import '../widgets/offer_comparison_sheet.dart';
import '../widgets/request_detail_sheet.dart';
import '../widgets/trust_badge.dart';
import 'publish_request_sheet.dart';

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen>
    with SingleTickerProviderStateMixin {
  /// Guard para que un doble-tap del FAB no abra dos sheets de
  /// publicación a la vez.
  bool _openingSheet = false;

  // Dos pestañas para el cliente: todas sus solicitudes vs solo las que
  // siguen buscando proveedor.
  late final TabController _tabs = TabController(length: 2, vsync: this);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SubastasProvider>().loadMyRequests();
    });
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  /// Vuelve SIEMPRE al Home (nunca cierra la app), sin importar cómo se
  /// llegó a esta ruta top-level.
  void _goHome() => context.go('/');

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final prov = context.watch<SubastasProvider>();
    final loading = prov.state == SubastasState.loading;
    // Tab "Activas": solo las que siguen buscando proveedor (OPEN y no vencidas).
    final active = prov.myRequests
        .where((r) => r.isOpen && !r.isExpired)
        .toList();

    return PopScope(
      // El back (sistema o AppBar) SIEMPRE va al Home, nunca sale de la app.
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _goHome();
      },
      child: Scaffold(
        backgroundColor: c.bg,
        // Único botón de "Publicar necesidad": el FAB (antes había además uno
        // en el empty state → duplicado). Siempre accesible.
        floatingActionButton: FloatingActionButton.extended(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          onPressed: () => _openPublishSheet(context),
          icon: const Icon(Icons.add_rounded),
          label: const Text('Publicar necesidad'),
        ),
        appBar: AppBar(
          backgroundColor: c.bg,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: _goHome,
            tooltip: 'Inicio',
          ),
          title: Text(
            'Mis solicitudes',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.w700),
          ),
          iconTheme: IconThemeData(color: c.textPrimary),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: () =>
                  context.read<SubastasProvider>().loadMyRequests(),
              tooltip: 'Actualizar',
            ),
          ],
          bottom: TabBar(
            controller: _tabs,
            indicatorColor: AppColors.primary,
            labelColor: AppColors.primary,
            unselectedLabelColor: c.textMuted,
            labelStyle: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 13.5,
            ),
            tabs: [
              const Tab(text: 'Mis solicitudes'),
              Tab(
                text: active.isEmpty ? 'Activas' : 'Activas (${active.length})',
              ),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tabs,
          children: [
            _RequestsList(
              loading: loading,
              items: prov.myRequests,
              emptyKind: _EmptyKind.all,
              onRefresh: () =>
                  context.read<SubastasProvider>().loadMyRequests(),
            ),
            _RequestsList(
              loading: loading,
              items: active,
              emptyKind: _EmptyKind.active,
              onRefresh: () =>
                  context.read<SubastasProvider>().loadMyRequests(),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openPublishSheet(BuildContext context) async {
    if (_openingSheet) return;
    _openingSheet = true;
    try {
      final subProv = context.read<SubastasProvider>();
      final ok = await PublishRequestSheet.show(context);
      if (ok == true) subProv.loadMyRequests();
    } finally {
      _openingSheet = false;
    }
  }
}

// ── Lista de solicitudes (reutilizada por ambas pestañas) ─────

enum _EmptyKind { all, active }

class _RequestsList extends StatelessWidget {
  final bool loading;
  final List<ServiceRequestModel> items;
  final _EmptyKind emptyKind;
  final Future<void> Function() onRefresh;

  const _RequestsList({
    required this.loading,
    required this.items,
    required this.emptyKind,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (loading && items.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }
    if (items.isEmpty) {
      return _EmptyRequests(kind: emptyKind);
    }
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.primary,
      backgroundColor: c.bgCard,
      child: ListView.separated(
        // Padding inferior holgado para que el FAB no tape la última tarjeta.
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (_, i) => _RequestCard(
          request: items[i],
          onViewOffers: () => OfferComparisonSheet.show(context, items[i]),
        ),
      ),
    );
  }
}

// ── Estado/etiqueta orientada al cliente ──────────────────────

/// Etiqueta + color del estado de la solicitud, en lenguaje del cliente.
/// "Proveedor seleccionado" gana cuando ya hay una oferta aceptada.
(String, Color) _statusLabel(ServiceRequestModel r) {
  // Esquema consistente: AWARDED/seleccionado=verde, OPEN/buscando=ámbar,
  // EXPIRED/cancelada=gris.
  if (r.offers.any((o) => o.status == OfferStatus.accepted)) {
    return ('Proveedor seleccionado', AppColors.available);
  }
  if (r.status == ServiceRequestStatus.open && r.isExpired) {
    return ('Solicitud vencida', AppColors.textMuted);
  }
  return switch (r.status) {
    ServiceRequestStatus.open => ('Buscando proveedor', AppColors.amber),
    ServiceRequestStatus.closed => ('Buscando proveedor', AppColors.amber),
    ServiceRequestStatus.expired => ('Solicitud vencida', AppColors.textMuted),
    ServiceRequestStatus.cancelled => ('Cancelada', AppColors.textMuted),
  };
}

// ── Request card ──────────────────────────────────────────────

class _RequestCard extends StatelessWidget {
  final ServiceRequestModel request;
  final VoidCallback onViewOffers;

  const _RequestCard({required this.request, required this.onViewOffers});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final r = request;
    final pending = r.offers
        .where((o) => o.status == OfferStatus.pending)
        .length;
    final accepted = r.offers
        .where((o) => o.status == OfferStatus.accepted)
        .firstOrNull;
    final statusColor = _statusLabel(r).$2;

    return GestureDetector(
      onTap: () => _openDetail(context),
      child: Container(
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: statusColor.withValues(alpha: 0.4)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header ──────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
              child: Row(
                children: [
                  _StatusBadge(request: r),
                  const Spacer(),
                  // Countdown solo si sigue genuinamente abierta (no vencida).
                  if (r.isOpen && !r.isExpired)
                    _CountdownChip(expiresAt: r.expiresAt),
                ],
              ),
            ),

            // ── Foto + descripción ───────────────────────────────
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (r.photoUrl != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        r.photoUrl!,
                        width: 64,
                        height: 64,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 12),
                  ] else ...[
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.handyman_rounded,
                        color: AppColors.primary,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          r.categoryName,
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          r.description,
                          style: TextStyle(color: c.textPrimary, fontSize: 14),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (r.budgetMin != null || r.budgetMax != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              _budgetLabel(r.budgetMin, r.budgetMax),
                              style: TextStyle(
                                color: c.textMuted,
                                fontSize: 12,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── Footer: proveedor seleccionado (solo lectura) o estado ──
            if (accepted != null)
              _SelectedProviderBlock(offer: accepted)
            else
              _RequestFooter(
                request: r,
                pending: pending,
                onViewOffers: onViewOffers,
              ),
          ],
        ),
      ),
    );
  }

  /// Abre el detalle completo (read-only) — nunca un dead-end (sheet con
  /// botón de cierre). Si hay proveedor aceptado, lo muestra al pie.
  void _openDetail(BuildContext context) {
    final r = request;
    final accepted = r.offers
        .where((o) => o.status == OfferStatus.accepted)
        .firstOrNull;
    final (label, color) = _statusLabel(r);
    final loc = [
      r.district,
      r.province,
    ].where((x) => x != null && x.trim().isNotEmpty).join(', ');
    RequestDetailSheet.show(
      context,
      categoryName: r.categoryName,
      description: r.description,
      statusLabel: label,
      statusColor: color,
      photoUrl: r.photoUrl,
      locationLabel: loc.isEmpty ? null : loc,
      budgetMin: r.budgetMin,
      budgetMax: r.budgetMax,
      desiredDate: r.desiredDate,
      expiresAt: r.expiresAt,
      footer: accepted != null ? _SelectedProviderBlock(offer: accepted) : null,
    );
  }

  String _budgetLabel(double? min, double? max) {
    if (min != null && max != null) {
      return 'S/ ${min.toStringAsFixed(0)} – ${max.toStringAsFixed(0)}';
    }
    if (min != null) return 'Desde S/ ${min.toStringAsFixed(0)}';
    if (max != null) return 'Hasta S/ ${max.toStringAsFixed(0)}';
    return '';
  }
}

// ── Footer cuando AÚN busca proveedor ─────────────────────────

class _RequestFooter extends StatelessWidget {
  final ServiceRequestModel request;
  final int pending;
  final VoidCallback onViewOffers;

  const _RequestFooter({
    required this.request,
    required this.pending,
    required this.onViewOffers,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final r = request;
    return Container(
      decoration: BoxDecoration(
        color: c.bg.withValues(alpha: 0.5),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
      ),
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
      child: Row(
        children: [
          Icon(Icons.local_offer_rounded, size: 14, color: c.textMuted),
          const SizedBox(width: 4),
          Text(
            '$pending oferta${pending == 1 ? '' : 's'} recibida${pending == 1 ? '' : 's'}',
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          if (r.isOpen && r.offers.isNotEmpty)
            GestureDetector(
              onTap: onViewOffers,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'Ver ofertas',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Bloque del proveedor SELECCIONADO (solo lectura) ──────────

class _SelectedProviderBlock extends StatelessWidget {
  final OfferModel offer;
  const _SelectedProviderBlock({required this.offer});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final initial = offer.providerName.isNotEmpty
        ? offer.providerName[0].toUpperCase()
        : '?';
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.available.withValues(alpha: 0.07),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
        border: Border(
          top: BorderSide(color: AppColors.available.withValues(alpha: 0.25)),
        ),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.verified_rounded,
                size: 15,
                color: AppColors.available,
              ),
              const SizedBox(width: 5),
              Text(
                'Proveedor seleccionado',
                style: TextStyle(
                  color: AppColors.available,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                backgroundImage: offer.providerAvatarUrl != null
                    ? NetworkImage(offer.providerAvatarUrl!)
                    : null,
                child: offer.providerAvatarUrl == null
                    ? Text(
                        initial,
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            offer.providerName,
                            style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        TrustBadge(
                          isTrusted: offer.providerIsTrusted,
                          size: 14,
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(
                          Icons.star_rounded,
                          size: 13,
                          color: AppColors.star,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          '${offer.providerRating.toStringAsFixed(1)} (${offer.providerTotalReviews})',
                          style: TextStyle(
                            color: c.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'Acordado',
                    style: TextStyle(color: c.textMuted, fontSize: 10),
                  ),
                  Text(
                    'S/ ${offer.price.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: AppColors.available,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (offer.message.trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              offer.message,
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 12.5,
                height: 1.35,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

// ── Status badge ──────────────────────────────────────────────

class _StatusBadge extends StatelessWidget {
  final ServiceRequestModel request;
  const _StatusBadge({required this.request});

  @override
  Widget build(BuildContext context) {
    final (label, color) = _statusLabel(request);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

// ── Countdown chip ────────────────────────────────────────────

class _CountdownChip extends StatelessWidget {
  final DateTime expiresAt;
  const _CountdownChip({required this.expiresAt});

  @override
  Widget build(BuildContext context) {
    final left = expiresAt.difference(DateTime.now());
    final hours = left.inHours;
    final mins = left.inMinutes.remainder(60);
    final label = hours > 0 ? '${hours}h ${mins}m' : '${mins}m';
    final urgent = hours < 2;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.timer_outlined,
          size: 13,
          color: urgent ? AppColors.busy : AppColors.textMuted,
        ),
        const SizedBox(width: 3),
        Text(
          label,
          style: TextStyle(
            color: urgent ? AppColors.busy : AppColors.textMuted,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

// ── Empty state ───────────────────────────────────────────────

class _EmptyRequests extends StatelessWidget {
  final _EmptyKind kind;
  const _EmptyRequests({required this.kind});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // Sin botón aquí: el único CTA de publicar es el FAB (evita duplicado).
    final (title, subtitle) = kind == _EmptyKind.active
        ? (
            'Sin solicitudes activas',
            'Cuando publiques una necesidad aparecerá aquí mientras busca proveedor.',
          )
        : (
            'Sin solicitudes aún',
            'Pulsa el botón "+ Publicar necesidad" y recibe ofertas de técnicos cercanos en minutos.',
          );
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.campaign_rounded,
                color: AppColors.primary,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(color: c.textMuted, fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
