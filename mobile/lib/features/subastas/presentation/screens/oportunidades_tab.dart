import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../provider_dashboard/presentation/providers/dashboard_provider.dart';
import '../../domain/models/service_request_model.dart';
import '../providers/subastas_provider.dart';
import '../widgets/request_detail_sheet.dart';
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
    // El backend resuelve el provider activo desde el JWT.
    // Solo cargamos si el dashboard ya tiene un perfil cargado, para
    // evitar pegarle al endpoint cuando aún no hay sesión válida.
    final dash = context.read<DashboardProvider>();
    if (dash.profile?.id != null) {
      context.read<SubastasProvider>().loadOpportunities();
    }
  }

  /// Diálogo de advertencia antes de cancelar una oferta (con penalización).
  Future<void> _confirmCancel(OpportunityModel opp) async {
    final offerId = opp.myOfferId;
    if (offerId == null) return;
    final c = context.colors;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        icon: const Icon(
          Icons.warning_amber_rounded,
          color: AppColors.busy,
          size: 44,
        ),
        title: Text(
          '¿Cancelar tu oferta?',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: c.textPrimary,
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          'Si cancelas tu oferta, tu reputación se verá afectada. Si cancelas '
          '10 ofertas, no podrás postular a nuevas solicitudes.',
          textAlign: TextAlign.center,
          style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4),
        ),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('No, mantener', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('Sí, cancelar'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;
    final ok = await context.read<SubastasProvider>().withdrawOffer(offerId);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          ok
              ? 'Oferta cancelada. Tu solicitud quedó marcada.'
              : 'No se pudo cancelar la oferta. Intenta de nuevo.',
        ),
      ),
    );
  }

  String _statusLabel(OpportunityModel opp) {
    if (!opp.hasOffered) {
      return 'Buscando proveedor';
    }

    switch (opp.myOfferStatus) {
      case OfferStatus.pending:
        return 'Oferta enviada';

      case OfferStatus.accepted:
        return 'Oferta aceptada';

      case OfferStatus.withdrawn:
        return 'Oferta cancelada';

      case OfferStatus.rejected:
        return 'No seleccionada';

      case null:
        return 'Buscando proveedor';
    }
  }

  Color _statusColor(BuildContext context, OpportunityModel opp) {
    final c = context.colors;

    if (!opp.hasOffered) {
      return AppColors.amber;
    }

    switch (opp.myOfferStatus) {
      case OfferStatus.pending:
        return AppColors.primary;

      case OfferStatus.accepted:
        return AppColors.available;

      case OfferStatus.withdrawn:
        return AppColors.busy;

      case OfferStatus.rejected:
        return c.textMuted;

      case null:
        return AppColors.amber;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final prov = context.watch<SubastasProvider>();
    final dash = context.watch<DashboardProvider>();
    // El banner "sube tu rating" depende del rating REAL del perfil
    // (observado vía DashboardProvider). Así desaparece en tiempo real
    // cuando el rating sube a >= 3 — sin necesidad de recargar.
    final myRating = dash.profile?.averageRating ?? 0;
    final canParticipate = myRating >= 3 || (dash.profile?.isTrusted ?? false);
    // Bloqueo por cancelaciones (lo informa el backend en cada oportunidad).
    final blocked = prov.opportunities.any((o) => o.blockedFromOffering);

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
                            child: const Icon(
                              Icons.bolt_rounded,
                              color: AppColors.amber,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Oportunidades',
                                style: TextStyle(
                                  color: c.textPrimary,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                'Solicitudes cercanas en tu categoría',
                                style: TextStyle(
                                  color: c.textMuted,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          const Spacer(),
                          IconButton(
                            icon: Icon(
                              Icons.refresh_rounded,
                              color: c.textMuted,
                            ),
                            onPressed: _load,
                            tooltip: 'Actualizar',
                          ),
                        ],
                      ),

                      if (blocked)
                        const _BlockedBanner()
                      else if (!canParticipate)
                        _QualityBanner(rating: myRating),
                    ],
                  ),
                ),
              ),

              // ── Content ────────────────────────────────────────
              if (prov.state == SubastasState.loading &&
                  prov.opportunities.isEmpty)
                const SliverFillRemaining(
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.amber),
                  ),
                )
              else if (prov.opportunities.isEmpty)
                const SliverFillRemaining(child: _EmptyOpportunities())
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate((_, i) {
                      final opp = prov.opportunities[i];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () {
                            RequestDetailSheet.show(
                              context,
                              categoryName: opp.categoryName,
                              description: opp.description,
                              photoUrl: opp.photoUrl,
                              locationLabel: opp.district,
                              budgetMin: opp.budgetMin,
                              budgetMax: opp.budgetMax,
                              expiresAt: opp.expiresAt,
                              statusLabel: _statusLabel(opp),
                              statusColor: _statusColor(context, opp),
                            );
                          },
                          child: _OpportunityCard(
                            opportunity: opp,
                            canParticipate: canParticipate,
                            onBid:
                                (!opp.hasOffered &&
                                    canParticipate &&
                                    !opp.isFull &&
                                    !opp.blockedFromOffering)
                                ? () => SubmitOfferSheet.show(context, opp)
                                : null,
                            onCancel: opp.myOfferStatus == OfferStatus.pending
                                ? () => _confirmCancel(opp)
                                : null,
                          ),
                        ),
                      );
                    }, childCount: prov.opportunities.length),
                  ),
                ),
            ],
          ), // CustomScrollView
        ), // RefreshIndicator
      ), // SafeArea
    );
  }
}

// ── Opportunity card ──────────────────────────────────────────

class _OpportunityCard extends StatelessWidget {
  final OpportunityModel opportunity;

  /// Rating real del proveedor permite postular — calculado desde el
  /// perfil observado, no del snapshot de la oportunidad.
  final bool canParticipate;
  final VoidCallback? onBid;

  /// Cancelar la oferta (solo presente cuando MI oferta está PENDING).
  final VoidCallback? onCancel;

  const _OpportunityCard({
    required this.opportunity,
    required this.canParticipate,
    this.onBid,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final opp = opportunity;
    final left = opp.timeLeft;
    final hoursLeft = left.inHours;
    final minsLeft = left.inMinutes.remainder(60);
    final urgent = hoursLeft < 3;

    return GestureDetector(
      onTap: () => _openDetail(context),
      child: Container(
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
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.amber.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      opp.categoryName,
                      style: const TextStyle(
                        color: AppColors.amber,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const Spacer(),
                  _CountdownBadge(
                    hours: hoursLeft,
                    mins: minsLeft,
                    urgent: urgent,
                  ),
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
                      child: Image.network(
                        opp.photoUrl!,
                        width: 72,
                        height: 72,
                        fit: BoxFit.cover,
                      ),
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
                      child: const Icon(
                        Icons.handyman_rounded,
                        color: AppColors.amber,
                        size: 30,
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          opp.description,
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: [
                            if (opp.distanceKm != null)
                              _MetaChip(
                                icon: Icons.place_rounded,
                                label:
                                    'A ${opp.distanceKm!.toStringAsFixed(1)} km',
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
                                label: _budgetLabel(
                                  opp.budgetMin,
                                  opp.budgetMax,
                                ),
                                color: AppColors.available,
                              ),
                          ],
                        ),
                        // Contacto del cliente — solo cuando ESTE proveedor
                        // ganó (oferta aceptada). Permite concretar el trabajo.
                        if (opp.myOfferStatus == OfferStatus.accepted &&
                            (opp.clientPhone != null ||
                                opp.clientWhatsapp != null)) ...[
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              if (opp.clientWhatsapp != null)
                                _OppContactBtn(
                                  icon: Icons.chat_rounded,
                                  label: 'WhatsApp',
                                  color: AppColors.whatsapp,
                                  onTap: () =>
                                      _openWhatsApp(opp.clientWhatsapp!),
                                ),
                              if (opp.clientWhatsapp != null &&
                                  opp.clientPhone != null)
                                const SizedBox(width: 8),
                              if (opp.clientPhone != null)
                                _OppContactBtn(
                                  icon: Icons.call_rounded,
                                  label: 'Llamar',
                                  color: AppColors.call,
                                  onTap: () => _openTel(opp.clientPhone!),
                                ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── Footer: según el estado de MI postulación ───────
            Container(
              decoration: BoxDecoration(
                color: c.bg.withValues(alpha: 0.4),
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(15),
                ),
              ),
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              child: opp.hasOffered
                  ? _offeredFooter(context)
                  : _availableFooter(context),
            ),
          ],
        ),
      ),
    );
  }

  static Future<void> _openWhatsApp(String raw) async {
    final number = raw.replaceAll(RegExp(r'[^0-9]'), '');
    await launchUrl(
      Uri.parse('https://wa.me/$number'),
      mode: LaunchMode.externalApplication,
    );
  }

  static Future<void> _openTel(String raw) async {
    final uri = Uri.parse('tel:$raw');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  /// Abre el detalle completo de la oportunidad (sin dead-end: sheet con
  /// botón de cierre). Mismo componente que usa el cliente.
  void _openDetail(BuildContext context) {
    final opp = opportunity;
    final (label, color) = _detailStatus(context, opp);
    RequestDetailSheet.show(
      context,
      categoryName: opp.categoryName,
      description: opp.description,
      statusLabel: label,
      statusColor: color,
      photoUrl: opp.photoUrl,
      locationLabel: opp.district,
      budgetMin: opp.budgetMin,
      budgetMax: opp.budgetMax,
      expiresAt: opp.expiresAt,
    );
  }

  /// Etiqueta + color del estado para el detalle (coherente con la lista).
  (String, Color) _detailStatus(BuildContext context, OpportunityModel opp) {
    final c = context.colors;
    final status = opp.myOfferStatus;
    if (status != null) {
      return switch (status) {
        OfferStatus.pending => ('Oferta enviada', AppColors.primary),
        OfferStatus.accepted => ('Oferta aceptada', AppColors.available),
        OfferStatus.withdrawn => ('Oferta cancelada', AppColors.busy),
        OfferStatus.rejected => ('No seleccionada', c.textMuted),
      };
    }
    if (opp.isFull) return ('Cupo lleno', c.textMuted);
    return ('Disponible', AppColors.amber);
  }

  /// Footer cuando el proveedor YA postuló: badge de estado (+ Cancelar si
  /// la oferta sigue PENDING).
  Widget _offeredFooter(BuildContext context) {
    final c = context.colors;
    final status = opportunity.myOfferStatus!;
    final (String label, Color color, IconData icon) = switch (status) {
      OfferStatus.pending => (
        'Oferta enviada',
        AppColors.primary,
        Icons.send_rounded,
      ),

      OfferStatus.accepted => (
        'Oferta aceptada',
        AppColors.available,
        Icons.verified_rounded,
      ),

      OfferStatus.withdrawn => (
        'Oferta cancelada',
        AppColors.busy,
        Icons.cancel_outlined,
      ),

      OfferStatus.rejected => (
        'No seleccionada',
        c.textMuted,
        Icons.do_not_disturb_on_outlined,
      ),
    };

    return Row(
      children: [
        Icon(icon, size: 15, color: color),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
        const Spacer(),
        // Solo se puede cancelar mientras la oferta sigue pendiente.
        if (status == OfferStatus.pending && onCancel != null)
          OutlinedButton.icon(
            onPressed: onCancel,
            icon: const Icon(Icons.close_rounded, size: 15),
            label: const Text('Cancelar oferta'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.busy,
              side: BorderSide(color: AppColors.busy.withValues(alpha: 0.5)),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              textStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ),
      ],
    );
  }

  /// Footer cuando AÚN no postuló: progreso de ofertas + botón Postular
  /// (o el motivo por el que no puede: lleno / bloqueado / rating bajo).
  Widget _availableFooter(BuildContext context) {
    final c = context.colors;
    final opp = opportunity;
    return Row(
      children: [
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
        if (opp.isFull)
          _pill(context, 'Completa', c.border, c.textMuted)
        else if (opp.blockedFromOffering)
          _pill(
            context,
            'Bloqueado',
            AppColors.busy.withValues(alpha: 0.15),
            AppColors.busy,
          )
        else if (!canParticipate)
          _pill(context, 'Sube tu rating', c.border, c.textMuted)
        else
          ElevatedButton.icon(
            onPressed: onBid,
            icon: const Icon(Icons.send_rounded, size: 16),
            label: const Text('Postular'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.amber,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              textStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
      ],
    );
  }

  Widget _pill(BuildContext context, String label, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label, style: TextStyle(color: fg, fontSize: 12)),
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

  const _MetaChip({
    required this.icon,
    required this.label,
    required this.color,
  });

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

  const _CountdownBadge({
    required this.hours,
    required this.mins,
    required this.urgent,
  });

  @override
  Widget build(BuildContext context) {
    final label = hours > 0 ? '${hours}h ${mins}m' : '${mins}m';
    final color = urgent ? AppColors.busy : AppColors.textMuted;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.timer_outlined, size: 13, color: color),
        const SizedBox(width: 3),
        Text(
          'Expira en $label',
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
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
          const Icon(
            Icons.warning_amber_rounded,
            color: AppColors.busy,
            size: 16,
          ),
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

// ── Banner de bloqueo por cancelaciones ───────────────────────

class _BlockedBanner extends StatelessWidget {
  const _BlockedBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.busy.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.busy.withValues(alpha: 0.3)),
      ),
      child: const Row(
        children: [
          Icon(Icons.block_rounded, color: AppColors.busy, size: 16),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Cancelaste 10 ofertas. Puedes ver las oportunidades pero no '
              'postular a nuevas solicitudes.',
              style: TextStyle(color: AppColors.busy, fontSize: 12),
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
              child: const Icon(
                Icons.search_off_rounded,
                color: AppColors.amber,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Sin oportunidades ahora',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
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

/// Botón compacto de contacto del cliente (WhatsApp / Llamar) para el
/// proveedor que ganó la subasta.
class _OppContactBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _OppContactBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 16, color: color),
        label: Text(label, style: TextStyle(color: color, fontSize: 13)),
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: color.withValues(alpha: 0.4)),
          padding: const EdgeInsets.symmetric(vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
    );
  }
}
