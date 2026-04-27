import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../providers_list/domain/models/review_model.dart';
import '../providers/dashboard_provider.dart';
import '../../domain/models/dashboard_profile_model.dart';

class PanelHomeTab extends StatefulWidget {
  final bool isNegocio;
  final bool isPaused;
  final ValueChanged<int> onChangeTab;

  const PanelHomeTab({
    super.key,
    required this.isNegocio,
    required this.isPaused,
    required this.onChangeTab,
  });

  @override
  State<PanelHomeTab> createState() => _PanelHomeTabState();
}

class _PanelHomeTabState extends State<PanelHomeTab> {
  String get _providerType => widget.isNegocio ? 'NEGOCIO' : 'OFICIO';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().loadDashboard(providerType: _providerType);
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dash = context.watch<DashboardProvider>();
    final auth = context.watch<AuthProvider>();
    final defaultName = widget.isNegocio ? 'tu negocio' : 'tu servicio';
    final name = dash.profile?.businessName ?? auth.user?.firstName ?? defaultName;

    return RefreshIndicator(
      onRefresh: () => context.read<DashboardProvider>().loadDashboard(providerType: _providerType),
      color: AppColors.amber,
      backgroundColor: c.bgCard,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _buildHeader(name, dash)),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.55,
              ),
              delegate: SliverChildListDelegate([
                _StatCard(
                  icon: Icons.remove_red_eye_rounded,
                  color: AppColors.primary,
                  label: 'Visitas',
                  value: dash.isLoading ? '—' : '${dash.analytics?.totalClicks ?? 0}',
                  sublabel: 'este mes',
                ),
                _StatCard(
                  icon: Icons.phone_in_talk_rounded,
                  color: AppColors.whatsapp,
                  label: 'Contactos',
                  value: dash.isLoading
                      ? '—'
                      : '${(dash.analytics?.whatsappClicks ?? 0) + (dash.analytics?.callClicks ?? 0)}',
                  sublabel: 'WhatsApp + llamadas',
                ),
                _StatCard(
                  icon: Icons.favorite_rounded,
                  color: AppColors.favorite,
                  label: 'Favoritos',
                  value: dash.isLoading ? '—' : '${dash.profile?.totalFavorites ?? 0}',
                  sublabel: 'guardaron tu perfil',
                ),
                _StatCard(
                  icon: Icons.star_rounded,
                  color: AppColors.star,
                  label: 'Calificación',
                  value: dash.isLoading
                      ? '—'
                      : (dash.profile?.averageRating ?? 0.0).toStringAsFixed(1),
                  sublabel: '${dash.profile?.totalReviews ?? 0} reseñas',
                  showStars: true,
                  rating: dash.profile?.averageRating ?? 0.0,
                ),
              ]),
            ),
          ),
          SliverToBoxAdapter(child: _buildNotificationsSection(dash)),
          SliverToBoxAdapter(child: _buildWeeklyChart(dash)),
          SliverToBoxAdapter(child: _buildReviewsSection(dash)),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }

  // ── HEADER ────────────────────────────────────────────────

  Widget _buildHeader(String name, DashboardProvider dash) {
    final c = context.colors;
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 52, 20, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: widget.isNegocio
              ? [const Color(0xFF2A0A4A), c.bgCard]   // morado oscuro para negocio
              : [const Color(0xFF3D2B00), c.bgCard],  // ámbar oscuro para profesional
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$greeting,',
                      style: TextStyle(color: c.textSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      name,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              _StatusBadge(isPaused: widget.isPaused),
            ],
          ),
          if (dash.profile?.subscription != null) ...[
            const SizedBox(height: 12),
            _SubscriptionBanner(sub: dash.profile!.subscription!),
          ],
          // Badge "Va a domicilio" — solo OFICIO cuando está activo
          if (!widget.isNegocio && (dash.profile?.hasHomeService ?? false)) ...[
            const SizedBox(height: 10),
            _HomeServiceBadge(),
          ],
        ],
      ),
    );
  }

  // ── NOTIFICACIONES ────────────────────────────────────────

  Widget _buildNotificationsSection(DashboardProvider dash) {
    if (dash.notifications.isEmpty) return const SizedBox.shrink();
    final c = context.colors;

    Color colorForType(String type) {
      switch (type) {
        case 'APROBADO':            return const Color(0xFF22C55E);
        case 'RECHAZADO':           return const Color(0xFFEF4444);
        case 'VERIFICACION_REVOCADA': return const Color(0xFFF97316);
        case 'MAS_INFO':
        default:                    return const Color(0xFF3B82F6);
      }
    }

    IconData iconForType(String type) {
      switch (type) {
        case 'APROBADO':            return Icons.verified_rounded;
        case 'RECHAZADO':           return Icons.cancel_rounded;
        case 'VERIFICACION_REVOCADA': return Icons.remove_circle_rounded;
        case 'MAS_INFO':
        default:                    return Icons.info_rounded;
      }
    }

    String labelForType(String type) {
      switch (type) {
        case 'APROBADO':            return 'Aprobado';
        case 'RECHAZADO':           return 'Rechazado';
        case 'VERIFICACION_REVOCADA': return 'Verificación revocada';
        case 'MAS_INFO':
        default:                    return 'Más información';
      }
    }

    final unread = dash.unreadNotifications;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Notificaciones',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (unread > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.amber,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$unread',
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          ...dash.notifications.take(5).map((n) {
            final color = colorForType(n.type);
            final isUnread = !n.isRead;
            return GestureDetector(
              onTap: () {
                if (isUnread) {
                  context.read<DashboardProvider>().markNotificationRead(n.id);
                }
              },
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isUnread ? color.withValues(alpha: 0.08) : c.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isUnread ? color.withValues(alpha: 0.35) : Colors.white.withValues(alpha: 0.06),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(iconForType(n.type), color: color, size: 18),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                labelForType(n.type),
                                style: TextStyle(
                                  color: color,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (isUnread) ...[
                                const SizedBox(width: 6),
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                              const Spacer(),
                              Text(
                                _formatNotifDate(n.sentAt),
                                style: TextStyle(color: c.textMuted, fontSize: 11),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            n.message,
                            style: TextStyle(color: c.textSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  String _formatNotifDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes}m';
    if (diff.inHours < 24)  return 'Hace ${diff.inHours}h';
    if (diff.inDays < 7)    return 'Hace ${diff.inDays}d';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  // ── GRÁFICO SEMANAL ───────────────────────────────────────

  Widget _buildWeeklyChart(DashboardProvider dash) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
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
                  'Contactos esta semana',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Row(
                  children: [
                    _LegendDot(color: AppColors.whatsapp, label: 'WA'),
                    const SizedBox(width: 10),
                    _LegendDot(color: AppColors.primary, label: 'Tel'),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (dash.isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: CircularProgressIndicator(
                    color: AppColors.amber,
                    strokeWidth: 2,
                  ),
                ),
              )
            else
              SizedBox(
                height: 100,
                child: _WeeklyBarChart(entries: _lastSevenDays(dash)),
              ),
          ],
        ),
      ),
    );
  }

  List<DailyClickEntry> _lastSevenDays(DashboardProvider dash) {
    final entries = dash.analytics?.dailyClicks ?? [];
    final now = DateTime.now();
    return List.generate(7, (i) {
      final d = now.subtract(Duration(days: 6 - i));
      final key = d.toIso8601String().split('T')[0];
      return entries.firstWhere(
        (e) => e.date == key,
        orElse: () => DailyClickEntry(date: key, whatsapp: 0, calls: 0),
      );
    });
  }

  // ── RESEÑAS RECIENTES ─────────────────────────────────────

  Widget _buildReviewsSection(DashboardProvider dash) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Últimas reseñas',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (dash.reviews.isNotEmpty)
                TextButton(
                  onPressed: () => widget.onChangeTab(3),
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'Ver todas →',
                    style: TextStyle(color: AppColors.amber, fontSize: 13),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (dash.isLoading)
            _ReviewSkeleton()
          else if (dash.reviews.isEmpty)
            _EmptyReviews()
          else
            ...dash.reviews.take(3).map((r) => _ReviewCard(review: r)),
        ],
      ),
    );
  }
}

// ─── WIDGETS LOCALES ──────────────────────────────────────────

class _StatusBadge extends StatelessWidget {
  final bool isPaused;
  const _StatusBadge({required this.isPaused});

  @override
  Widget build(BuildContext context) {
    final color = isPaused ? AppColors.delayed : AppColors.available;
    final label = isPaused ? 'Pausado' : 'Activo';
    final icon  = isPaused ? Icons.pause_circle_rounded : Icons.circle;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.6)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: isPaused ? 14 : 8, color: color),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _SubscriptionBanner extends StatelessWidget {
  final SubscriptionInfo sub;
  const _SubscriptionBanner({required this.sub});

  @override
  Widget build(BuildContext context) {
    final isFree           = sub.plan == 'GRATIS';
    final isExpired        = sub.isExpired;
    final isExpiringSoon   = sub.isExpiringSoon;

    final Color color;
    final IconData icon;
    final String text;

    if (isFree) {
      color = const Color(0xFF22C55E);
      icon  = Icons.storefront_rounded;
      text  = 'Estás en el plan Gratis — ¡Sube de plan para más visibilidad!';
    } else if (isExpired) {
      color = AppColors.busy;
      icon  = Icons.warning_rounded;
      text  = 'Tu plan ${sub.planLabel} venció. Pasaste al plan Gratis. Renueva para recuperar tus beneficios.';
    } else if (isExpiringSoon) {
      color = AppColors.amber;
      icon  = Icons.access_time_rounded;
      final days = sub.daysUntilExpiration ?? 0;
      text  = days <= 0
          ? 'Tu plan ${sub.planLabel} vence hoy. Renuévalo para evitar interrupciones.'
          : 'Tu plan ${sub.planLabel} vence en $days día${days == 1 ? '' : 's'}. Renuévalo a tiempo.';
    } else {
      color = AppColors.amber;
      icon  = Icons.workspace_premium_rounded;
      text  = 'Plan ${sub.planLabel} activo';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text, style: TextStyle(color: color, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;
  final String sublabel;
  final bool showStars;
  final double rating;

  const _StatCard({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
    required this.sublabel,
    this.showStars = false,
    this.rating = 0,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              const Spacer(),
              if (showStars)
                Row(
                  children: List.generate(5, (i) {
                    return Icon(
                      i < rating.floor()
                          ? Icons.star_rounded
                          : i < rating
                              ? Icons.star_half_rounded
                              : Icons.star_border_rounded,
                      color: AppColors.star,
                      size: 12,
                    );
                  }),
                ),
            ],
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(color: c.textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
          Text(sublabel, style: TextStyle(color: c.textMuted, fontSize: 10)),
        ],
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(color: c.textMuted, fontSize: 11)),
      ],
    );
  }
}

class _WeeklyBarChart extends StatelessWidget {
  final List<DailyClickEntry> entries;
  const _WeeklyBarChart({required this.entries});

  static const _days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final maxVal = entries.fold<int>(1, (m, e) => math.max(m, e.total));

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: List.generate(entries.length, (i) {
        final e = entries[i];
        final dayIndex = DateTime.parse(e.date).weekday - 1;
        final dayLabel = _days[dayIndex.clamp(0, 6)];
        final waH = maxVal > 0 ? (e.whatsapp / maxVal * 80).clamp(0, 80) as double : 0.0;
        final callH = maxVal > 0 ? (e.calls / maxVal * 80).clamp(0, 80) as double : 0.0;

        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 3),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (e.total > 0)
                  Text(
                    '${e.total}',
                    style: TextStyle(color: c.textMuted, fontSize: 9),
                  ),
                const SizedBox(height: 2),
                Stack(
                  alignment: Alignment.bottomCenter,
                  children: [
                    // Llamadas (base)
                    AnimatedContainer(
                      duration: Duration(milliseconds: 400 + i * 60),
                      curve: Curves.easeOut,
                      height: callH + waH,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    // WhatsApp (encima)
                    AnimatedContainer(
                      duration: Duration(milliseconds: 400 + i * 60),
                      curve: Curves.easeOut,
                      height: waH,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: AppColors.whatsapp,
                        borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(4),
                          bottomRight: Radius.circular(4),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(dayLabel, style: TextStyle(color: c.textMuted, fontSize: 10)),
              ],
            ),
          ),
        );
      }),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  final ReviewModel review;
  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final rating  = review.rating;
    final comment = review.comment;
    final user    = review.user;
    final name    = user?.fullName ?? 'Anónimo';
    final initial = user?.initial ?? '?';
    final date    = review.createdAt;
    final dateStr = '${date.day}/${date.month}/${date.year}';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: c.warmDeep,
                backgroundImage: user?.avatarUrl != null
                    ? NetworkImage(user!.avatarUrl!)
                    : null,
                child: user?.avatarUrl == null
                    ? Text(initial, style: TextStyle(color: AppColors.amber, fontWeight: FontWeight.bold))
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: TextStyle(color: c.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                    Text(dateStr, style: TextStyle(color: c.textMuted, fontSize: 11)),
                  ],
                ),
              ),
              Row(
                children: List.generate(
                  5,
                  (i) => Icon(
                    i < rating ? Icons.star_rounded : Icons.star_border_rounded,
                    color: AppColors.star,
                    size: 14,
                  ),
                ),
              ),
            ],
          ),
          if (comment != null && comment.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              comment,
              style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }
}

class _ReviewSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      children: List.generate(
        2,
        (_) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          height: 80,
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }
}

class _EmptyReviews extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.reviews_rounded, color: c.textMuted, size: 32),
            SizedBox(height: 8),
            Text(
              'Aún no tienes reseñas',
              style: TextStyle(color: c.textMuted, fontSize: 13),
            ),
            SizedBox(height: 4),
            Text(
              'Comparte tu perfil para recibir las primeras',
              style: TextStyle(color: c.textMuted, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Badge "Va a domicilio" ──────────────────────────────────

class _HomeServiceBadge extends StatelessWidget {
  const _HomeServiceBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: AppColors.available.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.available.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.home_repair_service_rounded, color: AppColors.available, size: 14),
          const SizedBox(width: 6),
          Text(
            'Va a domicilio',
            style: TextStyle(
              color: AppColors.available,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
