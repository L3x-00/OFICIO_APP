import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../provider_dashboard/presentation/providers/dashboard_provider.dart';
import '../../domain/models/service_request_model.dart';
import '../providers/subastas_provider.dart';
import '../widgets/submit_offer_sheet.dart';

class OportunidadesTab extends StatefulWidget {
  const OportunidadesTab({super.key});

  @override
  State<OportunidadesTab> createState() => _OportunidadesTabState();
}

class _OportunidadesTabState extends State<OportunidadesTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  void _load() {
    final dash = context.read<DashboardProvider>();
    final providerId = dash.profile?.id;
    if (providerId != null) {
      context.read<SubastasProvider>().loadOpportunities(providerId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final prov = context.watch<SubastasProvider>();
    final dash = context.watch<DashboardProvider>();

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => _load(),
          color: AppColors.amber,
          backgroundColor: c.bgCard,
          child: CustomScrollView(
        slivers: [
          // ── Header ─────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.amber.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.bolt_rounded,
                            color: AppColors.amber, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Oportunidades',
                              style: TextStyle(
                                  color: c.textPrimary,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800)),
                          Text('Solicitudes cercanas en tu categoría',
                              style: TextStyle(color: c.textMuted, fontSize: 12)),
                        ],
                      ),
                      const Spacer(),
                      IconButton(
                        icon: Icon(Icons.refresh_rounded, color: c.textMuted),
                        onPressed: _load,
                        tooltip: 'Actualizar',
                      ),
                    ],
                  ),

                  if (!prov.opportunities.any((o) => o.canParticipate))
                    _QualityBanner(rating: dash.profile?.averageRating ?? 0),
                ],
              ),
            ),
          ),

          // ── Content ────────────────────────────────────────
          if (prov.state == SubastasState.loading && prov.opportunities.isEmpty)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: AppColors.amber)),
            )
          else if (prov.opportunities.isEmpty)
            const SliverFillRemaining(child: _EmptyOpportunities())
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, i) {
                    final opp = prov.opportunities[i];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _OpportunityCard(
                        opportunity: opp,
                        onBid: opp.canParticipate && !opp.isFull
                            ? () => SubmitOfferSheet.show(context, opp)
                            : null,
                      ),
                    );
                  },
                  childCount: prov.opportunities.length,
                ),
              ),
            ),
        ],
          ),  // CustomScrollView
        ),    // RefreshIndicator
      ),      // SafeArea
    );
  }
}

// ── Opportunity card ──────────────────────────────────────────

class _OpportunityCard extends StatelessWidget {
  final OpportunityModel opportunity;
  final VoidCallback? onBid;

  const _OpportunityCard({required this.opportunity, this.onBid});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final opp = opportunity;
    final left = opp.timeLeft;
    final hoursLeft = left.inHours;
    final minsLeft = left.inMinutes.remainder(60);
    final urgent = hoursLeft < 3;

    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: urgent
              ? AppColors.busy.withValues(alpha: 0.4)
              : AppColors.amber.withValues(alpha: 0.25),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Top row: category + countdown ──────────────────
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
                  child: Text(opp.categoryName,
                      style: const TextStyle(
                          color: AppColors.amber,
                          fontSize: 11,
                          fontWeight: FontWeight.w700)),
                ),
                const Spacer(),
                _CountdownBadge(hours: hoursLeft, mins: minsLeft, urgent: urgent),
              ],
            ),
          ),

          // ── Photo + description ─────────────────────────────
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (opp.photoUrl != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.network(opp.photoUrl!,
                        width: 72, height: 72, fit: BoxFit.cover),
                  ),
                  const SizedBox(width: 12),
                ] else ...[
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppColors.amber.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.handyman_rounded,
                        color: AppColors.amber, size: 30),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(opp.description,
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
                          if (opp.distanceKm != null)
                            _MetaChip(
                              icon: Icons.place_rounded,
                              label: 'A ${opp.distanceKm!.toStringAsFixed(1)} km',
                              color: AppColors.primary,
                            ),
                          if (opp.district != null)
                            _MetaChip(
                              icon: Icons.location_city_rounded,
                              label: opp.district!,
                              color: AppColors.textMuted,
                            ),
                          if (opp.budgetMin != null || opp.budgetMax != null)
                            _MetaChip(
                              icon: Icons.payments_rounded,
                              label: _budgetLabel(opp.budgetMin, opp.budgetMax),
                              color: AppColors.available,
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Footer: offers progress + bid button ────────────
          Container(
            decoration: BoxDecoration(
              color: c.bg.withValues(alpha: 0.4),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(15)),
            ),
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
            child: Row(
              children: [
                // Offers progress
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${opp.offersCount}/${opp.maxOffers} ofertas',
                        style: TextStyle(color: c.textMuted, fontSize: 11),
                      ),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: opp.offersCount / opp.maxOffers,
                          backgroundColor: c.border,
                          valueColor: AlwaysStoppedAnimation(
                            opp.isFull ? AppColors.busy : AppColors.amber,
                          ),
                          minHeight: 4,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 16),

                // Bid button
                if (opp.isFull)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: c.border,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('Completa',
                        style: TextStyle(color: c.textMuted, fontSize: 12)),
                  )
                else if (!opp.canParticipate)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: c.border,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('Sube tu rating',
                        style: TextStyle(color: c.textMuted, fontSize: 12)),
                  )
                else
                  ElevatedButton.icon(
                    onPressed: onBid,
                    icon: const Icon(Icons.send_rounded, size: 16),
                    label: const Text('Postular'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.amber,
                      foregroundColor: Colors.black,
                      padding:
                          const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20)),
                      textStyle: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _budgetLabel(double? min, double? max) {
    if (min != null && max != null) {
      return 'S/ ${min.toStringAsFixed(0)}–${max.toStringAsFixed(0)}';
    }
    if (min != null) return 'S/ ${min.toStringAsFixed(0)}+';
    if (max != null) return 'Hasta S/ ${max.toStringAsFixed(0)}';
    return '';
  }
}

// ── Meta chip ─────────────────────────────────────────────────

class _MetaChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _MetaChip({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 3),
        Text(label, style: TextStyle(color: color, fontSize: 11)),
      ],
    );
  }
}

// ── Countdown badge ───────────────────────────────────────────

class _CountdownBadge extends StatelessWidget {
  final int hours;
  final int mins;
  final bool urgent;

  const _CountdownBadge(
      {required this.hours, required this.mins, required this.urgent});

  @override
  Widget build(BuildContext context) {
    final label = hours > 0 ? '${hours}h ${mins}m' : '${mins}m';
    final color = urgent ? AppColors.busy : AppColors.textMuted;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.timer_outlined, size: 13, color: color),
        const SizedBox(width: 3),
        Text('Expira en $label',
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

// ── Quality banner ────────────────────────────────────────────

class _QualityBanner extends StatelessWidget {
  final double rating;
  const _QualityBanner({required this.rating});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.busy.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.busy.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: AppColors.busy, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Necesitas rating ≥ 3.0 para postular. Tu rating actual: ${rating.toStringAsFixed(1)}',
              style: const TextStyle(color: AppColors.busy, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────

class _EmptyOpportunities extends StatelessWidget {
  const _EmptyOpportunities();

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
                color: AppColors.amber.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.search_off_rounded,
                  color: AppColors.amber, size: 40),
            ),
            const SizedBox(height: 20),
            Text('Sin oportunidades ahora',
                style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(
              'Cuando un cliente publique una necesidad en tu categoría, aparecerá aquí.',
              style: TextStyle(color: c.textMuted, fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
