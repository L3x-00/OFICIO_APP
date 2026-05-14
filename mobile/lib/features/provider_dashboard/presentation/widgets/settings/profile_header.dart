import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../../auth/presentation/providers/auth_provider.dart';
import '../../../domain/models/dashboard_profile_model.dart';

/// Cabecera del tab de configuración: avatar circular + nombre + badges
/// de tipo (Profesional/Negocio) y plan (Gratis/Estándar/Premium).
///
/// Fallback de avatar:
///   1. Primera foto del proveedor (`profile.images.first.url`).
///   2. `auth.user.avatarUrl`.
///   3. Inicial del nombre sobre fondo amber.
class SettingsProfileHeader extends StatelessWidget {
  final AuthProvider auth;
  final DashboardProfileModel? profile;

  const SettingsProfileHeader({
    super.key,
    required this.auth,
    required this.profile,
  });

  @override
  Widget build(BuildContext context) {
    final c       = context.colors;
    final name    = profile?.businessName ?? auth.user?.fullName ?? 'Mi negocio';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final type    = profile?.type == 'NEGOCIO' ? 'Negocio' : 'Profesional';
    final plan    = profile?.subscription?.planLabel ?? 'Gratis';
    // Use first provider photo, then user avatar, then initial fallback
    final avatarUrl = profile?.images.isNotEmpty == true
        ? profile!.images.first.url
        : auth.user?.avatarUrl;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: c.warmDeep,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.amber, width: 2),
            ),
            child: ClipOval(
              child: avatarUrl != null && avatarUrl.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: avatarUrl,
                      fit: BoxFit.cover,
                      width: 60,
                      height: 60,
                      errorWidget: (_, __, err) => Center(
                        child: Text(
                          initial,
                          style: TextStyle(
                            color: AppColors.amber,
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    )
                  : Center(
                      child: Text(
                        initial,
                        style: TextStyle(
                          color: AppColors.amber,
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.amber.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        type,
                        style: TextStyle(color: AppColors.amber, fontSize: 11),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'Plan $plan',
                        style: TextStyle(color: AppColors.primary, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
