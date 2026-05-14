import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../../../core/constans/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../domain/models/dashboard_profile_model.dart';

/// Tarjeta "Contactos esta semana" — gráfico de barras apiladas
/// (WhatsApp + llamadas) de los últimos 7 días.
class HomeWeeklyChart extends StatelessWidget {
  final bool isLoading;
  final DashboardAnalytics? analytics;

  const HomeWeeklyChart({
    super.key,
    required this.isLoading,
    required this.analytics,
  });

  /// Normaliza los clics diarios a una lista fija de 7 entradas (lun→dom
  /// relativo a hoy), rellenando con ceros los días sin datos.
  List<DailyClickEntry> _lastSevenDays() {
    final entries = analytics?.dailyClicks ?? [];
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

  @override
  Widget build(BuildContext context) {
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
                    LegendDot(color: AppColors.whatsapp, label: 'WA'),
                    const SizedBox(width: 10),
                    LegendDot(color: AppColors.primary, label: 'Tel'),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (isLoading)
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
                child: WeeklyBarChart(entries: _lastSevenDays()),
              ),
          ],
        ),
      ),
    );
  }
}

/// Gráfico de barras apiladas de 7 días. Llamadas como base, WhatsApp
/// encima. Las barras animan al montarse con stagger por índice.
class WeeklyBarChart extends StatelessWidget {
  final List<DailyClickEntry> entries;
  const WeeklyBarChart({super.key, required this.entries});

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

/// Punto de leyenda (color + etiqueta) para el gráfico semanal.
class LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const LegendDot({super.key, required this.color, required this.label});

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
