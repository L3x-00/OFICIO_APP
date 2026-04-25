import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/models/service_request_model.dart';
import '../providers/subastas_provider.dart';
import '../widgets/offer_comparison_sheet.dart';

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SubastasProvider>().loadMyRequests();
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final prov = context.watch<SubastasProvider>();

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        title: Text('Mis solicitudes',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.w700)),
        iconTheme: IconThemeData(color: c.textPrimary),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => context.read<SubastasProvider>().loadMyRequests(),
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: Builder(builder: (_) {
        if (prov.state == SubastasState.loading && prov.myRequests.isEmpty) {
          return const Center(child: CircularProgressIndicator(color: AppColors.primary));
        }
        if (prov.myRequests.isEmpty) {
          return _EmptyRequests(onPublish: () async {
            final nav = Navigator.of(context);
            final subProv = context.read<SubastasProvider>();
            final ok = await nav.pushNamed('/subastas/publish');
            if (ok == true) subProv.loadMyRequests();
          });
        }
        return RefreshIndicator(
          onRefresh: () => context.read<SubastasProvider>().loadMyRequests(),
          color: AppColors.primary,
          backgroundColor: c.bgCard,
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: prov.myRequests.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _RequestCard(
              request: prov.myRequests[i],
              onViewOffers: () => OfferComparisonSheet.show(context, prov.myRequests[i]),
            ),
          ),
        );
      }),
    );
  }
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
    final pending = r.offers.where((o) => o.status == OfferStatus.pending).length;
    final accepted = r.offers.where((o) => o.status == OfferStatus.accepted).firstOrNull;

    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _borderColor(r.status)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
            child: Row(
              children: [
                _StatusBadge(status: r.status),
                const Spacer(),
                if (r.isOpen)
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
                    child: Image.network(r.photoUrl!,
                        width: 64, height: 64, fit: BoxFit.cover),
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
                    child: const Icon(Icons.handyman_rounded, color: AppColors.primary, size: 28),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(r.categoryName,
                          style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 12,
                              fontWeight: FontWeight.w600)),
                      const SizedBox(height: 2),
                      Text(r.description,
                          style: TextStyle(color: c.textPrimary, fontSize: 14),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis),
                      if (r.budgetMin != null || r.budgetMax != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            _budgetLabel(r.budgetMin, r.budgetMax),
                            style: TextStyle(color: c.textMuted, fontSize: 12),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Footer ──────────────────────────────────────────
          Container(
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
                  accepted != null
                      ? 'Proveedor elegido: ${accepted.providerName}'
                      : '$pending oferta${pending == 1 ? '' : 's'} recibida${pending == 1 ? '' : 's'}',
                  style: TextStyle(
                    color: accepted != null ? AppColors.available : c.textSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                if (r.isOpen && r.offers.isNotEmpty)
                  GestureDetector(
                    onTap: onViewOffers,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text('Ver ofertas',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w700)),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _borderColor(ServiceRequestStatus s) => switch (s) {
        ServiceRequestStatus.open     => AppColors.primary.withValues(alpha: 0.4),
        ServiceRequestStatus.closed   => AppColors.available.withValues(alpha: 0.4),
        ServiceRequestStatus.expired  => AppColors.busy.withValues(alpha: 0.3),
        ServiceRequestStatus.cancelled => Colors.grey.withValues(alpha: 0.3),
      };

  String _budgetLabel(double? min, double? max) {
    if (min != null && max != null) return 'S/ ${min.toStringAsFixed(0)} – ${max.toStringAsFixed(0)}';
    if (min != null) return 'Desde S/ ${min.toStringAsFixed(0)}';
    if (max != null) return 'Hasta S/ ${max.toStringAsFixed(0)}';
    return '';
  }
}

// ── Status badge ──────────────────────────────────────────────

class _StatusBadge extends StatelessWidget {
  final ServiceRequestStatus status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      ServiceRequestStatus.open      => ('Activa', AppColors.primary),
      ServiceRequestStatus.closed    => ('Cerrada', AppColors.available),
      ServiceRequestStatus.expired   => ('Expirada', AppColors.busy),
      ServiceRequestStatus.cancelled => ('Cancelada', Colors.grey),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
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
        Icon(Icons.timer_outlined,
            size: 13, color: urgent ? AppColors.busy : AppColors.textMuted),
        const SizedBox(width: 3),
        Text(label,
            style: TextStyle(
                color: urgent ? AppColors.busy : AppColors.textMuted,
                fontSize: 11)),
      ],
    );
  }
}

// ── Empty state ───────────────────────────────────────────────

class _EmptyRequests extends StatelessWidget {
  final VoidCallback onPublish;
  const _EmptyRequests({required this.onPublish});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
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
              child: const Icon(Icons.campaign_rounded, color: AppColors.primary, size: 40),
            ),
            const SizedBox(height: 20),
            Text('Sin solicitudes aún',
                style: TextStyle(
                    color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text('Publica tu necesidad y recibe ofertas de técnicos cercanos en minutos.',
                style: TextStyle(color: c.textMuted, fontSize: 13),
                textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onPublish,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Publicar necesidad'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
