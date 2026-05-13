import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/models/provider_model.dart';

/// ─── Header (nombre, categoría, badges Verificado/Confiable/Domicilio) ───

class ProviderHeader extends StatelessWidget {
  final ProviderModel provider;
  final Color accent;

  const ProviderHeader({super.key, required this.provider, required this.accent});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                provider.businessName,
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                provider.categoryName,
                style: TextStyle(
                  color: accent,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        if (provider.isVerified &&
            (provider.subscriptionPlan == 'PREMIUM' ||
             provider.subscriptionPlan == 'ESTANDAR' ||
             provider.subscriptionPlan == 'GRATIS'))
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.verified.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.verified.withValues(alpha: 0.4)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.verified_rounded, color: AppColors.verified, size: 14),
                SizedBox(width: 4),
                Text(
                  'Verificado',
                  style: TextStyle(color: AppColors.verified, fontSize: 11),
                ),
              ],
            ),
          ),
        if (provider.isTrusted)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.13),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.shield_rounded, color: Color(0xFF10B981), size: 14),
                SizedBox(width: 4),
                Text('Confiable', style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        if (provider.type == ProviderType.oficio && provider.hasHomeService)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.available.withValues(alpha: 0.13),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.available.withValues(alpha: 0.4)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.home_repair_service_rounded, color: AppColors.available, size: 14),
                SizedBox(width: 4),
                Text(
                  'Va a domicilio',
                  style: TextStyle(color: AppColors.available, fontSize: 11),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// ─── Rating + recomendaciones ───────────────────────────────

class ProviderRating extends StatelessWidget {
  final ProviderModel provider;
  const ProviderRating({super.key, required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = provider;
    return Wrap(
      spacing: 12,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            RatingBarIndicator(
              rating: p.averageRating,
              itemBuilder: (_, _) =>
                  const Icon(Icons.star_rounded, color: AppColors.star),
              itemCount: 5,
              itemSize: 20,
            ),
            const SizedBox(width: 8),
            Text(
              '${p.averageRating.toStringAsFixed(1)} · ${p.totalReviews} reseñas',
              style: TextStyle(color: c.textSecondary, fontSize: 13),
            ),
          ],
        ),
        if (p.totalRecommendations > 0)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.thumb_up_rounded, size: 14, color: c.textMuted),
              const SizedBox(width: 5),
              Text(
                'Recomendado por ${p.totalRecommendations} ${p.totalRecommendations == 1 ? 'persona' : 'personas'}',
                style: TextStyle(color: c.textMuted, fontSize: 12),
              ),
            ],
          ),
      ],
    );
  }
}

/// ─── Badge de disponibilidad ────────────────────────────────

class ProviderAvailabilityBadge extends StatelessWidget {
  final AvailabilityStatus availability;
  const ProviderAvailabilityBadge({super.key, required this.availability});

  @override
  Widget build(BuildContext context) {
    final Color color = switch (availability) {
      AvailabilityStatus.disponible => AppColors.available,
      AvailabilityStatus.ocupado    => AppColors.busy,
      AvailabilityStatus.conDemora  => AppColors.delayed,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            availability.label,
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// ─── Información de contacto / identidad ─────────────────

class ProviderContactInfo extends StatelessWidget {
  final ProviderModel provider;
  final Color accent;
  final VoidCallback onCall;

  const ProviderContactInfo({
    super.key,
    required this.provider,
    required this.accent,
    required this.onCall,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = provider;
    final isOficio = p.type == ProviderType.oficio;

    final rows = <Widget>[];

    // Para OFICIO: nombre real del profesional con avatar
    if (isOficio && p.ownerName != null) {
      rows.add(InfoChip(
        leading: _OwnerAvatar(provider: p, accent: accent),
        icon: null,
        label: p.ownerName!,
        sublabel: 'Profesional independiente',
      ));
    }

    // Teléfono de contacto
    rows.add(InfoChip(
      icon: Icons.phone_outlined,
      label: p.phone,
      sublabel: 'Teléfono',
      onTap: onCall,
    ));

    // Dirección (negocios o quienes la tengan)
    if (p.address != null && p.address!.isNotEmpty) {
      rows.add(InfoChip(
        icon: Icons.location_on_outlined,
        label: p.address!,
        sublabel: 'Dirección',
      ));
    }

    if (rows.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        children: rows
            .expand((w) => [w, const Divider(height: 1, thickness: 0.5)])
            .toList()
          ..removeLast(),
      ),
    );
  }
}

class _OwnerAvatar extends StatelessWidget {
  final ProviderModel provider;
  final Color accent;
  const _OwnerAvatar({required this.provider, required this.accent});

  @override
  Widget build(BuildContext context) {
    if (provider.ownerAvatarUrl != null) {
      return ClipOval(
        child: Image.network(
          provider.ownerAvatarUrl!,
          width: 36,
          height: 36,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _placeholder(),
        ),
      );
    }
    return _placeholder();
  }

  Widget _placeholder() {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: accent,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          (provider.ownerName ?? provider.businessName).isNotEmpty
              ? (provider.ownerName ?? provider.businessName)[0].toUpperCase()
              : '?',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ),
    );
  }
}

/// ─── Fila clickable de información ─────────────────────────

class InfoChip extends StatelessWidget {
  final Widget? leading;
  final IconData? icon;
  final String label;
  final String sublabel;
  final VoidCallback? onTap;

  const InfoChip({
    super.key,
    this.leading,
    this.icon,
    required this.label,
    required this.sublabel,
    this.onTap,
  }) : assert(leading != null || icon != null);

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final content = Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          if (leading != null)
            leading!
          else
            Icon(icon, color: AppColors.primary, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sublabel,
                  style: TextStyle(color: c.textMuted, fontSize: 11),
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          if (onTap != null)
            Icon(Icons.arrow_forward_ios_rounded, color: c.textMuted, size: 14),
        ],
      ),
    );

    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: content);
    }
    return content;
  }
}

/// ─── Sección de ubicación (dirección + mapa OSM) ──────────

class ProviderLocationSection extends StatelessWidget {
  final ProviderModel provider;
  final Color accent;

  const ProviderLocationSection({
    super.key,
    required this.provider,
    required this.accent,
  });

  Future<void> _openMaps() async {
    final p = provider;
    Uri uri;
    if (p.latitude != null && p.longitude != null) {
      uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}');
    } else if (p.address != null) {
      final q = Uri.encodeComponent(p.address!);
      uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$q');
    } else {
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (provider.address != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.location_on_rounded, color: accent, size: 16),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    provider.address!,
                    style: TextStyle(
                      color: c.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _openMaps,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.directions_rounded, color: accent, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          'Cómo llegar',
                          style: TextStyle(
                            color: accent,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        if (provider.latitude != null && provider.longitude != null)
          _buildMap(),
      ],
    );
  }

  Widget _buildMap() {
    final lat = provider.latitude!;
    final lng = provider.longitude!;
    final position = LatLng(lat, lng);

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 200,
        child: FlutterMap(
          options: MapOptions(initialCenter: position, initialZoom: 15),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.oficioapp.mobile',
            ),
            MarkerLayer(
              markers: [
                Marker(
                  point: position,
                  width: 48,
                  height: 48,
                  child: Container(
                    decoration: BoxDecoration(
                      color: accent,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: accent.withValues(alpha: 0.4),
                          blurRadius: 12,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: Icon(
                      provider.type == ProviderType.negocio
                          ? Icons.storefront_rounded
                          : Icons.handyman_rounded,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// ─── Helper: título de sección reusable ───────────────────

class SectionTitle extends StatelessWidget {
  final String title;
  const SectionTitle(this.title, {super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Text(
      title,
      style: TextStyle(
        color: c.textPrimary,
        fontSize: 16,
        fontWeight: FontWeight.bold,
      ),
    );
  }
}
