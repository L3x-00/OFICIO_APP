import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../showcase/showcase_data.dart';
import '../../../../showcase/showcase_overlay.dart';
import '../../../domain/models/dashboard_profile_model.dart';

/// Cabecera del tab Home: saludo + nombre + badge de estado, banner de
/// suscripción y badge "Va a domicilio". Si el proveedor tiene foto de
/// portada se usa como fondo con overlay oscuro 75%; si no, gradiente.
class HomeHeader extends StatelessWidget {
  final String name;
  final bool isNegocio;
  final bool isPaused;
  final DashboardProfileModel? profile;
  final String? coverUrl;

  /// C-10: el step + isLast se reciben construidos desde el padre
  /// (`panel_home_tab` los toma del deck via `buildAdminHomeSteps`).
  /// Antes el wrapper declaraba su propio `ShowcaseStep` literal con
  /// title/description hardcoded — divergía del deck si alguien
  /// editaba showcase_data.dart y `isLast: false` quedaba mal cuando
  /// el deck no tenía el paso del switch role (hasBothProfiles=false).
  final ShowcaseStep? planBadgeStep;
  final bool planBadgeIsLast;

  const HomeHeader({
    super.key,
    required this.name,
    required this.isNegocio,
    required this.isPaused,
    required this.profile,
    required this.coverUrl,
    this.planBadgeStep,
    this.planBadgeIsLast = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Buenos días'
        : hour < 19
        ? 'Buenas tardes'
        : 'Buenas noches';

    final content = Column(
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
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      shadows: [Shadow(blurRadius: 8, color: Colors.black54)],
                    ),
                  ),
                ],
              ),
            ),
            StatusBadge(isPaused: isPaused),
          ],
        ),
        if (profile?.subscription != null) ...[
          const SizedBox(height: 12),
          // Step + isLast vienen del deck construido por el padre.
          // Si el padre no los pasa (caso raro), renderizamos el
          // banner sin spotlight.
          if (planBadgeStep != null)
            ShowcaseTarget(
              step: planBadgeStep!,
              isLast: planBadgeIsLast,
              child: SubscriptionBanner(sub: profile!.subscription!),
            )
          else
            SubscriptionBanner(sub: profile!.subscription!),
        ],
        if (!isNegocio && (profile?.hasHomeService ?? false)) ...[
          const SizedBox(height: 10),
          HomeServiceBadge(),
        ],
      ],
    );

    if (coverUrl != null) {
      return SizedBox(
        child: Stack(
          children: [
            // Cover image
            Positioned.fill(
              child: Image.network(
                coverUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(color: c.bgCard),
              ),
            ),
            // 75% dark gradient overlay
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.55),
                      Colors.black.withValues(alpha: 0.75),
                    ],
                  ),
                ),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 52, 20, 24),
              child: content,
            ),
          ],
        ),
      );
    }

    // Fallback: gradient only (no cover image)
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 52, 20, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isNegocio
              ? [AppColors.primaryDark, c.bgCard]
              : [AppColors.amberDeep, c.bgCard],
        ),
      ),
      child: content,
    );
  }
}

/// Badge "Activo" / "Pausado" en la esquina del header.
class StatusBadge extends StatelessWidget {
  final bool isPaused;
  const StatusBadge({super.key, required this.isPaused});

  @override
  Widget build(BuildContext context) {
    final color = isPaused ? AppColors.delayed : AppColors.available;
    final label = isPaused ? 'Pausado' : 'Activo';
    final icon = isPaused ? Icons.pause_circle_rounded : Icons.circle;

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
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Banner del estado de suscripción: gratis, activo, por vencer o vencido.
class SubscriptionBanner extends StatelessWidget {
  final SubscriptionInfo sub;
  const SubscriptionBanner({super.key, required this.sub});

  @override
  Widget build(BuildContext context) {
    final isFree = sub.plan == 'GRATIS';
    final isExpired = sub.isExpired;
    final isExpiringSoon = sub.isExpiringSoon;

    final Color color;
    final IconData icon;
    final String text;

    if (isFree) {
      color = AppColors.available;
      icon = Icons.storefront_rounded;
      text = 'Estás en el plan Gratis — ¡Sube de plan para más visibilidad!';
    } else if (isExpired) {
      color = AppColors.busy;
      icon = Icons.warning_rounded;
      text =
          'Tu plan ${sub.planLabel} venció. Pasaste al plan Gratis. Renueva para recuperar tus beneficios.';
    } else if (isExpiringSoon) {
      color = AppColors.amber;
      icon = Icons.access_time_rounded;
      final days = sub.daysUntilExpiration ?? 0;
      text = days <= 0
          ? 'Tu plan ${sub.planLabel} vence hoy. Renuévalo para evitar interrupciones.'
          : 'Tu plan ${sub.planLabel} vence en $days día${days == 1 ? '' : 's'}. Renuévalo a tiempo.';
    } else {
      color = AppColors.amber;
      icon = Icons.workspace_premium_rounded;
      text = 'Plan ${sub.planLabel} activo';
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

/// Badge "Va a domicilio" — solo OFICIO con servicio a domicilio activo.
class HomeServiceBadge extends StatelessWidget {
  const HomeServiceBadge({super.key});

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
          Icon(
            Icons.home_repair_service_rounded,
            color: AppColors.available,
            size: 14,
          ),
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
