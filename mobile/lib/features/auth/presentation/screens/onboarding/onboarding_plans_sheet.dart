import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/utils/plan_limits.dart';

class OnboardingPlansSheet extends StatelessWidget {
  final String providerType;
  final VoidCallback onContinue;

  const OnboardingPlansSheet({
    super.key,
    required this.providerType,
    required this.onContinue,
  });

  bool get _isNegocio => providerType == 'NEGOCIO';

  @override
  Widget build(BuildContext context) {
    final c      = context.colors;
    final accent = _isNegocio ? AppColors.amber : AppColors.primary;
    final label  = _isNegocio ? 'negocio' : 'perfil profesional';

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      minChildSize:     0.6,
      maxChildSize:     0.95,
      builder: (_, scrollController) => Container(
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 4),
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: c.textMuted.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 16, 4),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _isNegocio ? Icons.storefront_rounded : Icons.handyman_rounded,
                      color: accent, size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Elige tu plan',
                          style: TextStyle(color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Empieza gratis — puedes subir después',
                          style: TextStyle(color: c.textSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: c.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: c.border),
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Column(
                  children: [
                    OnboardingPlanCard(
                      planId:    'GRATIS',
                      title:     'Gratis',
                      price:     'S/ 0',
                      priceNote: 'Para siempre',
                      color:     const Color(0xFF6B7280),
                      icon:      Icons.storefront_rounded,
                      isNegocio: _isNegocio,
                      isCurrent: true,
                      features: [
                        _feat(Icons.photo_library_rounded, '${PlanLimits.photos('GRATIS')} fotos de perfil'),
                        _feat(
                          _isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                          PlanLimits.itemsLabel('GRATIS', isNegocio: _isNegocio),
                        ),
                        _feat(Icons.bar_chart_rounded, 'Sin gestión de visitas', locked: true),
                        _feat(Icons.verified_rounded, 'Sin badge verificado', locked: true),
                      ],
                    ),
                    const SizedBox(height: 12),
                    OnboardingPlanCard(
                      planId:    'ESTANDAR',
                      title:     'Estándar',
                      price:     'S/ 19.90',
                      priceNote: 'por mes',
                      color:     AppColors.standard,
                      icon:      Icons.verified_rounded,
                      isNegocio: _isNegocio,
                      isPopular: true,
                      features: [
                        _feat(Icons.photo_library_rounded, '${PlanLimits.photos('ESTANDAR')} fotos de perfil'),
                        _feat(
                          _isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                          PlanLimits.itemsLabel('ESTANDAR', isNegocio: _isNegocio),
                        ),
                        if (_isNegocio) _feat(Icons.image_rounded, 'Foto por producto incluida'),
                        _feat(Icons.bar_chart_rounded, 'Gestión de visitas y estadísticas'),
                        _feat(Icons.verified_rounded, 'Badge verificado azul'),
                        _feat(Icons.search_rounded, 'Mayor visibilidad en búsqueda'),
                      ],
                    ),
                    const SizedBox(height: 12),
                    OnboardingPlanCard(
                      planId:    'PREMIUM',
                      title:     'Premium',
                      price:     'S/ 39.90',
                      priceNote: 'por mes',
                      color:     AppColors.premium,
                      icon:      Icons.workspace_premium_rounded,
                      isNegocio: _isNegocio,
                      features: [
                        _feat(Icons.photo_library_rounded, '${PlanLimits.photos('PREMIUM')} fotos de perfil'),
                        _feat(
                          _isNegocio ? Icons.inventory_2_rounded : Icons.design_services_rounded,
                          PlanLimits.itemsLabel('PREMIUM', isNegocio: _isNegocio),
                        ),
                        if (_isNegocio) _feat(Icons.image_rounded, 'Fotos ilimitadas por producto'),
                        _feat(Icons.bar_chart_rounded, 'Estadísticas avanzadas'),
                        _feat(Icons.workspace_premium_rounded, 'Badge dorado Premium'),
                        _feat(Icons.star_rounded, 'Posición #1 en búsqueda garantizada'),
                        _feat(Icons.support_agent_rounded, 'Soporte prioritario 24/7'),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: 0.07),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: accent.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info_outline_rounded, color: accent, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Comenzarás con el plan Gratis. Puedes subir de plan en cualquier momento desde tu panel → Ajustes → Subir de rango.',
                              style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.45),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: onContinue,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accent,
                    foregroundColor: _isNegocio ? const Color(0xFF3D2B00) : Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: Text(
                    'Continuar con mi $label',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static PlanFeatureItem _feat(IconData icon, String text, {bool locked = false}) =>
      PlanFeatureItem(icon: icon, text: text, locked: locked);
}

class PlanFeatureItem {
  final IconData icon;
  final String text;
  final bool locked;
  const PlanFeatureItem({required this.icon, required this.text, this.locked = false});
}

class OnboardingPlanCard extends StatelessWidget {
  final String planId;
  final String title;
  final String price;
  final String priceNote;
  final Color color;
  final IconData icon;
  final bool isNegocio;
  final bool isCurrent;
  final bool isPopular;
  final List<PlanFeatureItem> features;

  const OnboardingPlanCard({
    super.key,
    required this.planId,
    required this.title,
    required this.price,
    required this.priceNote,
    required this.color,
    required this.icon,
    required this.isNegocio,
    required this.features,
    this.isCurrent = false,
    this.isPopular = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isCurrent
            ? color.withValues(alpha: c.isDark ? 0.1 : 0.05)
            : c.bg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isCurrent ? color.withValues(alpha: 0.5) : c.border,
          width: isCurrent ? 1.8 : 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(title, style: TextStyle(color: color, fontSize: 15, fontWeight: FontWeight.bold)),
                        if (isCurrent) ...[
                          const SizedBox(width: 6),
                          PlanBadge(label: 'Incluido gratis', color: color),
                        ],
                        if (isPopular && !isCurrent) ...[
                          const SizedBox(width: 6),
                          PlanBadge(label: '⭐ Popular', color: AppColors.standard),
                        ],
                      ],
                    ),
                    Text(
                      '$price $priceNote',
                      style: TextStyle(color: c.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...features.map((f) => Padding(
            padding: const EdgeInsets.only(bottom: 7),
            child: Row(
              children: [
                Icon(
                  f.locked ? Icons.lock_outline_rounded : f.icon,
                  color: f.locked ? c.textMuted : color,
                  size: 15,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    f.text,
                    style: TextStyle(
                      color: f.locked ? c.textMuted : c.textSecondary,
                      fontSize: 13,
                      decoration: f.locked ? TextDecoration.lineThrough : null,
                      decorationColor: c.textMuted,
                    ),
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }
}

class PlanBadge extends StatelessWidget {
  final String label;
  final Color color;
  const PlanBadge({super.key, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}
