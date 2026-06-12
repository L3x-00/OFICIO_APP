import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/utils/plan_limits.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../showcase/showcase_data.dart';
import '../../../showcase/showcase_overlay.dart';
import '../providers/dashboard_provider.dart';
import '../../domain/models/dashboard_profile_model.dart';
import '../widgets/home/home_weekly_chart.dart';
import '../widgets/home/home_reviews_section.dart';
import '../../../providers_list/domain/models/review_model.dart';
import 'package:flutter_svg/flutter_svg.dart';

class PanelStatsTab extends StatefulWidget {
  /// C-13: providerType del panel actual — pasado desde provider_panel
  /// para alinear con sus hermanos (PanelHomeTab, PanelServicesTab).
  /// Antes este tab calculaba el tipo desde `auth.activeProfileType`
  /// directo, lo que podía desincronizarse del panel activo y persistir
  /// el flag del showcase con la clave equivocada.
  final bool isNegocio;
  final VoidCallback? onNavigateToSettings;
  const PanelStatsTab({
    super.key,
    required this.isNegocio,
    this.onNavigateToSettings,
  });

  @override
  State<PanelStatsTab> createState() => _PanelStatsTabState();
}

class _PanelStatsTabState extends State<PanelStatsTab> {
  int _selectedPeriod = 30; // días

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth = context.watch<AuthProvider>();
    final dash = context.watch<DashboardProvider>();
    final plan = dash.profile?.subscription?.plan ?? 'GRATIS';

    // ── Plan GRATIS: Gestión de visitas bloqueada ─────────────
    //
    // C-14: el tutorial de stats NO dispara cuando el plan no tiene
    // acceso a estadísticas. Retornamos _StatsUpsellScreen ANTES de
    // montar el AdminTabShowcase, así que `_started` ni siquiera se
    // evalúa. Comportamiento intencional: no tiene sentido enseñar
    // "Mide tu crecimiento" sobre widgets que el user no puede ver.
    //
    // Si el user paga y pasa a ESTANDAR/PREMIUM mientras la app
    // está abierta, el plan cambia → `hasStatsAccess` retorna true
    // → este early-return deja de aplicar → AdminTabShowcase se
    // monta por primera vez y dispara el tour. ✓
    if (!PlanLimits.hasStatsAccess(plan)) {
      // FASE 3 · #4: las "Últimas reseñas" deben verse en TODOS los planes.
      // Solo las estadísticas avanzadas quedan tras el upsell — por eso el
      // _StatsUpsellScreen ahora pinta las reseñas arriba del bloqueo.
      return _StatsUpsellScreen(
        plan: plan,
        onNavigateToSettings: widget.onNavigateToSettings,
        isLoading: dash.isLoading,
        reviews: dash.reviews,
      );
    }

    final hasChartData = (dash.analytics?.dailyClicks ?? []).isNotEmpty;
    final statsSteps = buildAdminStatsSteps(hasChartData: hasChartData);
    // C-13: providerType del prop del panel (consistente con sus
    // hermanos). El fallback a auth.activeProfileType queda como
    // defensa si el prop llegara null (no debería).
    final providerType = widget.isNegocio
        ? 'NEGOCIO'
        : (auth.activeProfileType ?? 'OFICIO');

    return AdminTabShowcase(
      tab: AdminTab.stats,
      userId: auth.user?.id,
      providerType: providerType,
      isApproved: dash.profile?.isVerified ?? false,
      steps: statsSteps,
      child: Scaffold(
        backgroundColor: c.bg,
        body: CustomScrollView(
          slivers: [
            SliverAppBar(
              backgroundColor: c.bgCard,
              pinned: true,
              title: Text(
                'Estadísticas',
                style: TextStyle(
                  color: c.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              actions: [
                IconButton(
                  icon: const Icon(
                    Icons.refresh_rounded,
                    color: AppColors.amber,
                  ),
                  onPressed: () =>
                      context.read<DashboardProvider>().loadDashboard(),
                ),
              ],
            ),
            SliverToBoxAdapter(
              child: ShowcaseTarget(
                step: statsSteps.firstWhere(
                  (s) => s.key == kAdminStatsPeriodKey,
                ),
                isLast: isLastAdminStep(kAdminStatsPeriodKey, statsSteps),
                child: _buildPeriodSelector(),
              ),
            ),
            if (dash.isLoading && dash.analytics == null)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.amber),
                ),
              )
            else ...[
              SliverToBoxAdapter(child: _buildSummaryCards(dash)),
              SliverToBoxAdapter(
                child: ShowcaseTarget(
                  step: statsSteps.firstWhere(
                    (s) => s.key == kAdminStatsBreakdownKey,
                  ),
                  isLast: isLastAdminStep(kAdminStatsBreakdownKey, statsSteps),
                  child: _buildContactBreakdown(dash),
                ),
              ),
              SliverToBoxAdapter(
                child: ShowcaseTarget(
                  step: statsSteps.firstWhere(
                    (s) => s.key == kAdminStatsChartKey,
                  ),
                  isLast: isLastAdminStep(kAdminStatsChartKey, statsSteps),
                  child: _buildDailyChart(dash),
                ),
              ),
              SliverToBoxAdapter(child: _buildProfileInfo(dash)),
              SliverToBoxAdapter(child: _buildRatingSection(dash)),
              // Movidos desde Inicio (FASE 2 · #4): "Contactos esta semana"
              // y "Últimas reseñas" ahora viven en Estadísticas.
              SliverToBoxAdapter(
                child: HomeWeeklyChart(
                  isLoading: dash.isLoading,
                  analytics: dash.analytics,
                ),
              ),
              SliverToBoxAdapter(
                child: HomeReviewsSection(
                  isLoading: dash.isLoading,
                  reviews: dash.reviews,
                  onViewAll: () {},
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ],
        ),
      ),
    );
  }

  // ── SELECTOR DE PERÍODO ───────────────────────────────────

  Widget _buildPeriodSelector() {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Row(
        children: [
          Text(
            'Período:',
            style: TextStyle(color: c.textSecondary, fontSize: 13),
          ),
          const SizedBox(width: 12),
          ...[7, 14, 30].map(
            (d) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () {
                  setState(() => _selectedPeriod = d);
                  // Reload with new period
                  context.read<DashboardProvider>().loadDashboard();
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: _selectedPeriod == d
                        ? AppColors.amber.withValues(alpha: 0.15)
                        : c.bgCard,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _selectedPeriod == d
                          ? AppColors.amber
                          : Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                  child: Text(
                    '$d días',
                    style: TextStyle(
                      color: _selectedPeriod == d
                          ? AppColors.amber
                          : c.textMuted,
                      fontSize: 12,
                      fontWeight: _selectedPeriod == d
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── TARJETAS RESUMEN ──────────────────────────────────────

  Widget _buildSummaryCards(DashboardProvider dash) {
    final analytics = dash.analytics;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Row(
        children: [
          Expanded(
            child: _BigStatCard(
              icon: Icons.touch_app_rounded,
              color: AppColors.primary,
              label: 'Total contactos',
              value: '${analytics?.totalClicks ?? 0}',
              sublabel: 'en $_selectedPeriod días',
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _BigStatCard(
              icon: Icons.star_rounded,
              color: AppColors.star,
              label: 'Calificación',
              value: (dash.profile?.averageRating ?? 0.0).toStringAsFixed(1),
              sublabel: '${dash.profile?.totalReviews ?? 0} reseñas',
            ),
          ),
        ],
      ),
    );
  }

  // ── DESGLOSE DE CONTACTOS ─────────────────────────────────

  Widget _buildContactBreakdown(DashboardProvider dash) {
    final c = context.colors;
    final wa = dash.analytics?.whatsappClicks ?? 0;
    final calls = dash.analytics?.callClicks ?? 0;
    final total = wa + calls;
    final waPercent = total > 0 ? wa / total : 0.0;
    final callPercent = total > 0 ? calls / total : 0.0;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Desglose de contactos',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            _ContactBar(
              svgAsset: 'assets/icons/whatsapp.svg',
              color: AppColors.whatsapp,
              label: 'WhatsApp',
              count: wa,
              percent: waPercent,
            ),
            const SizedBox(height: 10),
            _ContactBar(
              icon: Icons.phone_rounded,
              color: AppColors.primary,
              label: 'Llamadas',
              count: calls,
              percent: callPercent,
            ),
            if (total == 0) ...[
              const SizedBox(height: 12),
              Center(
                child: Text(
                  'Todavía no hay contactos en este período',
                  style: TextStyle(color: c.textMuted, fontSize: 12),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ── GRÁFICO DIARIO ────────────────────────────────────────

  Widget _buildDailyChart(DashboardProvider dash) {
    final c = context.colors;
    final entries = dash.analytics?.dailyClicks ?? [];
    if (entries.isEmpty) {
      // Placeholder mínimo — sin él, el ShowcaseTarget del paso
      // `chart` quedaría con tamaño cero y el spotlight no aparece.
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
          ),
          child: Row(
            children: [
              Icon(Icons.show_chart_rounded, color: c.textMuted, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Aún no hay actividad. Tu crecimiento diario aparecerá aquí.',
                  style: TextStyle(
                    color: c.textMuted,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Mostrar últimos 14 días como máximo
    final displayEntries = entries.length > 14
        ? entries.sublist(entries.length - 14)
        : entries;
    final maxVal = displayEntries.fold<int>(1, (m, e) => math.max(m, e.total));

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Contactos por día',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'máx $maxVal',
                  style: TextStyle(color: c.textMuted, fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 120,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: displayEntries.map((e) {
                  final h = maxVal > 0
                      ? (e.total / maxVal * 100).clamp(0, 100) as double
                      : 0.0;
                  final date = DateTime.tryParse(e.date);
                  final label = date != null ? '${date.day}/${date.month}' : '';

                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          if (e.total > 0)
                            Text(
                              '${e.total}',
                              style: TextStyle(color: c.textMuted, fontSize: 8),
                            ),
                          const SizedBox(height: 2),
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 600),
                            curve: Curves.easeOut,
                            height: h,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  AppColors.amber,
                                  AppColors.amber.withValues(alpha: 0.5),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            label,
                            style: TextStyle(color: c.textMuted, fontSize: 8),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── INFO DEL PERFIL ───────────────────────────────────────

  Widget _buildProfileInfo(DashboardProvider dash) {
    final c = context.colors;
    final profile = dash.profile;
    if (profile == null) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Información del perfil',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 14),
            _InfoRow(
              label: 'Categoría',
              value: profile.categoryName ?? 'Sin categoría',
            ),
            _InfoRow(
              label: 'Localidad',
              value: profile.localityName ?? 'Sin localidad',
            ),
            _InfoRow(
              label: 'Fotos',
              value:
                  '${profile.images.length}/${PlanLimits.photos(profile.subscription?.plan ?? 'GRATIS')}',
            ),
            _InfoRow(
              label: 'Verificado',
              value: profile.isVerified ? 'Sí ✓' : 'Pendiente',
              valueColor: profile.isVerified
                  ? AppColors.available
                  : c.textMuted,
            ),
            if (profile.subscription != null)
              _InfoRow(
                label: 'Plan',
                value: profile.subscription!.planLabel,
                valueColor: profile.subscription!.isActive
                    ? AppColors.amber
                    : AppColors.busy,
              ),
          ],
        ),
      ),
    );
  }

  // ── CALIFICACIÓN ──────────────────────────────────────────

  Widget _buildRatingSection(DashboardProvider dash) {
    final c = context.colors;
    final rating = dash.profile?.averageRating ?? 0.0;
    final total = dash.profile?.totalReviews ?? 0;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Calificación general',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Text(
                  rating.toStringAsFixed(1),
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: List.generate(5, (i) {
                        return Icon(
                          i < rating.floor()
                              ? Icons.star_rounded
                              : i < rating
                              ? Icons.star_half_rounded
                              : Icons.star_border_rounded,
                          color: AppColors.star,
                          size: 22,
                        );
                      }),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$total reseña${total == 1 ? '' : 's'}',
                      style: TextStyle(color: c.textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              ],
            ),
            if (total == 0) ...[
              const SizedBox(height: 12),
              Text(
                'Comparte tu perfil con tus clientes para recibir las primeras reseñas.',
                style: TextStyle(color: c.textMuted, fontSize: 12, height: 1.5),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─── WIDGETS LOCALES ──────────────────────────────────────────

class _BigStatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  final String sublabel;

  const _BigStatCard({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
    required this.sublabel,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(sublabel, style: TextStyle(color: c.textMuted, fontSize: 11)),
        ],
      ),
    );
  }
}

class _ContactBar extends StatelessWidget {
  final IconData? icon; // ← Opcional
  final String? svgAsset; // ← Nuevo
  final Color color;
  final String label;
  final int count;
  final double percent;

  const _ContactBar({
    this.icon,
    this.svgAsset,
    required this.color,
    required this.label,
    required this.count,
    required this.percent,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      children: [
        svgAsset != null
            ? SvgPicture.asset(svgAsset!, width: 18, height: 18)
            : Icon(icon, color: color, size: 18),
        const SizedBox(width: 8),
        SizedBox(
          width: 60,
          child: Text(
            label,
            style: TextStyle(color: c.textSecondary, fontSize: 13),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Stack(
            children: [
              Container(
                height: 8,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              FractionallySizedBox(
                widthFactor: percent.clamp(0.0, 1.0),
                child: Container(
                  height: 8,
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        SizedBox(
          width: 30,
          child: Text(
            '$count',
            textAlign: TextAlign.right,
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(color: c.textMuted, fontSize: 13),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: valueColor ?? c.textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Pantalla de upsell para plan GRATIS ─────────────────────

class _StatsUpsellScreen extends StatelessWidget {
  final String plan;
  final VoidCallback? onNavigateToSettings;
  // FASE 3 · #4: reseñas visibles también en plan GRATIS (sobre el upsell).
  final bool isLoading;
  final List<ReviewModel> reviews;
  const _StatsUpsellScreen({
    required this.plan,
    this.onNavigateToSettings,
    this.isLoading = false,
    this.reviews = const [],
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bgCard,
        title: Text(
          'Estadísticas',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
        ),
        automaticallyImplyLeading: false,
      ),
      body: ListView(
        children: [
          // Reseñas SIEMPRE visibles (todos los planes).
          HomeReviewsSection(
            isLoading: isLoading,
            reviews: reviews,
            onViewAll: () {},
          ),
          // Bloque de upsell para el resto de estadísticas avanzadas.
          Padding(
            padding: const EdgeInsets.fromLTRB(32, 16, 32, 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    color: AppColors.amber.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.amber.withValues(alpha: 0.3),
                      width: 1.5,
                    ),
                  ),
                  child: const Icon(
                    Icons.bar_chart_rounded,
                    color: AppColors.amber,
                    size: 44,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Gestión de visitas',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Las estadísticas de visitas, contactos y rendimiento de tu perfil están disponibles desde el plan Estándar.',
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 14,
                    height: 1.6,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 28),
                // Beneficios de upgrade
                _UpsellBenefit(
                  icon: Icons.touch_app_rounded,
                  color: AppColors.primary,
                  text: 'Cuántas personas contactaron tu perfil',
                ),
                _UpsellBenefit(
                  svgAsset: 'assets/icons/whatsapp.svg',
                  color: AppColors.whatsapp,
                  text: 'Contactos por WhatsApp vs llamadas',
                ),
                _UpsellBenefit(
                  icon: Icons.show_chart_rounded,
                  color: AppColors.amber,
                  text: 'Gráfico diario de actividad',
                ),
                _UpsellBenefit(
                  icon: Icons.star_rounded,
                  color: AppColors.star,
                  text: 'Evolución de calificaciones',
                ),
                const SizedBox(height: 28),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.amber.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.amber.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.workspace_premium_rounded,
                        color: AppColors.amber,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Disponible desde Plan Estándar · S/ 29/mes',
                        style: TextStyle(
                          color: AppColors.amber,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: onNavigateToSettings,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.amber,
                      foregroundColor: const Color(0xFF3D2B00),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Ver planes de suscripción',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _UpsellBenefit extends StatelessWidget {
  final IconData? icon; // ← Opcional
  final String? svgAsset; // ← Nuevo
  final Color color;
  final String text;
  const _UpsellBenefit({
    this.icon,
    this.svgAsset,
    required this.color,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: svgAsset != null
                  ? SvgPicture.asset(svgAsset!, width: 16, height: 16)
                  : Icon(icon, color: color, size: 16),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: c.textSecondary, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
